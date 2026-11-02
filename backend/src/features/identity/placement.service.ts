import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PLACEMENT_QUESTIONS, PLACEMENT_SKILLS, PLACEMENT_VERSION, type PlacementSkill } from "./placement.questions.js";

export type PlacementAnswer = { questionId: string; optionId: string };
export type SkillScore = { skill: PlacementSkill; score: number; correct: number; total: number };
export type PlacementResult = { level: string; skillBaseline: SkillScore[] };

/** Public question bank; answer keys are removed. */
export function listQuestions() {
  return {
    version: PLACEMENT_VERSION,
    questions: PLACEMENT_QUESTIONS.map(({ answer: _answer, ...question }) => question),
  };
}

export function isKnownAnswer(answer: PlacementAnswer): "ok" | "unknown_question" | "unknown_option" {
  const question = PLACEMENT_QUESTIONS.find((item) => item.id === answer.questionId);
  if (!question) return "unknown_question";
  return question.options.some((option) => option.id === answer.optionId) ? "ok" : "unknown_option";
}

function levelFor(percent: number): string {
  if (percent < 40) return "A1";
  if (percent < 60) return "A2";
  if (percent < 80) return "B1";
  return "B2";
}

/** Demo heuristic from the #3 plan: unanswered questions count as incorrect; the level caps at B2. */
export function score(answers: PlacementAnswer[]): PlacementResult {
  const chosen = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  const skillBaseline = PLACEMENT_SKILLS.map((skill) => {
    const questions = PLACEMENT_QUESTIONS.filter((question) => question.skill === skill);
    const correct = questions.filter((question) => chosen.get(question.id) === question.answer).length;
    return { skill, score: Math.round((100 * correct) / questions.length), correct, total: questions.length };
  });
  const correct = skillBaseline.reduce((sum, item) => sum + item.correct, 0);
  return { level: levelFor((100 * correct) / PLACEMENT_QUESTIONS.length), skillBaseline };
}

export async function submitAttempt(userId: string | undefined, answers: PlacementAnswer[]) {
  const result = score(answers);
  if (!userId) return { attemptId: null, ...result };

  const attempt = await prisma.placementAttempt.create({
    data: {
      userId,
      questionSetVersion: PLACEMENT_VERSION,
      answers: answers as Prisma.InputJsonValue,
      level: result.level,
      skillBaseline: result.skillBaseline as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { attemptId: attempt.id, ...result };
}

export async function listAttempts(userId: string) {
  const attempts = await prisma.placementAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, level: true, skillBaseline: true, questionSetVersion: true, createdAt: true },
  });
  return { attempts };
}

function parseSkillScores(value: Prisma.JsonValue): SkillScore[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return [];
    const { skill, score: points, correct, total } = item as Record<string, unknown>;
    if (typeof skill !== "string" || typeof points !== "number" || typeof correct !== "number" || typeof total !== "number") return [];
    return [{ skill: skill as PlacementSkill, score: points, correct, total }];
  });
}

/** Latest stored placement for the skill-baseline fallback (#27). */
export async function latestPlacementBaseline(userId: string): Promise<{ level: string; skills: SkillScore[] } | null> {
  const attempt = await prisma.placementAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { level: true, skillBaseline: true },
  });
  return attempt ? { level: attempt.level, skills: parseSkillScores(attempt.skillBaseline) } : null;
}
