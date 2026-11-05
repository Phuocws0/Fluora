import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createTutorPreview } from "../mobile/features/tutor/tutor.preview.ts";

async function reply(api, chatId, choiceId) {
  const { chat } = await api.chat(chatId);
  const turn = chat.nextTurn;
  const choice = turn.choices.find((c) => c.id === choiceId);
  return api.send(chatId, choice.label, {
    turnId: turn.id,
    branchId: turn.branchId,
    choiceId,
  });
}

test("role-play keeps tea branch across reopen and edits; rejects stale/completed turns", async () => {
  const api = createTutorPreview();
  const { chat } = await api.createChat("cafe");
  const first = await reply(api, chat.id, "tea");
  assert.equal(first.nextTurn.branchId, "tea");
  assert.equal((await api.chat(chat.id)).chat.nextTurn.id, "size");
  await assert.rejects(
    api.send(chat.id, "stale", { turnId: "order", branchId: "start" }),
    /turn changed/,
  );
  const second = await reply(api, chat.id, "large");
  assert.equal(second.nextTurn.completed, true);
  await assert.rejects(api.send(chat.id, "again"), /complete/);
  const edit = await api.editMessage(
    chat.id,
    second.userMessage.id,
    "A small one, please.",
  );
  assert.equal(edit.nextTurn.branchId, "tea");
  assert.equal((await api.chat(chat.id)).messages.length, 4);
  await api.deleteMessage(chat.id, edit.userMessage.id);
  const reopened = await api.chat(chat.id);
  assert.equal(reopened.messages.length, 2);
  assert.equal(reopened.chat.nextTurn.branchId, "tea");
  assert.equal(reopened.chat.nextTurn.id, "size");
});

test("editing an earlier turn removes linked/later responses and regenerates the branch", async () => {
  const api = createTutorPreview();
  const { chat } = await api.createChat("cafe");
  const first = await reply(api, chat.id, "tea");
  await reply(api, chat.id, "large");
  await api.editMessage(
    chat.id,
    first.userMessage.id,
    "I'd like a coffee, please.",
  );
  const result = await api.chat(chat.id);
  assert.equal(result.messages.length, 2);
  assert.equal(result.chat.nextTurn.branchId, "coffee");
  assert.equal(result.chat.nextTurn.id, "size");
  assert.ok(!result.messages.some((m) => m.id === first.tutorMessage.id));
  await assert.rejects(
    api.deleteMessage(chat.id, result.messages[1].id),
    /Only your messages/,
  );
});

test("privacy applies to new chats; saved notes survive history clear; instances are isolated", async () => {
  const api = createTutorPreview();
  const { chat } = await api.createChat();
  await api.rename(chat.id, "My practice");
  await api.setPrivacy(false);
  const transient = await api.createChat();
  assert.equal(transient.chat.saveHistory, false);
  assert.deepEqual(
    (await api.chats()).chats.map((c) => c.id),
    [chat.id],
  );
  await api.saveNote({
    chatId: chat.id,
    phrase: "Could I…?",
    pattern: "Polite request",
    personalExample: "",
  });
  const note = (await api.notes()).notes[0];
  await api.editNote(note.id, {
    phrase: note.phrase,
    pattern: note.pattern,
    personalExample: "Could I have a tea?",
  });
  assert.equal(
    (await api.notes()).notes[0].personalExample,
    "Could I have a tea?",
  );
  await api.clearHistory();
  assert.deepEqual((await api.chats()).chats, []);
  await assert.rejects(api.chat(chat.id), /no longer exists/);
  assert.equal((await api.notes()).notes.length, 1);
  await api.deleteNote(note.id);
  assert.equal((await api.notes()).notes.length, 0);
  assert.deepEqual((await createTutorPreview().notes()).notes, []);
  assert.equal(await createTutorPreview().privacy(), true);
});

test("returned snapshots cannot mutate stored chats; delete removes only the requested chat", async () => {
  const api = createTutorPreview();
  const a = await api.createChat();
  const b = await api.createChat();
  const copy = await api.chat(a.chat.id);
  copy.chat.title = "tampered";
  assert.notEqual((await api.chat(a.chat.id)).chat.title, "tampered");
  await api.deleteChat(a.chat.id);
  assert.deepEqual(
    (await api.chats()).chats.map((c) => c.id),
    [b.chat.id],
  );
});

// Exercise the real transport with platform/session dependencies stubbed, without a native runtime.
async function transport(fetchImpl) {
  const source = await readFile(
    new URL("../mobile/services/api.ts", import.meta.url),
    "utf8",
  );
  const context = vm.createContext({
    Headers,
    Response,
    Request,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: fetchImpl,
    process: { env: {} },
  });
  const module = new vm.SourceTextModule(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
    { context },
  );
  await module.link(
    (specifier) => {
      const exports =
        specifier === "react-native"
          ? ["Platform"]
          : specifier === "../features/i18n/translations"
            ? ["translateApiError"]
            : ["getAccessToken"];
      return new vm.SyntheticModule(
        exports,
        function () {
          if (specifier === "react-native")
            this.setExport("Platform", { OS: "android" });
          else if (specifier === "../features/i18n/translations")
            this.setExport("translateApiError", (message) => message);
          else
            this.setExport("getAccessToken", async () => "test-session-token");
        },
        { context },
      );
    },
  );
  await module.evaluate();
  return module.namespace;
}

test("real API transport uses Android host, bearer auth, PATCH and DELETE JSON responses", async () => {
  const calls = [];
  const api = await transport(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ deleted: true });
  });
  await api.patchJson("/study-groups/id", { name: "Study" });
  await api.deleteJson("/tutor/chats/id");
  assert.equal(calls[0].url, "http://10.0.2.2:4000/api/study-groups/id");
  assert.equal(
    calls[0].options.headers.get("Authorization"),
    "Bearer test-session-token",
  );
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[0].options.body, '{"name":"Study"}');
  assert.equal(calls[1].options.method, "DELETE");
  assert.equal(calls[1].options.body, undefined);
});

test("transport preserves conflict/authorization errors and reports an unreachable provider", async () => {
  for (const status of [401, 403, 409, 503]) {
    const api = await transport(async () =>
      Response.json(
        { error: { message: "Service denied this action" } },
        { status },
      ),
    );
    await assert.rejects(
      api.getJson("/tutor/chats"),
      (e) => e.status === status && e.message === "Service denied this action",
    );
  }
  const api = await transport(async () => {
    throw new Error("offline");
  });
  await assert.rejects(api.getJson("/quests"), /Could not reach Fluora/);
});

test("saving an active chat obeys global history privacy", async () => {
  const api = createTutorPreview();
  await api.setPrivacy(false);
  const { chat } = await api.createChat();
  await assert.rejects(
    api.setChatSaving(chat.id, true),
    /Enable future chat history/,
  );
  await api.setPrivacy(true);
  await api.setChatSaving(chat.id, true);
  assert.equal((await api.chats()).chats.length, 1);
  await api.setChatSaving(chat.id, false);
  assert.equal((await api.chats()).chats.length, 0);
  assert.equal((await api.chat(chat.id)).chat.saveHistory, false);
});
