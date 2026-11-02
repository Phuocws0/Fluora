import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../http/errors.js";
import { friendIds } from "../community/visibility.js";
import { currentStreak, lessonsTotal, lifetimeXp } from "./activity.js";

/** Lifetime metrics derived from activity. Achievement status is never edited directly. */
async function metrics(userId: string): Promise<Record<string, number>> {
  const [lessons, xp, streak, friends, groups, claims] = await Promise.all([
    lessonsTotal(userId),
    lifetimeXp([userId]),
    currentStreak(userId),
    friendIds(userId),
    prisma.groupMembership.count({ where: { userId } }),
    prisma.questClaim.count({ where: { userId } }),
  ]);
  return {
    lessons_completed_total: lessons,
    xp_total: xp.get(userId) ?? 0,
    streak_days: streak,
    friends_count: friends.length,
    groups_joined: groups,
    quests_claimed_total: claims,
  };
}

/** Records the first time each achievement is reached so `earnedAt` stays stable, then lists all of them. */
async function evaluate(userId: string) {
  const [achievements, values] = await Promise.all([prisma.achievement.findMany({ orderBy: { order: "asc" } }), metrics(userId)]);
  const qualified = achievements.filter((achievement) => (values[achievement.metric] ?? 0) >= achievement.target);
  if (qualified.length > 0) {
    await prisma.userAchievement.createMany({
      data: qualified.map((achievement) => ({ userId, achievementId: achievement.id })),
      skipDuplicates: true,
    });
  }

  const earned = await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true, earnedAt: true } });
  const earnedAt = new Map(earned.map((row) => [row.achievementId, row.earnedAt]));
  return achievements.map((achievement) => ({
    id: achievement.id,
    slug: achievement.slug,
    title: achievement.title,
    description: achievement.description,
    metric: achievement.metric,
    target: achievement.target,
    progress: Math.min(values[achievement.metric] ?? 0, achievement.target),
    earned: earnedAt.has(achievement.id),
    earnedAt: earnedAt.get(achievement.id) ?? null,
  }));
}

export async function listAchievements(userId: string) {
  const items = await evaluate(userId);
  return { achievements: items.map(({ metric: _metric, ...item }) => item) };
}

export async function getAchievement(userId: string, achievementId: string) {
  const achievement = (await evaluate(userId)).find((item) => item.id === achievementId);
  if (!achievement) throw new HttpError(404, "NOT_FOUND", "Achievement not found.");
  return { achievement };
}
