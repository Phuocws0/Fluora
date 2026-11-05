import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { once } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(new URL("../backend/package.json", import.meta.url));
const { Client } = require("pg");
const { parse } = require("dotenv");
const local = existsSync(`${root}/.env`) ? parse(readFileSync(`${root}/.env`)) : {};
const original = new URL(process.env.DATABASE_URL || local.DATABASE_URL || "postgresql://localhost:5432/fluora");
assert(["localhost", "127.0.0.1"].includes(original.hostname), "Seed acceptance creates a disposable DB and only runs against a local PostgreSQL server.");
const database = `fluora_seed_test_${process.pid}_${Date.now()}`;
const target = new URL(original); target.pathname = `/${database}`;
const password = "SeedAcceptanceOnly42!";
const env = { ...process.env, DATABASE_URL: target.href, DEMO_PASSWORD: password, TUTOR_PROVIDER: "local", LLM_API_KEY: "", NODE_ENV: "test" };
const admin = new Client({ connectionString: original.href });
let db, server, base, checks = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function run(args, stage) {
  const result = spawnSync("npm", args, { cwd: root, env, encoding: "utf8", timeout: 120000 });
  if (result.status !== 0) {
    const sensitive = [original.href, target.href, decodeURIComponent(original.password), password].filter(Boolean);
    let output = String(result.stderr || result.stdout || result.error || "");
    for (const value of sensitive) output = output.split(value).join("[redacted]");
    throw new Error(`${stage} failed: ${output.slice(-1800)}`);
  }
}
async function counts() {
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename")).rows;
  const result = {};
  for (const { tablename } of tables) {
    const quoted = `"${tablename.replaceAll('"', '""')}"`;
    result[tablename] = Number((await db.query(`SELECT count(*) FROM ${quoted}`)).rows[0].count);
  }
  return result;
}
async function call(token, method, path, body, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  const data = await response.json(); checks++;
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}, ${data.error?.code ?? ""}`);
  return data;
}

await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  run(["run", "db:deploy"], "Fresh migrations");
  run(["run", "db:seed"], "First seed");
  db = new Client({ connectionString: target.href }); await db.connect();
  const first = await counts();
  assert.equal(first.courses, 3); assert.equal(first.units, 6); assert.equal(first.lessons, 12); assert.equal(first.exercises, 22);
  assert.equal(first.stories, 5); assert.equal(first.User, 4); assert.equal(first.vocabulary_sets, 6); assert.equal(first.vocabulary_cards, 90);
  assert.equal(first.study_groups, 3); assert.equal(first.study_rooms, 6); assert.equal(first.polls, 6);
  assert(first.tutor_conversations >= 9 && first.tutor_notes >= 3 && first.wallet_transactions > 0);
  assert.deepEqual((await db.query("SELECT DISTINCT type FROM exercises ORDER BY type")).rows.map(r => r.type), ["dictation", "listening_choice", "matching", "multiple_choice", "sentence_tiles", "speaking", "transcript_gap"]);

  const sentinel = randomUUID();
  await db.query('INSERT INTO "User" (id,email,"displayName","updatedAt") VALUES($1,$2,$3,NOW())', [sentinel, "seed.sentinel@fluora.local", "Preserve this ordinary user"]);
  await db.query('INSERT INTO user_settings("userId","dailyGoalMinutes","updatedAt") VALUES($1,37,NOW())', [sentinel]);
  const card = (await db.query("SELECT id FROM vocabulary_cards LIMIT 1")).rows[0];
  await db.query("UPDATE vocabulary_cards SET front=$1 WHERE id=$2", ["Preserve this edited card", card.id]);
  const beforeSecond = await counts();
  run(["run", "db:seed"], "Second seed");
  assert.deepEqual(await counts(), beforeSecond, "Rerunning the seed must not duplicate fixtures");
  assert.equal((await db.query('SELECT "dailyGoalMinutes" FROM user_settings WHERE "userId"=$1', [sentinel])).rows[0].dailyGoalMinutes, 37);
  assert.equal((await db.query("SELECT front FROM vocabulary_cards WHERE id=$1", [card.id])).rows[0].front, "Preserve this edited card");
  assert.equal((await db.query("SELECT count(*) FROM (SELECT \"groupId\" FROM group_memberships GROUP BY \"groupId\" HAVING count(*) FILTER (WHERE role='owner') <> 1) q")).rows[0].count, "0");
  console.log("Fresh DB: migrations + full seed + repeat seed passed; ordinary user data and edited cards preserved.");

  const listener = createServer(); listener.listen(0, "127.0.0.1"); await once(listener, "listening");
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  server = spawn(process.execPath, ["backend/dist/server.js"], { cwd: root, env: { ...env, PORT: String(port) }, stdio: ["ignore", "ignore", "ignore"] });
  base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error("Acceptance backend exited before becoming ready.");
    try { const response = await fetch(`${base}/health`); if (response.ok) { ready = true; break; } } catch { /* The process is still starting. */ }
    await sleep(100);
  }
  assert(ready, "Acceptance backend did not become ready");
  const accounts = {};
  for (const name of ["linh", "minh", "an", "new"]) {
    const login = await call(null, "POST", "/api/auth/login", { email: `demo.${name}@fluora.local`, password });
    accounts[name] = login.token;
    const { settings } = await call(login.token, "GET", "/api/users/me/settings");
    assert.equal(settings.onboardingCompleted, name !== "new");
    assert.equal(settings.appLanguage, "en");
  }
  const { an, linh, minh } = accounts;
  const home = await call(an, "GET", "/api/home"); assert.equal(home.progress.completedLessons, 12); assert.equal(home.wallet.gems, 85);
  const unaccentedCafeSearch = await call(null, "GET", "/api/lessons/search?query=cafe");
  assert(unaccentedCafeSearch.lessons.some((lesson) => lesson.title === "Ordering at a café"), "Unaccented search should match accented lesson titles");
  assert.equal((await db.query(`SELECT count(*) FROM reward_redemptions rr JOIN rewards r ON r.id=rr."rewardId" WHERE rr.status IN ('pending','cancelled') AND r.fulfillment <> 'deferred'`)).rows[0].count, "0");
  const vietnameseSettings = await call(an, "PATCH", "/api/users/me/settings", { appLanguage: "vi", dailyGoalMinutes: 40 });
  assert.equal(vietnameseSettings.settings.appLanguage, "vi");
  assert.equal(vietnameseSettings.settings.dailyGoalMinutes, 40);
  await call(an, "PATCH", "/api/users/me/settings", { appLanguage: "es" }, 400);
  assert.equal((await call(an, "GET", "/api/users/me/settings")).settings.appLanguage, "vi");
  assert.equal((await call(an, "GET", "/api/users/me/settings")).settings.dailyGoalMinutes, 40);
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.equal((await call(accounts.new, "PATCH", "/api/users/me/settings", { startingLevel: level })).settings.startingLevel, level);
  for (const path of ["/api/courses", "/api/learning-paths", "/api/stories", "/api/practice", "/api/analytics/weekly", "/api/learning/skill-baseline", "/api/learning/evidence", "/api/missions/passport", "/api/learning/misconceptions", "/api/achievements", "/api/quests", "/api/leagues/current"]) await call(an, "GET", path);
  const { quests } = await call(an, "GET", "/api/quests"); assert(quests.every(q => q.status === "claimed"));
  assert((await call(minh, "GET", "/api/quests")).quests.some(q => q.status === "claimable"));
  const redemption = (await call(an, "GET", "/api/redemptions")).redemptions.find(r => r.status === "pending"); assert(redemption?.cancellable);
  assert.equal((await call(an, "DELETE", `/api/redemptions/${redemption.id}`)).balance, 105);
  await call(an, "DELETE", `/api/redemptions/${redemption.id}`, undefined, 409);
  assert((await call(linh, "GET", "/api/practice/review-items")).items.length > 0);
  await call(linh, "GET", "/api/dictionary?query=borrow");
  const { sets } = await call(linh, "GET", "/api/vocabulary/sets"); assert.equal(sets.length, 2);
  const { cards } = await call(linh, "GET", `/api/vocabulary/sets/${sets[0].id}`); assert.equal(cards.length, 15);
  const deck = await call(linh, "POST", "/api/vocabulary/sets", { name: "Acceptance deck" }, 201);
  const createdCard = await call(linh, "POST", `/api/vocabulary/sets/${deck.set.id}/cards`, { front: "test", back: "a check" }, 201);
  await call(linh, "PATCH", `/api/vocabulary/cards/${createdCard.card.id}`, { front: "checked" });
  await call(an, "GET", `/api/vocabulary/sets/${deck.set.id}`, undefined, 404);
  await call(linh, "DELETE", `/api/vocabulary/cards/${createdCard.card.id}`);
  await call(linh, "DELETE", `/api/vocabulary/sets/${deck.set.id}`);

  const group = (await db.query("SELECT id FROM study_groups WHERE name='Fluora demo garden'")).rows[0];
  const privateGroup = (await db.query("SELECT id FROM study_groups WHERE name='Writing lab'")).rows[0];
  await call(linh, "GET", `/api/study-groups/${privateGroup.id}`, undefined, 404);
  await call(an, "GET", `/api/study-groups/${privateGroup.id}`);
  await call(linh, "PATCH", `/api/study-groups/${group.id}`, { goal: "Forbidden" }, 403);
  await call(minh, "PATCH", `/api/study-groups/${group.id}`, { goal: "A working owner demo" });
  const feed = await call(linh, "GET", `/api/study-groups/${group.id}/discussion`); assert(feed.nextBefore); assert.equal(feed.posts.length, 20);
  assert((await call(linh, "GET", `/api/study-groups/${group.id}/discussion?before=${encodeURIComponent(feed.nextBefore)}`)).posts.length > 0);
  const post = await call(linh, "POST", `/api/study-groups/${group.id}/discussion`, { body: "A new practice sentence." }, 201);
  await call(linh, "PATCH", `/api/study-groups/${group.id}/discussion/${post.post.id}`, { body: "An edited practice sentence." });
  const comment = await call(an, "POST", `/api/study-groups/${group.id}/discussion/${post.post.id}/comments`, { body: "Thanks for sharing." }, 201);
  await call(an, "DELETE", `/api/study-groups/${group.id}/discussion/${post.post.id}/comments/${comment.comment.id}`);
  await call(linh, "DELETE", `/api/study-groups/${group.id}/discussion/${post.post.id}`);
  await call(linh, "GET", `/api/study-groups/${group.id}/challenge`);
  await call(linh, "GET", `/api/study-groups/${group.id}/plan/tasks`);
  await call(linh, "GET", `/api/study-groups/${group.id}/whiteboard/notes`);

  const room = (await db.query('SELECT id FROM study_rooms WHERE "groupId"=$1 AND "closedAt" IS NULL', [group.id])).rows[0];
  const closedRoom = (await db.query('SELECT id FROM study_rooms WHERE "groupId"=$1 AND "closedAt" IS NOT NULL', [group.id])).rows[0];
  await call(linh, "GET", `/api/study-rooms/${room.id}`);
  const messages = await call(linh, "GET", `/api/study-rooms/${room.id}/messages`); assert.equal(messages.messages.length, 20); assert(messages.nextBefore);
  await call(linh, "POST", `/api/study-rooms/${closedRoom.id}/messages`, { body: "Blocked in a closed room" }, 409);
  const sent = await call(linh, "POST", `/api/study-rooms/${room.id}/messages`, { body: "Hello from acceptance." }, 201);
  await call(linh, "PATCH", `/api/study-rooms/${room.id}/messages/${sent.message.id}`, { body: "Edited room message." });
  await call(linh, "DELETE", `/api/study-rooms/${room.id}/messages/${sent.message.id}`);
  const polls = (await call(linh, "GET", `/api/study-rooms/${room.id}/polls`)).polls;
  const openPoll = polls.find(p => !p.closed), closedPoll = polls.find(p => p.closed); assert(openPoll && closedPoll);
  await call(linh, "POST", `/api/study-rooms/${room.id}/polls/${openPoll.id}/votes`, { choiceId: openPoll.choices[0].id }, 201);
  await call(linh, "PATCH", `/api/study-rooms/${room.id}/polls/${openPoll.id}/votes/me`, { choiceId: openPoll.choices[1].id });
  await call(linh, "DELETE", `/api/study-rooms/${room.id}/polls/${openPoll.id}/votes/me`);
  await call(linh, "POST", `/api/study-rooms/${room.id}/polls/${closedPoll.id}/votes`, { choiceId: closedPoll.choices[0].id }, 409);
  assert((await call(linh, "GET", "/api/notifications")).nextBefore);
  await call(minh, "GET", "/api/peer-reviews");
  assert((await call(minh, "GET", "/api/support/requests")).requests.some(r => r.status === "closed"));
  const exported = await call(an, "POST", "/api/users/me/data-exports", {}, 201);
  const data = await call(an, "GET", `/api/users/me/data-exports/${exported.exportId}/download`);
  for (const secret of [password, "passwordHash", "tokenHash"]) assert(!JSON.stringify(data).includes(secret));

  const chats = (await call(linh, "GET", "/api/tutor/chats")).chats; assert(chats.length >= 3);
  const rolePlay = chats.find(chat => chat.kind === "role_play" && chat.status === "active"); assert(rolePlay?.currentTurn);
  const reply = await call(linh, "POST", `/api/tutor/chats/${rolePlay.id}/messages`, { message: rolePlay.currentTurn.choices[0].label }, 201);
  assert.equal(reply.feedback.verdict, "correct");
  assert((await call(linh, "GET", "/api/tutor/notes")).notes.length > 0);
  // Prove every exercise is answerable through the actual API, including the
  // additional listening-choice/dictation modes absent from the original course.
  const lessons = (await db.query('SELECT l.id,c.slug AS "courseSlug",c.id AS "courseId" FROM lessons l JOIN units u ON u.id=l."unitId" JOIN courses c ON c.id=u."courseId" ORDER BY c."order",u."order",l."order"')).rows;
  for (const lesson of lessons) {
    assert.equal((await call(accounts.new, "GET", "/api/home")).course.id, lesson.courseId);
    const exercises = (await db.query('SELECT id,type,content,"answerKey" FROM exercises WHERE "lessonId"=$1 ORDER BY "order"', [lesson.id])).rows;
    for (const exercise of exercises) {
      const key = exercise.answerKey;
      let answer;
      if (["multiple_choice", "listening_choice"].includes(exercise.type)) {
        const option = (await db.query('SELECT id FROM exercise_options WHERE "exerciseId"=$1 AND value=$2', [exercise.id, key.optionValue])).rows[0];
        answer = { kind: "choice", optionId: option.id };
      } else if (exercise.type === "sentence_tiles") answer = { kind: exercise.type, tokens: key.tokens };
      else if (exercise.type === "matching") answer = { kind: exercise.type, pairs: key.pairs };
      else if (exercise.type === "speaking") answer = { kind: exercise.type, transcript: exercise.content.suggestedPhrase, score: 85 };
      else answer = { kind: exercise.type, text: key.accepted[0] };
      assert.equal((await call(accounts.new, "POST", `/api/exercises/${exercise.id}/answers`, { answer }, 201)).isCorrect, true, `${exercise.type} fixture must be answerable`);
    }
    assert((await call(accounts.new, "POST", `/api/lessons/${lesson.id}/complete`, {})).xpEarned > 0);
    assert.equal((await call(accounts.new, "POST", `/api/lessons/${lesson.id}/complete`, {})).xpEarned, 0);
  }
  assert.equal((await call(accounts.new, "GET", "/api/home")).progress.completedLessons, 12);
  console.log(`Full demo acceptance passed: ${checks} real HTTP checks plus schema, fixture counts, repeated seed, preservation, roles, pagination, rewards, and Tutor checks.`);
} finally {
  if (server && server.exitCode === null) { server.kill("SIGTERM"); await Promise.race([once(server, "exit"), sleep(3000)]); if (server.exitCode === null) server.kill("SIGKILL"); }
  if (db) await db.end();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.end();
  console.log("Disposable seed-acceptance database removed; configured project database was not reset.");
}
