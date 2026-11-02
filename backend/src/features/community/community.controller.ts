import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { readPageQuery } from "../../http/pagination.js";
import { readBody, readOptionalEnum, readQueryText, readUuidParam, validationError } from "../../http/validation.js";
import * as friends from "./friends.service.js";
import * as notifications from "./notifications.service.js";
import * as users from "./users.service.js";

export async function searchUsers(request: Request, response: Response): Promise<void> {
  const query = readQueryText(request.query, "q", { min: 2, max: 50 });
  if (query === undefined) throw validationError("q is required (2 to 50 characters).");
  response.json(await users.searchUsers(currentUserId(response), query));
}

export async function getUser(request: Request, response: Response): Promise<void> {
  const userId = readUuidParam(request.params.userId, "userId");
  response.json(await users.getProfile(currentUserId(response), userId));
}

export async function listFriends(_request: Request, response: Response): Promise<void> {
  response.json(await friends.listFriends(currentUserId(response)));
}

export async function removeFriend(request: Request, response: Response): Promise<void> {
  const friendId = readUuidParam(request.params.userId, "userId");
  response.json(await friends.removeFriend(currentUserId(response), friendId));
}

export async function listRequests(_request: Request, response: Response): Promise<void> {
  response.json(await friends.listRequests(currentUserId(response)));
}

export async function sendRequest(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["userId"]);
  const targetId = readUuidParam(body.userId, "userId");
  response.status(201).json(await friends.sendRequest(currentUserId(response), targetId));
}

export async function respondToRequest(request: Request, response: Response): Promise<void> {
  const requestId = readUuidParam(request.params.requestId, "requestId");
  const body = readBody(request.body, ["action"]);
  const action = readOptionalEnum(body, "action", ["accept", "decline"] as const);
  if (!action) throw validationError("action is required (accept or decline).");
  response.json(await friends.respondToRequest(currentUserId(response), requestId, action));
}

export async function deleteRequest(request: Request, response: Response): Promise<void> {
  const requestId = readUuidParam(request.params.requestId, "requestId");
  response.json(await friends.deleteRequest(currentUserId(response), requestId));
}

export async function listNotifications(request: Request, response: Response): Promise<void> {
  const unread = readQueryText(request.query, "unread", { max: 5 });
  if (unread !== undefined && unread !== "true" && unread !== "false") throw validationError("unread must be true or false.");
  const page = readPageQuery(request.query);
  response.json(await notifications.listNotifications(currentUserId(response), { unreadOnly: unread === "true", page }));
}

export async function markAllRead(_request: Request, response: Response): Promise<void> {
  response.json(await notifications.markAllRead(currentUserId(response)));
}

export async function setRead(request: Request, response: Response): Promise<void> {
  const notificationId = readUuidParam(request.params.notificationId, "notificationId");
  const body = readBody(request.body, ["read"]);
  if (typeof body.read !== "boolean") throw validationError("read must be true or false.");
  response.json(await notifications.setRead(currentUserId(response), notificationId, body.read));
}

export async function deleteNotification(request: Request, response: Response): Promise<void> {
  const notificationId = readUuidParam(request.params.notificationId, "notificationId");
  response.json(await notifications.deleteNotification(currentUserId(response), notificationId));
}

export async function clearNotifications(_request: Request, response: Response): Promise<void> {
  response.json(await notifications.clearNotifications(currentUserId(response)));
}
