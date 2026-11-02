import type { Request, Response } from "express";
import { currentSessionId, currentUserId } from "../../http/auth.js";
import { HttpError } from "../../http/errors.js";
import {
  readBody,
  readNullableHttpUrl,
  readNullableText,
  readOptionalText,
  readPassword,
  readUuidParam,
  requireSomeField,
} from "../../http/validation.js";
import * as accountService from "./account.service.js";
import { listSessions, revokeSession } from "./session.service.js";

export async function getMe(_request: Request, response: Response): Promise<void> {
  response.json({ user: await accountService.getUser(currentUserId(response)) });
}

export async function updateMe(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["displayName", "bio", "avatarUrl"]);
  requireSomeField(body);

  const displayName = readOptionalText(body, "displayName", { max: 50 });
  const bio = readNullableText(body, "bio", 160);
  const avatarUrl = readNullableHttpUrl(body, "avatarUrl", 500);

  const user = await accountService.updateProfile(currentUserId(response), {
    ...(displayName !== undefined ? { displayName } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
  });
  response.json({ user });
}

export async function changePassword(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["currentPassword", "newPassword"]);
  const newPassword = readPassword(body, "newPassword", 8);
  const currentPassword = body.currentPassword === undefined ? undefined : readPassword(body, "currentPassword", 1);

  await accountService.changePassword(currentUserId(response), currentSessionId(response), {
    newPassword,
    ...(currentPassword !== undefined ? { currentPassword } : {}),
  });
  response.json({ updated: true });
}

export async function getSessions(_request: Request, response: Response): Promise<void> {
  response.json({ sessions: await listSessions(currentUserId(response), currentSessionId(response)) });
}

export async function deleteSession(request: Request, response: Response): Promise<void> {
  const sessionId = readUuidParam(request.params.sessionId, "sessionId");

  if (!(await revokeSession(currentUserId(response), sessionId))) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  response.json({ revoked: true });
}
