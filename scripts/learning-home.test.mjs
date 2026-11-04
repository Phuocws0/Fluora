import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadActivity(completions, courses = [{ id: "course", title: "English", units: [{ lessons: [{ id: "lesson-1" }, { id: "lesson-2" }, { id: "lesson-3" }] }] }]) {
  const source = await readFile(new URL("../backend/src/features/activity/activity.service.ts", import.meta.url), "utf8");
  const context = vm.createContext({ Date, Map, Set });
  const prisma = {
    course: { findMany: async () => courses },
    lessonCompletion: {
      findMany: async ({ where }) => {
        assert.equal(where.userId, "learner");
        return completions;
      },
      findFirst: async ({ where }) => {
        assert.equal(where.userId, "learner");
        return completions.at(-1) ?? null;
      },
    },
  };
  const module = new vm.SourceTextModule(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText, { context });
  await module.link(async (specifier) => {
    const exports = specifier.includes("db/prisma") ? { prisma }
      : specifier.includes("placement") ? { latestPlacementBaseline: async () => null }
      : { getWalletBalance: async (userId) => { assert.equal(userId, "learner"); return 8; } };
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

test("home includes every completed lesson, even when the last completion was out of order", async () => {
  const today = new Date();
  const activity = await loadActivity([
    { lessonId: "lesson-3", xpEarned: 14, completedAt: today },
    { lessonId: "lesson-1", xpEarned: 12, completedAt: today },
  ]);
  const result = await activity.home("learner");
  assert.deepEqual(Array.from(result.progress.completedLessonIds), ["lesson-3", "lesson-1"]);
  assert.equal(result.progress.lastCompletedLesson.lessonId, "lesson-1");
  assert.equal(result.progress.xp, 26);
  assert.equal(result.wallet.gems, 8);
});

test("home returns an empty completion list for a new learner", async () => {
  const activity = await loadActivity([]);
  const result = await activity.home("learner");
  assert.equal(result.progress.completedLessonIds.length, 0);
  assert.equal(result.progress.lastCompletedLesson, null);
  assert.equal(result.progress.completedLessons, 0);
});

test("home advances to an unfinished course and does not expose its internal lesson list", async () => {
  const today = new Date();
  const activity = await loadActivity([{ lessonId: "done", xpEarned: 12, completedAt: today }], [
    { id: "finished", units: [{ lessons: [{ id: "done" }] }] },
    { id: "next", units: [{ lessons: [{ id: "new" }] }] },
  ]);
  const result = await activity.home("learner");
  assert.equal(result.course.id, "next");
  assert.equal("units" in result.course, false);
});

test("home handles an empty catalog without inventing a course", async () => {
  const activity = await loadActivity([], []);
  assert.equal((await activity.home("learner")).course, null);
});
