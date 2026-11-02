import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../http/errors.js";

/**
 * The single place where membership and role rules live. Every groups/rooms/plan/whiteboard read
 * and mutation goes through one of these helpers first.
 */

export type GroupAccess = {
  group: { id: string; name: string; visibility: string };
  membership: { id: string; role: string; joinedAt: Date };
  isOwner: boolean;
};

function notFound(): HttpError {
  return new HttpError(404, "NOT_FOUND", "Study group not found.");
}

/** Members only. Private groups are hidden from non-members (404); public ones return 403. */
export async function loadGroupForMember(groupId: string, userId: string): Promise<GroupAccess> {
  const group = await prisma.studyGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, visibility: true } });
  if (!group) throw notFound();

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, role: true, joinedAt: true },
  });
  if (!membership) {
    if (group.visibility === "private") throw notFound();
    throw new HttpError(403, "NOT_A_MEMBER", "Join this group first.");
  }

  return { group, membership, isOwner: membership.role === "owner" };
}

export async function requireGroupOwner(groupId: string, userId: string): Promise<GroupAccess> {
  const access = await loadGroupForMember(groupId, userId);
  if (!access.isOwner) throw new HttpError(403, "OWNER_ONLY", "Only the group owner can do this.");
  return access;
}

export type RoomAccess = GroupAccess & {
  room: { id: string; groupId: string; hostId: string; closedAt: Date | null };
  isHost: boolean;
};

export async function loadRoomForMember(roomId: string, userId: string): Promise<RoomAccess> {
  const room = await prisma.studyRoom.findUnique({ where: { id: roomId }, select: { id: true, groupId: true, hostId: true, closedAt: true } });
  if (!room) throw new HttpError(404, "NOT_FOUND", "Study room not found.");

  let access: GroupAccess;
  try {
    access = await loadGroupForMember(room.groupId, userId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) throw new HttpError(404, "NOT_FOUND", "Study room not found.");
    throw error;
  }

  return { ...access, room, isHost: room.hostId === userId };
}

export function requireHost(access: RoomAccess): void {
  if (!access.isHost) throw new HttpError(403, "HOST_ONLY", "Only the room host can do this.");
}

export function assertRoomOpen(room: { closedAt: Date | null }): void {
  if (room.closedAt) throw new HttpError(409, "ROOM_CLOSED", "This study room is closed.");
}
