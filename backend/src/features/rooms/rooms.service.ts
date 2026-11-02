import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { createdBefore, toPage, type PageQuery } from "../../http/pagination.js";
import { userSummarySelect } from "../community/user-summary.js";
import { assertRoomOpen, loadRoomForMember, requireGroupOwner, requireHost, type RoomAccess } from "../groups/access.js";

export type RoomInput = { name?: string; focus?: string | null; startsAt?: Date | null };
export type RoomUpdate = RoomInput & { closed?: true };

async function roomView(roomId: string, userId: string) {
  const room = await prisma.studyRoom.findUniqueOrThrow({
    where: { id: roomId },
    select: {
      id: true,
      groupId: true,
      name: true,
      focus: true,
      startsAt: true,
      closedAt: true,
      createdAt: true,
      hostId: true,
      host: { select: userSummarySelect },
      participants: { orderBy: { joinedAt: "asc" }, select: { user: { select: userSummarySelect } } },
    },
  });
  const { hostId, participants, ...details } = room;
  const people = participants.map((participant) => participant.user);
  return { ...details, isHost: hostId === userId, joined: people.some((person) => person.id === userId), participants: people };
}

/** Only the group owner creates rooms; the creator becomes host and the first participant. */
export async function createRoom(userId: string, groupId: string, input: RoomInput) {
  await requireGroupOwner(groupId, userId);
  const room = await prisma.studyRoom.create({
    data: {
      groupId,
      hostId: userId,
      name: input.name ?? "Study room",
      focus: input.focus ?? null,
      startsAt: input.startsAt ?? null,
      participants: { create: { userId } },
    },
    select: { id: true },
  });
  return { room: await roomView(room.id, userId) };
}

export async function getRoom(userId: string, roomId: string) {
  await loadRoomForMember(roomId, userId);
  return { room: await roomView(roomId, userId) };
}

export async function updateRoom(userId: string, roomId: string, input: RoomUpdate) {
  const access = await loadRoomForMember(roomId, userId);
  requireHost(access);
  const { closed, ...fields } = input;
  await prisma.studyRoom.update({
    where: { id: roomId },
    data: { ...fields, ...(closed && !access.room.closedAt ? { closedAt: new Date() } : {}) },
  });
  return { room: await roomView(roomId, userId) };
}

export async function deleteRoom(userId: string, roomId: string) {
  requireHost(await loadRoomForMember(roomId, userId));
  await prisma.studyRoom.delete({ where: { id: roomId } });
  return { deleted: true };
}

export async function joinRoom(userId: string, roomId: string) {
  const access = await loadRoomForMember(roomId, userId);
  assertRoomOpen(access.room);
  try {
    const participant = await prisma.roomParticipant.create({ data: { roomId, userId }, select: { id: true, roomId: true, joinedAt: true } });
    return { participant };
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "ALREADY_JOINED", "You already joined this room.");
    throw error;
  }
}

export async function leaveRoom(userId: string, roomId: string) {
  const access = await loadRoomForMember(roomId, userId);
  if (access.isHost) throw new HttpError(409, "HOST_CANNOT_LEAVE", "The host can close or delete the room instead of leaving.");
  const result = await prisma.roomParticipant.deleteMany({ where: { roomId, userId } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "You haven't joined this room.");
  return { left: true };
}

// ---------- Messages ----------

const messageSelect = {
  id: true,
  authorId: true,
  body: true,
  editedAt: true,
  createdAt: true,
  author: { select: userSummarySelect },
  replyTo: { select: { id: true, body: true, author: { select: userSummarySelect } } },
} satisfies Prisma.RoomMessageSelect;

type MessageRow = Prisma.RoomMessageGetPayload<{ select: typeof messageSelect }>;

function toMessage({ authorId, replyTo, ...message }: MessageRow, userId: string, access: RoomAccess) {
  return {
    ...message,
    replyTo: replyTo ? { id: replyTo.id, author: replyTo.author, excerpt: replyTo.body.slice(0, 120) } : null,
    canEdit: authorId === userId,
    canDelete: authorId === userId || access.isHost,
  };
}

async function findMessage(roomId: string, messageId: string) {
  const message = await prisma.roomMessage.findFirst({ where: { id: messageId, roomId }, select: { id: true, authorId: true } });
  if (!message) throw new HttpError(404, "NOT_FOUND", "Message not found.");
  return message;
}

export async function listMessages(userId: string, roomId: string, page: PageQuery) {
  const access = await loadRoomForMember(roomId, userId);
  const rows = await prisma.roomMessage.findMany({
    where: { roomId, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: messageSelect,
  });
  const result = toPage(rows, page);
  return { messages: result.items.map((row) => toMessage(row, userId, access)), nextBefore: result.nextBefore };
}

/** Participants of an open room can post and reply. */
export async function sendMessage(userId: string, roomId: string, input: { body: string; replyToId?: string }) {
  const access = await loadRoomForMember(roomId, userId);
  assertRoomOpen(access.room);
  const participant = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!participant) throw new HttpError(403, "NOT_PARTICIPANT", "Join the room before sending messages.");
  if (input.replyToId) {
    const target = await prisma.roomMessage.findFirst({ where: { id: input.replyToId, roomId }, select: { id: true } });
    if (!target) throw new HttpError(400, "VALIDATION_ERROR", "replyToId must be a message in this room.");
  }

  const message = await prisma.roomMessage.create({
    data: { roomId, authorId: userId, body: input.body, replyToId: input.replyToId ?? null },
    select: messageSelect,
  });
  return { message: toMessage(message, userId, access) };
}

export async function updateMessage(userId: string, roomId: string, messageId: string, body: string) {
  const access = await loadRoomForMember(roomId, userId);
  assertRoomOpen(access.room);
  const message = await findMessage(roomId, messageId);
  if (message.authorId !== userId) throw new HttpError(403, "AUTHOR_ONLY", "Only the author can edit this message.");
  const updated = await prisma.roomMessage.update({ where: { id: messageId }, data: { body, editedAt: new Date() }, select: messageSelect });
  return { message: toMessage(updated, userId, access) };
}

export async function deleteMessage(userId: string, roomId: string, messageId: string) {
  const access = await loadRoomForMember(roomId, userId);
  const message = await findMessage(roomId, messageId);
  if (message.authorId !== userId && !access.isHost) throw new HttpError(403, "AUTHOR_ONLY", "Only the author or the host can delete this message.");
  await prisma.roomMessage.delete({ where: { id: messageId } });
  return { deleted: true };
}
