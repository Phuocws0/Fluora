import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// Seeded local-demo integration check. Only the accounts created here are deleted.
const base = (process.env.FLUORA_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const accounts = [];
let checks = 0;
async function api(method, path, body, token, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    method, signal: AbortSignal.timeout(15000),
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, got ${response.status}`);
  const result = await response.json(); checks++;
  if (expected >= 400) assert.equal(typeof result.error?.code, "string", "Errors must use the shared JSON contract");
  return result;
}
function noCredentials(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!/^(passwordHash|tokenHash|googleSubject|answerKey|isCorrect)$/i.test(key), `Unexpected private field ${key}`);
    noCredentials(child);
  }
}
async function restartServices() {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Restart mode is only for a local Compose runtime");
  const result = spawnSync("docker", ["compose", "restart", "db", "backend"], { cwd: new URL("../", import.meta.url), encoding: "utf8", stdio: "ignore" });
  assert.equal(result.status, 0, "Could not restart the local Compose services");
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch { /* Wait for the restarted API/database. */ }
    await delay(1000);
  }
  throw new Error("Local services did not recover after restart");
}

try {
  assert.equal((await api("GET", "/health")).database, "ok");
  await api("GET", "/api/progress", undefined, undefined, 401);
  await api("GET", "/api/not-a-real-route", undefined, undefined, 404);
  await api("POST", "/api/auth/register", { email: "invalid" }, undefined, 400);
  for (let i = 0; i < 2; i++) {
    const email = `demo-qa-${randomUUID()}@example.invalid`, password = randomUUID();
    const registration = await api("POST", "/api/auth/register", { email, password, displayName: "Demo QA" }, undefined, 201);
    accounts.push({ email, password, token: registration.token, id: registration.user.id });
    noCredentials(registration.user);
  }
  const [learner, peer] = accounts;
  const call = (method, path, body, expected = 200) => api(method, `/api${path}`, body, learner.token, expected);
  await api("POST", "/api/auth/login", { email: learner.email, password: "invalid-password" }, undefined, 401);
  const login = await api("POST", "/api/auth/login", { email: learner.email, password: learner.password });
  learner.token = login.token;
  const placement = await call("GET", "/placement/questions");
  const attempt = await call("POST", "/placement/attempts", { answers: placement.questions.map(q => ({ questionId: q.id, optionId: q.options[0].id })) }, 201);
  assert.equal(typeof attempt.attemptId, "string");
  const settings = { appLanguage: "en", courseLanguage: "en", motivation: "travel", startingLevel: "A1", dailyGoalMinutes: 10, dailyTimeBudgetMinutes: 15, reminderEnabled: false, timezone: "Asia/Ho_Chi_Minh", learningPromise: "Practice every day", onboardingCompleted: true };
  assert.equal((await call("PATCH", "/users/me/settings", settings)).settings.onboardingCompleted, true);
  await call("PATCH", "/users/me/settings", { dailyGoalMinutes: 20, textSize: "invalid" }, 400);
  assert.equal((await call("GET", "/users/me/settings")).settings.dailyGoalMinutes, 10, "Invalid settings must be atomic");
  assert.equal((await call("GET", "/home")).progress.completedLessons, 0);
  const catalog = await call("GET", "/courses");
  const course = (await call("GET", `/courses/${catalog.courses.find(c => c.slug === "english-foundations").id}`)).course;
  const unit = (await call("GET", `/units/${course.units[0].id}`)).unit;
  assert.ok(unit.lessons.length);
  await call("GET", "/lessons/not-a-uuid", undefined, 400);
  await call("GET", `/lessons/${randomUUID()}`, undefined, 404);
  const lessons = [];
  for (const summary of course.units.flatMap(u => u.lessons)) {
    const lesson = (await call("GET", `/lessons/${summary.id}`)).lesson;
    noCredentials(lesson); lessons.push(lesson);
    await call("POST", `/lessons/${lesson.id}/complete`, {}, 409);
    for (const exercise of lesson.exercises) {
      let answer;
      if (exercise.type === "multiple_choice") {
        answer = { kind: "choice", optionId: exercise.options.find(o => ["Good morning", "Could I have a coffee, please?"].includes(o.label)).id };
        if (!lessons.slice(0, -1).length) {
          const wrong = exercise.options.find(o => o.id !== answer.optionId).id;
          assert.equal((await call("POST", `/exercises/${exercise.id}/answers`, { answer: { kind: "choice", optionId: wrong } }, 201)).isCorrect, false);
          await call("GET", `/exercises/${exercise.id}/hints?step=1`);
        }
      } else if (exercise.type === "sentence_tiles") answer = { kind: "sentence_tiles", tokens: ["My", "name", "is", "Mia."] };
      else if (exercise.type === "transcript_gap") answer = { kind: "transcript_gap", text: "are" };
      else if (exercise.type === "speaking") answer = { kind: "speaking", transcript: "I am fine, thank you.", score: 90 };
      else if (exercise.type === "matching") answer = { kind: "matching", pairs: [{ left: "turn left", right: "change direction to the left" }, { left: "go straight", right: "continue forward" }] };
      else throw new Error(`Unexpected seeded exercise ${exercise.type}`);
      await call("POST", `/exercises/${exercise.id}/answers`, { answer: { ...answer, rawAudio: "not-accepted" } }, 400);
      assert.equal((await call("POST", `/exercises/${exercise.id}/answers`, { answer }, 201)).isCorrect, true);
    }
    assert.ok((await call("POST", `/lessons/${lesson.id}/complete`, {})).xpEarned > 0);
    assert.equal((await call("POST", `/lessons/${lesson.id}/complete`, {})).xpEarned, 0);
  }
  const progress = await call("GET", "/progress");
  assert.equal(progress.completedLessons, 4); assert.equal(progress.xp, 52); assert.ok(progress.currentStreak >= 1);
  assert.equal((await call("GET", "/home")).progress.completedLessonIds.length, 4);
  const history = await call("GET", `/lessons/${lessons[0].id}/answers`); assert.equal(history.answers.length, 3);
  assert.equal((await call("GET", "/analytics/weekly")).summary.xp, 52);
  await call("GET", "/learning/skill-baseline");
  const deck = (await call("POST", "/vocabulary/sets", { name: "Persisted QA deck" }, 201)).set;
  await call("POST", `/vocabulary/sets/${deck.id}/cards`, { front: "hello", back: "a greeting" }, 201);
  await api("GET", `/api/vocabulary/sets/${deck.id}`, undefined, peer.token, 404);
  const story = (await call("GET", "/stories")).stories[0];
  await call("PUT", `/stories/${story.id}/progress`, { position: 1, completed: true });
  const request = (await call("POST", "/support/requests", { message: "QA integration request", deviceDetails: { platform: "android" } }, 201)).request;
  await call("PATCH", `/support/requests/${request.id}`, { message: "Updated QA integration request" });
  await call("DELETE", `/support/requests/${request.id}`);
  const friend = (await call("POST", "/friend-requests", { userId: peer.id }, 201)).request;
  await api("PATCH", `/api/friend-requests/${friend.id}`, { action: "accept" }, peer.token);
  assert.equal((await call("GET", "/friends")).friends.length, 1);
  const group = (await call("POST", "/study-groups", { name: "QA study group", goal: "Practice together", topic: "english" }, 201)).group;
  await api("POST", `/api/study-groups/${group.id}/membership`, {}, peer.token, 201);
  const post = (await call("POST", `/study-groups/${group.id}/discussion`, { body: "Hello, learning friends." }, 201)).post;
  await call("PATCH", `/study-groups/${group.id}/discussion/${post.id}`, { body: "Updated learning greeting." });
  await call("DELETE", `/study-groups/${group.id}/discussion/${post.id}`);
  await call("GET", "/leagues/current"); await call("GET", "/quests"); await call("GET", "/achievements"); await call("GET", "/notifications");
  const chat = (await call("POST", "/tutor/chats", { title: "QA question" }, 201)).chat;
  const reply = await call("POST", `/tutor/chats/${chat.id}/messages`, { message: "How do I use the present tense?" }, 201);
  assert.equal(reply.tutorMessage.role, "tutor");
  await api("GET", `/api/tutor/chats/${chat.id}`, undefined, peer.token, 404);
  const exported = await call("POST", "/users/me/data-exports", {}, 201);
  const data = await call("GET", `/users/me/data-exports/${exported.exportId}/download`);
  // Answer outcomes belong in an export, but credential/session material never does.
  const serialized = JSON.stringify(data);
  assert.ok(serialized.includes("Persisted QA deck"));
  for (const secret of [learner.password, learner.token, peer.token, "passwordHash", "tokenHash", "googleSubject"]) assert.ok(!serialized.includes(secret));
  await call("DELETE", `/users/me/data-exports/${exported.exportId}`);
  if (process.argv.includes("--restart-services")) {
    await restartServices();
    assert.equal((await call("GET", "/progress")).xp, 52);
    assert.equal((await call("GET", `/vocabulary/sets/${deck.id}`)).cards.length, 1);
    assert.equal((await call("GET", `/stories/${story.id}/progress`)).progress.completed, true);
    assert.equal((await call("GET", `/lessons/${lessons[0].id}/answers`)).answers.length, 3);
    assert.equal((await call("GET", "/users/me/settings")).settings.dailyGoalMinutes, 10);
    console.log("Database/session persistence survived Compose database and backend restart.");
  }
  await call("DELETE", `/study-groups/${group.id}`);
  await call("POST", "/auth/logout", {});
  await call("GET", "/progress", undefined, 401);
  console.log(`Demo integration passed: ${checks} HTTP checks, all five seeded exercise modes, profile/practice/community/tutor/export flows.`);
} finally {
  for (const account of accounts) {
    // A fresh login also handles a session explicitly logged out by the test.
    const login = await api("POST", "/api/auth/login", { email: account.email, password: account.password });
    await api("DELETE", "/api/users/me", { confirmEmail: account.email }, login.token);
  }
  console.log(`Removed ${accounts.length} disposable QA accounts.`);
}
