import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../http/errors.js";
import { progressSummaries } from "../league/activity.js";
import { userSummarySelect } from "./user-summary.js";
import { canViewProfile, progressVisibleTo, relationships } from "./visibility.js";

/** Discoverable learners by display name, or by exact email. Learners without settings are discoverable by default. */
export async function searchUsers(viewerId: string, query: string) {
  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [{ displayName: { contains: query, mode: "insensitive" } }, { email: query.toLowerCase() }],
      AND: [{ OR: [{ settings: { is: { discoverable: true } } }, { settings: { is: null } }] }],
    },
    orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
    take: 20,
    select: userSummarySelect,
  });
  const relation = await relationships(viewerId, users.map((user) => user.id));
  return { users: users.map((user) => ({ ...user, relationship: relation.get(user.id) ?? "none" })) };
}

export async function getProfile(viewerId: string, targetId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: { ...userSummarySelect, bio: true } });
  if (!user) throw new HttpError(404, "NOT_FOUND", "Learner not found.");
  if (!(await canViewProfile(viewerId, targetId))) throw new HttpError(403, "PROFILE_PRIVATE", "This learner's profile is private.");

  const [relation, visible] = await Promise.all([relationships(viewerId, [targetId]), progressVisibleTo(viewerId, [targetId])]);
  if (!visible.has(targetId)) {
    return { user: { ...user, relationship: relation.get(targetId) ?? "none", progress: null, achievements: null } };
  }

  const [summaries, earned] = await Promise.all([
    progressSummaries([targetId]),
    prisma.userAchievement.findMany({
      where: { userId: targetId },
      orderBy: { earnedAt: "desc" },
      select: { earnedAt: true, achievement: { select: { slug: true, title: true } } },
    }),
  ]);
  return {
    user: {
      ...user,
      relationship: relation.get(targetId) ?? "none",
      progress: summaries.get(targetId) ?? null,
      achievements: earned.map((item) => ({ ...item.achievement, earnedAt: item.earnedAt })),
    },
  };
}
