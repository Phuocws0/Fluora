import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import { HttpError } from "../../http/errors.js";
import { userSummarySelect } from "../community/user-summary.js";
import { lessonsBetween, xpBetween } from "../league/activity.js";
import { loadGroupForMember, requireGroupOwner } from "./access.js";
import { challengeStatus } from "./groups.service.js";

export const CHALLENGE_METRICS = ["xp", "lessons"] as const;
export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number];

export type ChallengeInput = { title: string; metric: ChallengeMetric; target: number; startsAt: Date; endsAt: Date };

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

export function assertWindow(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) throw new HttpError(400, "VALIDATION_ERROR", "endsAt must be after startsAt.");
  if (endsAt.getTime() - startsAt.getTime() > MAX_WINDOW_MS) throw new HttpError(400, "VALIDATION_ERROR", "A challenge can last at most 31 days.");
}

function notFound(): HttpError {
  return new HttpError(404, "NOT_FOUND", "This group has no challenge.");
}

/** Progress is derived from lesson activity inside the challenge window. */
export async function getChallenge(userId: string, groupId: string) {
  await loadGroupForMember(groupId, userId);
  const challenge = await prisma.groupChallenge.findUnique({
    where: { groupId },
    select: {
      id: true,
      title: true,
      metric: true,
      target: true,
      startsAt: true,
      endsAt: true,
      participants: { orderBy: { joinedAt: "asc" }, select: { joinedAt: true, user: { select: userSummarySelect } } },
    },
  });
  if (!challenge) throw notFound();

  const now = new Date();
  const ids = challenge.participants.map((participant) => participant.user.id);
  const until = now < challenge.endsAt ? now : challenge.endsAt;
  const progress =
    now < challenge.startsAt ? new Map<string, number>()
    : challenge.metric === "lessons" ? await lessonsBetween(ids, challenge.startsAt, until)
    : await xpBetween(ids, challenge.startsAt, until);

  const participants = challenge.participants.map(({ user, joinedAt }) => ({ ...user, joinedAt, progress: progress.get(user.id) ?? 0 }));
  const joined = participants.some((participant) => participant.id === userId);
  const { participants: _rows, ...details } = challenge;
  return {
    challenge: {
      ...details,
      status: challengeStatus(challenge, now),
      groupProgress: participants.reduce((sum, participant) => sum + participant.progress, 0),
      myProgress: joined ? progress.get(userId) ?? 0 : null,
      joined,
      participants,
    },
  };
}

export async function createChallenge(userId: string, groupId: string, input: ChallengeInput) {
  await requireGroupOwner(groupId, userId);
  assertWindow(input.startsAt, input.endsAt);
  try {
    await prisma.groupChallenge.create({ data: { ...input, groupId } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "CHALLENGE_EXISTS", "This group already has a challenge.");
    throw error;
  }
  return getChallenge(userId, groupId);
}

export async function updateChallenge(userId: string, groupId: string, input: Partial<ChallengeInput>) {
  await requireGroupOwner(groupId, userId);
  const current = await prisma.groupChallenge.findUnique({ where: { groupId }, include: { _count: { select: { participants: true } } } });
  if (!current) throw notFound();
  if (input.metric && input.metric !== current.metric && current._count.participants > 0) {
    throw new HttpError(409, "CHALLENGE_STARTED", "The metric can't change after learners have joined.");
  }
  assertWindow(input.startsAt ?? current.startsAt, input.endsAt ?? current.endsAt);
  await prisma.groupChallenge.update({ where: { groupId }, data: input });
  return getChallenge(userId, groupId);
}

export async function deleteChallenge(userId: string, groupId: string) {
  await requireGroupOwner(groupId, userId);
  const result = await prisma.groupChallenge.deleteMany({ where: { groupId } });
  if (result.count === 0) throw notFound();
  return { deleted: true };
}

export async function joinChallenge(userId: string, groupId: string) {
  await loadGroupForMember(groupId, userId);
  const challenge = await prisma.groupChallenge.findUnique({ where: { groupId }, select: { id: true, endsAt: true } });
  if (!challenge) throw notFound();
  if (challenge.endsAt <= new Date()) throw new HttpError(409, "CHALLENGE_ENDED", "This challenge has ended.");
  try {
    const participant = await prisma.challengeParticipant.create({
      data: { challengeId: challenge.id, userId },
      select: { id: true, challengeId: true, joinedAt: true },
    });
    return { participant };
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "ALREADY_JOINED", "You already joined this challenge.");
    throw error;
  }
}

export async function leaveChallenge(userId: string, groupId: string) {
  await loadGroupForMember(groupId, userId);
  const result = await prisma.challengeParticipant.deleteMany({ where: { userId, challenge: { groupId } } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "You haven't joined this challenge.");
  return { left: true };
}
