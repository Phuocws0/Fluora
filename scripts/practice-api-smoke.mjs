import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
const base = process.env.FLUORA_API_URL ?? "http://localhost:4000";
let checks = 0;
async function request(method, path, body, token, expected = null) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (expected === null) assert.ok(response.ok, `${method} ${path}: unexpected ${response.status}`);
  else assert.equal(response.status, expected, `${method} ${path}`);
  checks++;
  return response.json();
}
async function client(token) {
  const code = ts.transpileModule(await readFile(new URL("../mobile/features/practice/practice.service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({});
  const module = new vm.SourceTextModule(code, { context });
  const api = Object.fromEntries([["getJson", "GET"], ["postJson", "POST"], ["patchJson", "PATCH"], ["putJson", "PUT"], ["deleteJson", "DELETE"]].map(([name, method]) => [name, (path, body) => request(method, path, body, token)]));
  await module.link(() => new vm.SyntheticModule(Object.keys(api), function () { for (const [key, value] of Object.entries(api)) this.setExport(key, value); }, { context }));
  await module.evaluate(); return module.namespace.practiceApi;
}
const users = [];
try {
  for (let i = 0; i < 2; i++) {
    const email = `practice-smoke-${randomUUID()}@example.invalid`;
    const auth = await request("POST", "/auth/register", { email, password: randomUUID(), displayName: "Practice smoke" });
    assert.equal(typeof auth.token, "string"); users.push({ email, token: auth.token });
  }
  const [a, b] = await Promise.all(users.map(u => client(u.token)));
  const deck = (await a.createDeck("Smoke deck")).set;
  await request("GET", `/vocabulary/sets/${deck.id}`, undefined, users[1].token, 404);
  assert.equal((await a.renameDeck(deck.id, "Renamed deck")).set.name, "Renamed deck");
  const card = (await a.createCard(deck.id, { front: "hello", back: "a greeting", tag: "greetings", example: "Hello, Mia." })).card;
  assert.equal((await a.updateCard(card.id, { front: "morning", back: "early part of the day", tag: null, example: null })).card.tag, null);
  await request("POST", `/vocabulary/sets/${deck.id}/cards`, { front: "", back: "invalid" }, users[0].token, 400);
  const rows = [{ term: "name", meaning: "a word identifying someone" }, { term: "", meaning: "invalid" }, { term: "hello", meaning: "a greeting" }];
  const preview = await a.preview("sample.csv", rows, { front: "term", back: "meaning" });
  assert.equal(preview.validRows.length, 2); assert.equal(preview.errors[0].row, 2);
  // Approve only the first valid row. The invalid row and unapproved valid row stay out.
  assert.equal((await a.import(deck.id, [preview.validRows[0]], { front: "front", back: "back" })).importedCount, 1);
  assert.equal((await a.deck(deck.id)).cards.length, 2);
  await request("POST", "/vocabulary/import", { destinationSetId: deck.id, rows, mapping: { front: "term", back: "meaning" } }, users[0].token, 400);
  await request("POST", "/vocabulary/import", { destinationSetId: deck.id, rows: [preview.validRows[0]], mapping: { front: "front", back: "back" } }, users[1].token, 404);
  await a.deleteCard(card.id);
  const review = (await a.createReview("hello", "a greeting")).item;
  const rated = await a.answerReview(review.id, true);
  assert.ok(new Date(rated.nextReviewAt).getTime() > Date.now() + 23 * 60 * 60 * 1000);
  assert.ok(!(await a.reviews()).some(item => item.id === review.id));
  assert.ok((await a.reviews(undefined, true)).some(item => item.id === review.id));
  await request("GET", "/practice/review-items?includeScheduled=invalid", undefined, users[0].token, 400);
  assert.equal((await a.updateReview(review.id, "edited", "answer")).item.front, "edited");
  await request("PATCH", `/practice/review-items/${review.id}`, { front: "not yours" }, users[1].token, 404);
  await a.deleteReview(review.id);
  const stories = await a.stories(); assert.ok(stories.some(s => s.kind === "article")); assert.ok(stories.some(s => s.kind === "dialogue"));
  const story = await a.story(stories[0].id); assert.ok(Array.isArray(story.content.paragraphs));
  assert.equal(await a.reading(story.id), null);
  await a.saveReading(story.id, 1, false); assert.equal((await a.reading(story.id)).position, 1);
  await a.saveReading(story.id, 2, true); assert.equal((await a.reading(story.id)).completed, true);
  await a.resetReading(story.id); assert.equal(await a.reading(story.id), null);
  const mark = (await a.bookmark("story", story.id)).bookmark;
  assert.equal((await a.editBookmark(mark.id, "read again", "story")).bookmark.note, "read again");
  assert.equal((await b.bookmarks()).length, 0);
  await request("DELETE", `/bookmarks/${mark.id}`, undefined, users[1].token, 404);
  await a.removeBookmark(mark.id);
  assert.equal((await a.dictionary("hello")).word, "hello");
  await request("GET", "/dictionary?query=unknown-word", undefined, users[0].token, 404);
  const wordMark = (await a.bookmark("word", "hello")).bookmark; await a.removeBookmark(wordMark.id);
  const tools = await a.tools(); assert.equal(tools.length, 8); assert.equal((await a.tool("writing")).kind, "writing");
  const challengeStory = stories.find(s => s.slug === "first-conversation"); assert.ok(challengeStory);
  const challenge = (await a.story(challengeStory.id)).content.challenge;
  let wrong;
  for (const option of challenge.options) {
    const result = await request("POST", `/exercises/${challenge.exerciseId}/answers`, { answer: { kind: "choice", optionId: option.id } }, users[0].token);
    if (!result.isCorrect) { wrong = option; break; }
  }
  assert.ok(wrong);
  await request("POST", `/exercises/${challenge.exerciseId}/answers`, { answer: { kind: "choice", optionId: wrong.id } }, users[0].token);
  assert.ok((await a.reviews("mistake")).some(item => item.id === challenge.exerciseId));
  const historyBefore = await request("GET", `/lessons/${challenge.lessonId}/answers`, undefined, users[0].token);
  await request("PATCH", `/practice/review-items/${challenge.exerciseId}`, { front: "cannot edit history" }, users[0].token, 404);
  await a.deleteReview(challenge.exerciseId); assert.ok(!(await a.reviews("mistake")).some(item => item.id === challenge.exerciseId));
  await request("PATCH", `/practice/review-items/${challenge.exerciseId}`, { dismissed: false }, users[0].token);
  const historyAfter = await request("GET", `/lessons/${challenge.lessonId}/answers`, undefined, users[0].token);
  assert.equal(historyBefore.answers.length, historyAfter.answers.length);
  await a.deleteDeck(deck.id); assert.equal((await a.decks()).length, 0);
  assert.equal(typeof (await a.summary()).reviewDueCount, "number");
  console.log(`Practice FE service + PostgreSQL smoke: ${checks} HTTP checks passed.`);
} finally {
  for (const user of users) await request("DELETE", "/users/me", { confirmEmail: user.email }, user.token);
  console.log("Disposable smoke accounts removed.");
}
