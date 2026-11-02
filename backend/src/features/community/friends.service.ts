import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { progressSummaries } from "../league/activity.js";
import { notify } from "./notifications.service.js";
import { userSummarySelect } from "./user-summary.js";
import { canViewProfile, pairKey, progressVisibleTo } from "./visibility.js";

const requestSelect = {
  id: true,
  requesterId: true,
  addresseeId: true,
  status: true,
  createdAt: true,
  respondedAt: true,
  requester: { select: userSummarySelect },
  addressee: { select: userSummarySelect },
} satisfies Prisma.FriendRequestSelect;

type RequestRow = Prisma.FriendRequestGetPayload<{ select: typeof requestSelect }>;

function toRequest(row: RequestRow, viewerId: string) {
  const outgoing = row.requesterId === viewerId;
  return {
    id: row.id,
    direction: outgoing ? ("outgoing" as const) : ("incoming" as const),
    status: row.status,
    user: outgoing ? row.addressee : row.requester,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

function receivedKey(requestId: string): string {
  return `friend_request:${requestId}`;
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendRequest.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    orderBy: { respondedAt: "desc" },
    select: requestSelect,
  });
  const friends = rows.map((row) => ({
    user: row.requesterId === userId ? row.addressee : row.requester,
    friendsSince: row.respondedAt ?? row.createdAt,
  }));
  const ids = friends.map((friend) => friend.user.id);
  const [visible, summaries] = await Promise.all([progressVisibleTo(userId, ids), progressSummaries(ids)]);
  return {
    friends: friends.map(({ user, friendsSince }) => ({
      ...user,
      friendsSince,
      progress: visible.has(user.id) ? summaries.get(user.id) ?? null : null,
    })),
  };
}

/** Pending requests in both directions, plus the learner's own declined requests so they can clear them. */
export async function listRequests(userId: string) {
  const rows = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { status: "pending", OR: [{ requesterId: userId }, { addresseeId: userId }] },
        { status: "declined", requesterId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: requestSelect,
  });
  return { requests: rows.map((row) => toRequest(row, userId)) };
}

export async function sendRequest(userId: string, targetId: string) {
  if (userId === targetId) throw new HttpError(400, "CANNOT_FRIEND_SELF", "You can't send a friend request to yourself.");
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target || !(await canViewProfile(userId, targetId))) throw new HttpError(404, "NOT_FOUND", "Learner not found.");

  const key = pairKey(userId, targetId);
  const existing = await prisma.friendRequest.findUnique({ where: { pairKey: key } });

  let row: RequestRow;
  if (existing) {
    if (existing.status === "accepted") throw new HttpError(409, "ALREADY_FRIENDS", "You are already friends.");
    if (existing.status === "pending") {
      if (existing.requesterId === userId) throw new HttpError(409, "REQUEST_PENDING", "Your friend request is already pending.");
      throw new HttpError(409, "INCOMING_REQUEST_PENDING", "This learner already sent you a request; accept it instead.");
    }
    if (existing.requesterId === userId) {
      throw new HttpError(409, "REQUEST_DECLINED", "Your earlier request was declined. Remove it before sending another.");
    }
    // The caller declined the target's earlier request; reuse the row in the other direction.
    row = await prisma.friendRequest.update({
      where: { id: existing.id },
      data: { requesterId: userId, addresseeId: targetId, status: "pending", respondedAt: null, createdAt: new Date() },
      select: requestSelect,
    });
  } else {
    try {
      row = await prisma.friendRequest.create({
        data: { requesterId: userId, addresseeId: targetId, pairKey: key },
        select: requestSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "REQUEST_PENDING", "A friend request between you already exists.");
      throw error;
    }
  }

  await notify({
    userId: targetId,
    type: "friend_request_received",
    title: "New friend request",
    body: `${row.requester.displayName ?? "A learner"} wants to be friends.`,
    data: { requestId: row.id, userId },
    dedupeKey: receivedKey(row.id),
  });
  return { request: toRequest(row, userId) };
}

export async function respondToRequest(userId: string, requestId: string, action: "accept" | "decline") {
  const existing = await prisma.friendRequest.findFirst({ where: { id: requestId, addresseeId: userId } });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Friend request not found.");

  const updated = await prisma.friendRequest.updateMany({
    where: { id: requestId, status: "pending" },
    data: { status: action === "accept" ? "accepted" : "declined", respondedAt: new Date() },
  });
  if (updated.count === 0) throw new HttpError(409, "REQUEST_NOT_PENDING", "This request has already been answered.");

  const row = await prisma.friendRequest.findUniqueOrThrow({ where: { id: requestId }, select: requestSelect });
  if (action === "accept") {
    await notify({
      userId: row.requesterId,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      body: `${row.addressee.displayName ?? "A learner"} accepted your friend request.`,
      data: { requestId, userId },
      dedupeKey: `friend_accepted:${requestId}`,
    });
  }
  return { request: toRequest(row, userId) };
}

/** Requester cancels a pending request or clears a declined one. */
export async function deleteRequest(userId: string, requestId: string) {
  const existing = await prisma.friendRequest.findFirst({ where: { id: requestId, requesterId: userId } });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Friend request not found.");
  if (existing.status === "accepted") {
    throw new HttpError(409, "USE_FRIEND_REMOVAL", "This request was accepted; remove the friend instead.");
  }

  await prisma.$transaction([
    prisma.friendRequest.delete({ where: { id: requestId } }),
    prisma.notification.deleteMany({ where: { userId: existing.addresseeId, dedupeKey: receivedKey(requestId), readAt: null } }),
  ]);
  return { deleted: true };
}

export async function removeFriend(userId: string, friendId: string) {
  const result = await prisma.friendRequest.deleteMany({ where: { pairKey: pairKey(userId, friendId), status: "accepted" } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "You are not friends with this learner.");
  return { removed: true };
}
