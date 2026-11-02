import { prisma } from "../../db/prisma.js";
import { ActivityError } from "./activity.service.js";

export type PlannerInput = { date: string; time: string; durationMinutes: number; label?: string | null };
export type EvidenceInput = { kind: string; summary: string; reference?: string | null };

export async function listPlanner(userId: string) {
  return { entries: await prisma.plannerEntry.findMany({ where: { userId }, orderBy: [{ date: "asc" }, { time: "asc" }] }) };
}
export async function createPlanner(userId: string, input: PlannerInput) {
  return { entry: await prisma.plannerEntry.create({ data: { userId, ...input } }) };
}
export async function getPlanner(userId: string, id: string) {
  const entry = await prisma.plannerEntry.findFirst({ where: { id, userId } });
  if (!entry) throw new ActivityError(404, "NOT_FOUND", "Planner entry not found.");
  return { entry };
}
export async function updatePlanner(userId: string, id: string, input: Partial<PlannerInput>) {
  const result = await prisma.plannerEntry.updateMany({ where: { id, userId }, data: input });
  if (!result.count) throw new ActivityError(404, "NOT_FOUND", "Planner entry not found.");
  return { entry: await prisma.plannerEntry.findUniqueOrThrow({ where: { id } }) };
}
export async function deletePlanner(userId: string, id: string) {
  const result = await prisma.plannerEntry.deleteMany({ where: { id, userId } });
  if (!result.count) throw new ActivityError(404, "NOT_FOUND", "Planner entry not found.");
  return { deleted: true };
}

export async function listEvidence(userId: string) {
  const goals = await prisma.canDoGoal.findMany({ orderBy: { title: "asc" }, include: { evidence: { where: { userId }, orderBy: { createdAt: "desc" } } } });
  return { goals };
}
export async function createEvidence(userId: string, goalId: string, input: EvidenceInput) {
  const goal = await prisma.canDoGoal.findUnique({ where: { id: goalId }, select: { id: true } });
  if (!goal) throw new ActivityError(404, "NOT_FOUND", "Learning goal not found.");
  return { evidence: await prisma.learningEvidence.create({ data: { userId, goalId, ...input } }) };
}
export async function updateEvidence(userId: string, id: string, input: Partial<EvidenceInput>) {
  const result = await prisma.learningEvidence.updateMany({ where: { id, userId }, data: input });
  if (!result.count) throw new ActivityError(404, "NOT_FOUND", "Evidence not found.");
  return { evidence: await prisma.learningEvidence.findUniqueOrThrow({ where: { id } }) };
}
export async function deleteEvidence(userId: string, id: string) {
  const result = await prisma.learningEvidence.deleteMany({ where: { id, userId } });
  if (!result.count) throw new ActivityError(404, "NOT_FOUND", "Evidence not found.");
  return { deleted: true };
}

export async function passport(userId: string) {
  const missions = await prisma.mission.findMany({ orderBy: { title: "asc" }, include: { completions: { where: { userId }, select: { completedAt: true } } } });
  return { missions: missions.map(({ completions, ...mission }) => ({ ...mission, completedAt: completions[0]?.completedAt ?? null })) };
}
export async function mission(id: string) {
  const item = await prisma.mission.findUnique({ where: { id } });
  if (!item) throw new ActivityError(404, "NOT_FOUND", "Mission not found.");
  return { mission: item };
}
export async function completeMission(userId: string, id: string) {
  const item = await prisma.mission.findUnique({ where: { id } });
  if (!item) throw new ActivityError(404, "NOT_FOUND", "Mission not found.");
  if (item.requiredLessonId) {
    const completed = await prisma.lessonCompletion.findUnique({ where: { userId_lessonId: { userId, lessonId: item.requiredLessonId } } });
    if (!completed) throw new ActivityError(409, "INCOMPLETE_MISSION", "Complete the linked lesson first.");
  }
  const existing = await prisma.missionCompletion.findUnique({ where: { userId_missionId: { userId, missionId: id } } });
  if (existing) throw new ActivityError(409, "ALREADY_COMPLETED", "Mission already completed.");
  try {
    return { completion: await prisma.missionCompletion.create({ data: { userId, missionId: id } }) };
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "P2002") throw new ActivityError(409, "ALREADY_COMPLETED", "Mission already completed.");
    throw cause;
  }
}

export async function misconceptionRows(userId: string) {
  const counts = await prisma.userAnswer.groupBy({ by: ["exerciseId"], where: { userId, isCorrect: false }, _count: { _all: true }, having: { exerciseId: { _count: { gte: 2 } } } });
  const ids = counts.map((item) => item.exerciseId);
  const [exercises, states] = await Promise.all([
    prisma.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, prompt: true, type: true, explanation: true, lesson: { select: { title: true, skill: true } } } }),
    prisma.misconceptionState.findMany({ where: { userId, exerciseId: { in: ids } } }),
  ]);
  const countsById = new Map(counts.map((item) => [item.exerciseId, item._count._all]));
  const dismissedById = new Map(states.map((item) => [item.exerciseId, item.dismissed]));
  return exercises.map((exercise) => ({ id: exercise.id, exerciseId: exercise.id, prompt: exercise.prompt, type: exercise.type, explanation: exercise.explanation, lesson: exercise.lesson, mistakeCount: countsById.get(exercise.id) ?? 0, dismissed: dismissedById.get(exercise.id) ?? false }));
}
export async function misconceptions(userId: string) { return { items: await misconceptionRows(userId) }; }
export async function setMisconceptionDismissed(userId: string, exerciseId: string, dismissed: boolean) {
  const item = (await misconceptionRows(userId)).find((row) => row.id === exerciseId);
  if (!item) throw new ActivityError(404, "NOT_FOUND", "Misconception not found.");
  await prisma.misconceptionState.upsert({ where: { userId_exerciseId: { userId, exerciseId } }, create: { userId, exerciseId, dismissed }, update: { dismissed } });
  return { item: { ...item, dismissed } };
}
