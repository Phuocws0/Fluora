import { prisma } from "../../db/prisma.js";
import { currentStreak } from "../activity/activity.service.js";
import { currentWeek } from "./periods.js";
import { tierFor, type Tier } from "./tiers.js";

/**
 * The only reader of other domains' activity tables. XP comes from #27's `LessonCompletion`;
 * review answers and reading progress come from #39. Nothing here is stored or editable.
 */

export { currentStreak };

function toMap(userIds: string[], rows: Array<{ userId: string; value: number }>): Map<string, number> {
  const byId = new Map(rows.map((row) => [row.userId, row.value]));
  return new Map(userIds.map((id) => [id, byId.get(id) ?? 0]));
}

async function sumXp(userIds: string[], range?: { from: Date; to: Date }): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.lessonCompletion.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, ...(range ? { completedAt: { gte: range.from, lt: range.to } } : {}) },
    _sum: { xpEarned: true },
  });
  return toMap(userIds, rows.map((row) => ({ userId: row.userId, value: row._sum.xpEarned ?? 0 })));
}

export function lifetimeXp(userIds: string[]): Promise<Map<string, number>> {
  return sumXp(userIds);
}

export function xpBetween(userIds: string[], from: Date, to: Date): Promise<Map<string, number>> {
  return sumXp(userIds, { from, to });
}

export async function lessonsBetween(userIds: string[], from: Date, to: Date): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.lessonCompletion.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, completedAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  return toMap(userIds, rows.map((row) => ({ userId: row.userId, value: row._count._all })));
}

export async function lessonsTotal(userId: string): Promise<number> {
  return prisma.lessonCompletion.count({ where: { userId } });
}

export function reviewAnswersBetween(userId: string, from: Date, to: Date): Promise<number> {
  return prisma.reviewOutcome.count({ where: { item: { userId }, createdAt: { gte: from, lt: to } } });
}

/** Approximate: `ReadingProgress.updatedAt` moves on every save, so "completed today" means last saved today. */
export function storiesCompletedBetween(userId: string, from: Date, to: Date): Promise<number> {
  return prisma.readingProgress.count({ where: { userId, completed: true, updatedAt: { gte: from, lt: to } } });
}

export type ProgressSummary = { totalXp: number; weeklyXp: number; currentStreak: number; tier: Tier };

export async function progressSummaries(userIds: string[]): Promise<Map<string, ProgressSummary>> {
  const week = currentWeek();
  const [total, weekly, streaks] = await Promise.all([
    lifetimeXp(userIds),
    xpBetween(userIds, week.startsAt, week.endsAt),
    Promise.all(userIds.map(async (id) => [id, await currentStreak(id)] as const)),
  ]);
  const streakById = new Map(streaks);
  return new Map(
    userIds.map((id) => {
      const totalXp = total.get(id) ?? 0;
      return [id, { totalXp, weeklyXp: weekly.get(id) ?? 0, currentStreak: streakById.get(id) ?? 0, tier: tierFor(totalXp).tier }];
    }),
  );
}
