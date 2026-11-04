import assert from "node:assert/strict";
import { test } from "node:test";
import { ONBOARDING_LEVELS } from "../mobile/features/onboarding/onboarding-levels.ts";
import { firstUnfinishedLesson } from "../mobile/features/learning/next-lesson.ts";
import { lessonTextScale, addStudyTime, breakIsDue } from "../mobile/features/profile/learning-preferences.ts";
import { ADDITIONAL_COURSES } from "../backend/dist/db/demo-content.js";
import { demoId } from "../backend/dist/db/seed-demo.js";

test("every selectable CEFR label matches the saved value, including advanced placement levels", () => {
  assert.deepEqual(ONBOARDING_LEVELS.map(level => level.id), ["A1", "A2", "B1", "B2", "C1", "C2"]);
  for (const level of ONBOARDING_LEVELS) assert.equal(level.label, level.id);
});

test("Home has no next lesson after completion and handles out-of-order progress", () => {
  const lessons = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(firstUnfinishedLesson(lessons, ["a", "b", "c"]), null);
  assert.equal(firstUnfinishedLesson(lessons, ["a", "c"]).id, "b");
  assert.equal(firstUnfinishedLesson(lessons, []).id, "a");
  assert.equal(firstUnfinishedLesson([], []), null);
});

test("lesson sizes match the 100%, 120%, and 140% controls", () => {
  assert.deepEqual([undefined, "default", "large", "extra_large"].map(lessonTextScale), [1, 1, 1.2, 1.4]);
});

test("break reminder counts foreground time and waits while backgrounded or already open", () => {
  let elapsed = addStudyTime(0, 299000, true, false);
  assert.equal(breakIsDue(elapsed, 5), false);
  elapsed = addStudyTime(elapsed, 3600000, false, false);
  assert.equal(elapsed, 299000);
  elapsed = addStudyTime(elapsed, 1000, true, false);
  assert.equal(breakIsDue(elapsed, 5), true);
  assert.equal(addStudyTime(elapsed, 10000, true, true), elapsed);
  assert.equal(breakIsDue(elapsed, null), false);
  assert.equal(breakIsDue(elapsed, 15), false);
  assert.equal(addStudyTime(elapsed, -10000, true, false), elapsed);
});

test("expanded demo content has playable activities for all seven supported exercise modes", () => {
  const types = new Set();
  for (const course of ADDITIONAL_COURSES) for (const unit of course.units) for (const lesson of unit.lessons) {
    assert(lesson.exercises.length > 0);
    for (const exercise of lesson.exercises) {
      types.add(exercise.type);
      assert(exercise.prompt.trim());
      assert(exercise.explanation.trim());
      if (exercise.options) { assert(exercise.options.length >= 2); assert.equal(exercise.answerKey.optionValue, "option-1"); }
      if (exercise.type === "sentence_tiles") assert.deepEqual([...exercise.content.tiles].sort(), [...exercise.answerKey.tokens].sort());
      if (exercise.type === "dictation") assert(exercise.answerKey.accepted.includes(exercise.content.transcript));
      if (exercise.type === "matching") assert.equal(exercise.content.leftItems.length, exercise.answerKey.pairs.length);
    }
  }
  assert.deepEqual([...types].sort(), ["dictation", "listening_choice", "matching", "multiple_choice", "sentence_tiles", "speaking", "transcript_gap"]);
});

test("demo IDs are stable valid UUIDs and do not collapse independent fixtures", () => {
  assert.equal(demoId("same"), demoId("same"));
  assert.notEqual(demoId("same"), demoId("different"));
  assert.match(demoId("same"), /^[a-f\d]{8}-[a-f\d]{4}-5[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
});
