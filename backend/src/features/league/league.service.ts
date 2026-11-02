import { prisma } from "../../db/prisma.js";
import { userSummarySelect, type UserSummary } from "../community/user-summary.js";
import { friendIds, progressVisibleTo } from "../community/visibility.js";
import { lifetimeXp, xpBetween } from "./activity.js";
import { currentWeek } from "./periods.js";
import { tierFor } from "./tiers.js";

export type LeaderboardScope = "league" | "friends";

const TOP = 50;

type Ranked = { rank: number; user: UserSummary; weeklyXp: number; isCurrentUser: boolean };

/** Ranks learners by this week's XP. `league`: the caller's tier; `friends`: the caller and friends. */
async function rankLearners(userId: string, scope: LeaderboardScope): Promise<Ranked[]> {
  const week = currentWeek();
  let candidates: string[];
  if (scope === "friends") {
    candidates = [userId, ...(await friendIds(userId))];
  } else {
    const everyone = (await prisma.user.findMany({ select: { id: true } })).map((user) => user.id);
    const totals = await lifetimeXp(everyone);
    const myTier = tierFor(totals.get(userId) ?? 0).tier.key;
    candidates = everyone.filter((id) => tierFor(totals.get(id) ?? 0).tier.key === myTier);
  }

  const visible = await progressVisibleTo(userId, candidates);
  const ids = candidates.filter((id) => visible.has(id));
  const [weekly, users] = await Promise.all([
    xpBetween(ids, week.startsAt, week.endsAt),
    prisma.user.findMany({ where: { id: { in: ids } }, select: userSummarySelect }),
  ]);

  return users
    .map((user) => ({ user, weeklyXp: weekly.get(user.id) ?? 0 }))
    .sort((a, b) => b.weeklyXp - a.weeklyXp || (a.user.displayName ?? "").localeCompare(b.user.displayName ?? ""))
    .map((entry, index) => ({ rank: index + 1, ...entry, isCurrentUser: entry.user.id === userId }));
}

export async function leaderboard(userId: string, scope: LeaderboardScope) {
  const week = currentWeek();
  const ranked = await rankLearners(userId, scope);
  const entries = ranked.slice(0, TOP);
  const me = ranked.find((entry) => entry.isCurrentUser);
  if (me && me.rank > TOP) entries.push(me);
  return { period: { startsAt: week.startsAt, endsAt: week.endsAt }, scope, entries };
}

export async function currentLeague(userId: string) {
  const week = currentWeek();
  const [totals, weekly, ranked] = await Promise.all([
    lifetimeXp([userId]),
    xpBetween([userId], week.startsAt, week.endsAt),
    rankLearners(userId, "league"),
  ]);
  const totalXp = totals.get(userId) ?? 0;
  const { tier, nextTier } = tierFor(totalXp);
  return {
    league: {
      tier,
      nextTier,
      totalXp,
      xpToNextTier: nextTier ? nextTier.minXp - totalXp : null,
      weeklyXp: weekly.get(userId) ?? 0,
      rank: ranked.find((entry) => entry.isCurrentUser)?.rank ?? null,
      period: { startsAt: week.startsAt, endsAt: week.endsAt },
    },
  };
}
