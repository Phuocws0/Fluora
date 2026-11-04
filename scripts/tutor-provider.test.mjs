import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { createOpenAIProvider } from "../backend/dist/features/tutor/provider/openai.provider.js";

const input = { mode: "chat", message: "How do I use although?", history: [], context: null, rolePlay: null };

async function gateway(t, handle, timeoutMs = 1000) {
  const server = createServer(handle);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  return createOpenAIProvider({ baseUrl: `http://127.0.0.1:${server.address().port}/v1/`, apiKey: "test-only-key", model: "test-flash", timeoutMs });
}

test("LLM provider sends bounded ordered history and reads the OpenAI-compatible reply", async (t) => {
  let requestBody;
  const provider = await gateway(t, async (request, response) => {
    assert.equal(request.url, "/v1/chat/completions");
    assert.equal(request.headers.authorization, "Bearer test-only-key");
    let raw = "";
    for await (const chunk of request) raw += chunk;
    requestBody = JSON.parse(raw);
    response.end(JSON.stringify({ choices: [{ message: { content: "Although it rained, we went out." }, finish_reason: "stop" }] }));
  });
  const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "tutor" : "learner", body: `message ${i}` }));
  const reply = await provider.reply({ ...input, history });
  assert.equal(provider.available, true);
  assert.equal(reply.body, "Although it rained, we went out.");
  assert.equal(reply.feedback, null);
  assert.equal(reply.choiceKey, null);
  assert.equal(requestBody.model, "test-flash");
  assert.equal(requestBody.messages.length, 12);
  assert.deepEqual(requestBody.messages[1], { role: "user", content: "message 2" });
  assert.deepEqual(requestBody.messages.at(-1), { role: "user", content: input.message });
  assert.equal(JSON.stringify(requestBody).includes("test-only-key"), false);
});

test("unsubmitted exercise guidance stays curated and makes no upstream call", async (t) => {
  let called = false;
  const provider = await gateway(t, (_request, response) => { called = true; response.end("unexpected"); });
  const reply = await provider.reply({ ...input, context: { kind: "exercise", prompt: "Choose a greeting", instruction: null, firstHint: "Think about the time of day." } });
  assert.equal(called, false);
  assert.match(reply.body, /Think about the time of day/);
});

test("AI role-play feedback preserves the curated grade, branch, and next line", async (t) => {
  const provider = await gateway(t, (_request, response) => response.end(JSON.stringify({ choices: [{ message: { content: "That is a polite greeting." } }] })));
  const next = { key: "next", tutorLine: "What is your name?", hints: ["a", "b", "c"], choices: [] };
  const turn = { key: "start", tutorLine: "Hello!", hints: ["a", "b", "c"], choices: [{ key: "hello", label: "Hello", accept: ["hello"], explanation: "A friendly greeting.", next: "next" }] };
  const reply = await provider.reply({ ...input, mode: "role_play", message: "Hello", rolePlay: { turn, turns: [turn, next], closingLine: "Bye!" } });
  assert.equal(reply.choiceKey, "hello");
  assert.equal(reply.feedback.verdict, "correct");
  assert.match(reply.body, /That is a polite greeting/);
  assert.match(reply.body, /What is your name\?/);
});

test("upstream failures do not expose the gateway error body", async (t) => {
  const provider = await gateway(t, (_request, response) => { response.writeHead(401); response.end("private upstream diagnostic"); });
  await assert.rejects(provider.reply(input), (error) => error.message === "Tutor upstream HTTP 401");
});

test("empty, malformed, truncated, and oversized completions are rejected", async (t) => {
  for (const body of ["not JSON", {}, { choices: [{ message: { content: "" } }] }, { choices: [{ message: { content: "unfinished" }, finish_reason: "length" }] }, { choices: [{ message: { content: "x".repeat(9000) } }] }, "x".repeat(70000)]) {
    const provider = await gateway(t, (_request, response) => response.end(typeof body === "string" ? body : JSON.stringify(body)));
    await assert.rejects(provider.reply(input));
  }
});

test("upstream timeout aborts the request", async (t) => {
  const provider = await gateway(t, () => {}, 30);
  await assert.rejects(provider.reply(input), (error) => error.name === "TimeoutError");
});

test("incomplete or invalid configuration cannot enable the LLM provider", () => {
  for (const baseUrl of [undefined, "", "file:///tmp/foo", "https://user:password@example.com/v1", "https://example.com/v1?key=hidden"]) {
    assert.equal(createOpenAIProvider({ baseUrl, apiKey: "test", model: "test" }).available, false);
  }
  assert.equal(createOpenAIProvider({ baseUrl: "http://localhost:20128/v1", model: "test" }).available, false);
});
