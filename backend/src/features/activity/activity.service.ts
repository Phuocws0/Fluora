import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import { latestPlacementBaseline } from "../identity/placement.service.js";
import { getWalletBalance } from "../league/wallet.service.js";

export class ActivityError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

type Answer =
  | { kind: "choice"; optionId: string }
  | { kind: "sentence_tiles"; tokens: string[] }
  | { kind: "transcript_gap" | "dictation"; text: string }
  | { kind: "matching"; pairs: Array<{ left: string; right: string }> }
  | { kind: "speaking"; transcript: string; score: number };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalized(value: string): string { return value.trim().toLocaleLowerCase(); }

export function parseAnswer(value: unknown): Answer | null {
  const data = record(value);
  if (!data || typeof data.kind !== "string") return null;
  const keys = Object.keys(data);
  if (data.kind === "choice" && keys.every((key) => ["kind", "optionId"].includes(key)) && typeof data.optionId === "string") {
    return { kind: "choice", optionId: data.optionId };
  }
  if (data.kind === "sentence_tiles" && keys.every((key) => ["kind", "tokens"].includes(key)) && Array.isArray(data.tokens) && data.tokens.length <= 50 && data.tokens.every((token) => typeof token === "string" && token.length <= 100)) {
    return { kind: "sentence_tiles", tokens: data.tokens };
  }
  if ((data.kind === "transcript_gap" || data.kind === "dictation") && keys.every((key) => ["kind", "text"].includes(key)) && typeof data.text === "string" && data.text.trim().length > 0 && data.text.length <= 1000) {
    return { kind: data.kind, text: data.text.trim() };
  }
  if (data.kind === "matching" && keys.every((key) => ["kind", "pairs"].includes(key)) && Array.isArray(data.pairs) && data.pairs.length <= 30 && data.pairs.every((pair) => { const item = record(pair); return item && Object.keys(item).every((key) => ["left", "right"].includes(key)) && typeof item.left === "string" && typeof item.right === "string"; })) {
    return { kind: "matching", pairs: data.pairs };
  }
  if (data.kind === "speaking" && keys.every((key) => ["kind", "transcript", "score"].includes(key)) && typeof data.transcript === "string" && data.transcript.length <= 1000 && typeof data.score === "number" && Number.isInteger(data.score) && data.score >= 0 && data.score <= 100) {
    return { kind: "speaking", transcript: data.transcript, score: data.score };
  }
  return null;
}

function expectedKind(type: string): Answer["kind"] | null {
  if (type === "multiple_choice" || type === "listening_choice") return "choice";
  if (type === "sentence_tiles") return "sentence_tiles";
  if (type === "transcript_gap") return "transcript_gap";
  if (type === "dictation") return "dictation";
  if (type === "matching") return "matching";
  if (type === "speaking") return "speaking";
  return null;
}

export async function submitAnswer(userId: string, exerciseId: string, answer: Answer) {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, lesson: { is: { unit: { is: { course: { isPublished: true } } } } } },
    include: { options: { select: { id: true, value: true } } },
  });
  if (!exercise) throw new ActivityError(404, "NOT_FOUND", "Exercise not found.");
  if (expectedKind(exercise.type) !== answer.kind) throw new ActivityError(400, "VALIDATION_ERROR", "Answer kind does not match this exercise.");
  const key = record(exercise.answerKey);
  if (!key) throw new ActivityError(500, "CONTENT_ERROR", "Exercise answer key is unavailable.");

  let isCorrect = false;
  let score = 0;
  if (answer.kind === "choice") {
    const option = exercise.options.find((item) => item.id === answer.optionId);
    if (!option) throw new ActivityError(400, "VALIDATION_ERROR", "Option does not belong to this exercise.");
    isCorrect = option.value === key.optionValue;
  } else if (answer.kind === "sentence_tiles") {
    isCorrect = Array.isArray(key.tokens) && key.tokens.length === answer.tokens.length && key.tokens.every((token, index) => token === answer.tokens[index]);
  } else if (answer.kind === "transcript_gap" || answer.kind === "dictation") {
    isCorrect = Array.isArray(key.accepted) && key.accepted.some((text) => typeof text === "string" && normalized(text) === normalized(answer.text));
  } else if (answer.kind === "matching") {
    const expected = Array.isArray(key.pairs) ? key.pairs : [];
    const submitted = answer.pairs.map((pair) => JSON.stringify([pair.left, pair.right]));
    isCorrect = expected.length > 0 && expected.length === submitted.length && new Set(submitted).size === submitted.length && expected.every((pair) => {
      const item = record(pair);
      return item && submitted.includes(JSON.stringify([item.left, item.right]));
    });
  } else if (answer.kind === "speaking") {
    score = answer.score;
    isCorrect = score >= 60;
  }
  if (answer.kind !== "speaking") score = isCorrect ? 100 : 0;
  const feedback = isCorrect ? "Good work!" : "Try again and review the explanation.";
  await prisma.userAnswer.create({ data: { userId, exerciseId, answer: answer as Prisma.InputJsonValue, isCorrect, score, feedback } });
  return {
    isCorrect,
    feedback,
    explanation: exercise.explanation,
    score,
    ...(answer.kind === "speaking" ? { speakingScorecard: { overall: score, transcript: answer.transcript } } : {}),
  };
}

export async function lessonAnswers(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, unit: { is: { course: { isPublished: true } } } }, select: { id: true } });
  if (!lesson) throw new ActivityError(404, "NOT_FOUND", "Lesson not found.");
  return { answers: await prisma.userAnswer.findMany({ where: { userId, exercise: { lessonId } }, orderBy: { createdAt: "asc" }, select: { id: true, exerciseId: true, answer: true, isCorrect: true, score: true, feedback: true, createdAt: true } }) };
}

export async function hint(exerciseId: string, step: number) {
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, lesson: { is: { unit: { is: { course: { isPublished: true } } } } } }, select: { content: true, instruction: true, prompt: true } });
  if (!exercise) throw new ActivityError(404, "NOT_FOUND", "Exercise not found.");
  const content = record(exercise.content);
  const hints = Array.isArray(content?.hints) ? content.hints.filter((value): value is string => typeof value === "string") : [];
  const fallback = ["Read the prompt carefully.", exercise.instruction ?? "Try one step at a time.", "Review the lesson before answering again."];
  return { step, text: hints[step - 1] ?? fallback[step - 1] };
}

export async function completeLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, unit: { is: { course: { isPublished: true } } } }, select: { id: true, exercises: { select: { id: true } } } });
  if (!lesson) throw new ActivityError(404, "NOT_FOUND", "Lesson not found.");
  const existing = await prisma.lessonCompletion.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (existing) return { lessonId, completedAt: existing.completedAt, xpEarned: 0, alreadyCompleted: true };
  const answered = await prisma.userAnswer.findMany({ where: { userId, exercise: { lessonId } }, select: { exerciseId: true } });
  const answeredIds = new Set(answered.map((row) => row.exerciseId));
  if (lesson.exercises.some((exercise) => !answeredIds.has(exercise.id))) throw new ActivityError(409, "INCOMPLETE_LESSON", "Answer each lesson exercise before completing it.");
  const xpEarned = 10 + lesson.exercises.length * 2;
  try {
    const completion = await prisma.lessonCompletion.create({ data: { userId, lessonId, xpEarned } });
    return { lessonId, completedAt: completion.completedAt, xpEarned, alreadyCompleted: false };
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "P2002") {
      const completion = await prisma.lessonCompletion.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } });
      return { lessonId, completedAt: completion.completedAt, xpEarned: 0, alreadyCompleted: true };
    }
    throw cause;
  }
}

function day(date: Date): string { return date.toISOString().slice(0, 10); }

function streakFromDays(days: Set<string>): number {
  let currentStreak = 0;
  const cursor = new Date();
  if (!days.has(day(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(day(cursor))) { currentStreak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return currentStreak;
}

/** Consecutive UTC days with a lesson completion, ending today or yesterday. */
export async function currentStreak(userId: string): Promise<number> {
  const completions = await prisma.lessonCompletion.findMany({ where: { userId }, select: { completedAt: true } });
  return streakFromDays(new Set(completions.map((item) => day(item.completedAt))));
}

export async function progress(userId: string) {
  const [completions, gems] = await Promise.all([
    prisma.lessonCompletion.findMany({ where: { userId }, select: { completedAt: true, xpEarned: true } }),
    getWalletBalance(userId),
  ]);
  const xp = completions.reduce((sum, item) => sum + item.xpEarned, 0);
  const currentStreak = streakFromDays(new Set(completions.map((item) => day(item.completedAt))));
  return { completedLessons: completions.length, currentStreak, xp, gems };
}

export async function weeklyAnalytics(userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const completions = await prisma.lessonCompletion.findMany({ where: { userId, completedAt: { gte: start } }, select: { completedAt: true, xpEarned: true } });
  const answers = await prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: start } }, select: { createdAt: true } });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = day(date);
    return { date: key, xp: completions.filter((item) => day(item.completedAt) === key).reduce((sum, item) => sum + item.xpEarned, 0), answers: answers.filter((item) => day(item.createdAt) === key).length };
  });
  return { days, summary: { xp: days.reduce((sum, item) => sum + item.xp, 0), answers: answers.length, completedLessons: completions.length } };
}

export async function skillBaseline(userId: string) {
  const answers = await prisma.userAnswer.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      isCorrect: true,
      exercise: { select: { lesson: { select: { skill: true, level: true } } } },
    },
  });
  if (answers.length === 0) {
    const placement = await latestPlacementBaseline(userId);
    if (!placement) throw new ActivityError(404, "NOT_FOUND", "Complete an exercise or the placement test to see a skill baseline.");
    const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { startingLevel: true } });
    return {
      level: settings?.startingLevel ?? placement.level,
      skills: placement.skills.map((item) => ({ skill: item.skill, confidence: item.score, attempts: item.total })),
      source: "placement" as const,
    };
  }
  const grouped = new Map<string, { correct: number; total: number }>();
  for (const answer of answers) {
    const skill = answer.exercise.lesson.skill;
    const row = grouped.get(skill) ?? { correct: 0, total: 0 };
    row.total++;
    if (answer.isCorrect) row.correct++;
    grouped.set(skill, row);
  }
  return { level: answers.at(-1)?.exercise.lesson.level ?? "A1", skills: [...grouped].map(([skill, row]) => ({ skill, confidence: Math.round(row.correct / row.total * 100), attempts: row.total })), source: "answers" as const };
}

export async function home(userId: string) {
  const [course, totals, last] = await Promise.all([
    prisma.course.findFirst({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, title: true, language: true, level: true } }),
    progress(userId),
    prisma.lessonCompletion.findFirst({ where: { userId }, orderBy: { completedAt: "desc" }, select: { lessonId: true, completedAt: true } }),
  ]);
  return { course, progress: { ...totals, lastCompletedLesson: last }, streak: totals.currentStreak, wallet: { gems: totals.gems } };
}
