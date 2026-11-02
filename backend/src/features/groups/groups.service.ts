import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { userSummarySelect } from "../community/user-summary.js";
import { loadGroupForMember, requireGroupOwner } from "./access.js";

export const GROUP_VISIBILITY = ["public", "private"] as const;

export type GroupInput = {
  name: string;
  goal: string;
  topic: string;
  visibility: (typeof GROUP_VISIBILITY)[number];
};

export type GroupUpdate = Partial<GroupInput> & { meetupAt?: Date | null; meetupNote?: string | null; ownerId?: string };

const groupSelect = {
  id: true,
  name: true,
  goal: true,
  topic: true,
  visibility: true,
  meetupAt: true,
  meetupNote: true,
  createdAt: true,
  _count: { select: { memberships: true } },
} satisfies Prisma.StudyGroupSelect;

type GroupRow = Prisma.StudyGroupGetPayload<{ select: typeof groupSelect }>;

function toGroup({ _count, ...group }: GroupRow, myRole: string | null) {
  return { ...group, memberCount: _count.memberships, myRole };
}

export function challengeStatus(challenge: { startsAt: Date; endsAt: Date }, now = new Date()): "upcoming" | "active" | "ended" {
  if (now < challenge.startsAt) return "upcoming";
  return now < challenge.endsAt ? "active" : "ended";
}

export async function listGroups(userId: string, filters: { query?: string; topic?: string; mine: boolean }) {
  const rows = await prisma.studyGroup.findMany({
    where: {
      ...(filters.mine
        ? { memberships: { some: { userId } } }
        : { OR: [{ visibility: "public" }, { memberships: { some: { userId } } }] }),
      ...(filters.query ? { name: { contains: filters.query, mode: "insensitive" as const } } : {}),
      ...(filters.topic ? { topic: filters.topic } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { ...groupSelect, memberships: { where: { userId }, select: { role: true } } },
  });
  return { groups: rows.map(({ memberships, ...row }) => toGroup(row, memberships[0]?.role ?? null)) };
}

export async function createGroup(userId: string, input: GroupInput) {
  const group = await prisma.studyGroup.create({
    data: { ...input, memberships: { create: { userId, role: "owner" } } },
    select: groupSelect,
  });
  return { group: toGroup(group, "owner") };
}

/** Members see the full overview; anyone may preview a public group. */
export async function getGroup(userId: string, groupId: string) {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    select: {
      ...groupSelect,
      memberships: { where: { userId }, select: { role: true } },
      challenge: { select: { id: true, title: true, metric: true, target: true, startsAt: true, endsAt: true } },
      rooms: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, focus: true, startsAt: true, closedAt: true } },
    },
  });
  if (!group) throw new HttpError(404, "NOT_FOUND", "Study group not found.");

  const { memberships, challenge, rooms, ...row } = group;
  const myRole = memberships[0]?.role ?? null;
  if (!myRole && row.visibility === "private") throw new HttpError(404, "NOT_FOUND", "Study group not found.");

  return {
    group: {
      ...toGroup(row, myRole),
      challenge: challenge ? { ...challenge, status: challengeStatus(challenge) } : null,
      rooms: myRole ? rooms : [],
    },
  };
}

export async function updateGroup(userId: string, groupId: string, input: GroupUpdate) {
  const { ownerId, ...fields } = input;

  await prisma.$transaction(async (tx) => {
    // Serialize updates so concurrent ownership transfers cannot leave multiple owners.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "study_groups" WHERE "id" = ${groupId}::uuid FOR UPDATE
    `;
    if (locked.length === 0) throw new HttpError(404, "NOT_FOUND", "Study group not found.");

    const group = await tx.studyGroup.findUnique({ where: { id: groupId }, select: { visibility: true } });
    const currentOwner = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { role: true } });
    if (!group) throw new HttpError(404, "NOT_FOUND", "Study group not found.");
    if (!currentOwner) {
      if (group.visibility === "private") throw new HttpError(404, "NOT_FOUND", "Study group not found.");
      throw new HttpError(403, "NOT_A_MEMBER", "Join this group first.");
    }
    if (currentOwner.role !== "owner") throw new HttpError(403, "OWNER_ONLY", "Only the group owner can do this.");

    if (ownerId && ownerId !== userId) {
      const target = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId: ownerId } } });
      if (!target) throw new HttpError(400, "NOT_A_MEMBER", "The new owner must already be a member.");
      await tx.groupMembership.update({ where: { id: target.id }, data: { role: "owner" } });
      await tx.groupMembership.update({ where: { groupId_userId: { groupId, userId } }, data: { role: "member" } });
    }
    if (Object.keys(fields).length > 0) await tx.studyGroup.update({ where: { id: groupId }, data: fields });
  });

  return getGroup(userId, groupId);
}

export async function deleteGroup(userId: string, groupId: string) {
  await requireGroupOwner(groupId, userId);
  await prisma.studyGroup.delete({ where: { id: groupId } });
  return { deleted: true };
}

export async function listMembers(userId: string, groupId: string) {
  await loadGroupForMember(groupId, userId);
  const rows = await prisma.groupMembership.findMany({
    where: { groupId },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    select: { role: true, joinedAt: true, user: { select: userSummarySelect } },
  });
  return { members: rows.map(({ user, ...membership }) => ({ ...user, ...membership })) };
}

export async function joinGroup(userId: string, groupId: string) {
  const group = await prisma.studyGroup.findUnique({ where: { id: groupId }, select: { visibility: true } });
  if (!group) throw new HttpError(404, "NOT_FOUND", "Study group not found.");

  const existing = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (existing) throw new HttpError(409, "ALREADY_MEMBER", "You are already a member of this group.");
  if (group.visibility === "private") throw new HttpError(403, "GROUP_PRIVATE", "This group is private.");

  try {
    const membership = await prisma.groupMembership.create({
      data: { groupId, userId },
      select: { id: true, groupId: true, role: true, joinedAt: true },
    });
    return { membership };
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "ALREADY_MEMBER", "You are already a member of this group.");
    throw error;
  }
}

/** Gives every room the learner hosts in `groupId` (or in all groups) to that group's current owner. */
async function handOverHostedRooms(tx: Prisma.TransactionClient, userId: string, groupId?: string): Promise<void> {
  const rooms = await tx.studyRoom.findMany({ where: { hostId: userId, ...(groupId ? { groupId } : {}) }, select: { id: true, groupId: true } });
  for (const room of rooms) {
    const owner = await tx.groupMembership.findFirst({
      where: { groupId: room.groupId, role: "owner", userId: { not: userId } },
      select: { userId: true },
    });
    if (owner) await tx.studyRoom.update({ where: { id: room.id }, data: { hostId: owner.userId } });
    else await tx.studyRoom.delete({ where: { id: room.id } });
  }
}

/**
 * Leave a group. An owner must transfer ownership first unless they are the only member, in which
 * case the group is deleted. Authored posts, comments, tasks, and notes stay.
 */
export async function leaveGroup(userId: string, groupId: string) {
  const membership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership) throw new HttpError(404, "NOT_FOUND", "You are not a member of this group.");

  if (membership.role === "owner") {
    const others = await prisma.groupMembership.count({ where: { groupId, userId: { not: userId } } });
    if (others > 0) throw new HttpError(409, "OWNER_MUST_TRANSFER", "Transfer ownership or delete the group before leaving.");
    await prisma.studyGroup.delete({ where: { id: groupId } });
    return { left: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.challengeParticipant.deleteMany({ where: { userId, challenge: { groupId } } });
    await tx.roomParticipant.deleteMany({ where: { userId, room: { groupId } } });
    await tx.pollVote.deleteMany({ where: { userId, poll: { closedAt: null, room: { groupId } } } });
    await handOverHostedRooms(tx, userId, groupId);
    await tx.groupMembership.delete({ where: { id: membership.id } });
  });
  return { left: true };
}

/**
 * Account-deletion hook: promote the earliest-joined other member of each owned group (or delete
 * the group when nobody else is left), then hand hosted rooms to each group's owner.
 */
export async function releaseOwnedGroups(userId: string, tx: Prisma.TransactionClient): Promise<void> {
  const owned = await tx.groupMembership.findMany({ where: { userId, role: "owner" }, select: { groupId: true } });
  for (const { groupId } of owned) {
    const successor = await tx.groupMembership.findFirst({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: "asc" },
      select: { id: true },
    });
    if (successor) {
      await tx.groupMembership.update({ where: { id: successor.id }, data: { role: "owner" } });
      await tx.groupMembership.update({ where: { groupId_userId: { groupId, userId } }, data: { role: "member" } });
    } else {
      await tx.studyGroup.delete({ where: { id: groupId } });
    }
  }
  await handOverHostedRooms(tx, userId);
}
