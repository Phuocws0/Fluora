import type { Request, Response } from "express";
import { currentSessionId, currentUserId } from "../../http/auth.js";
import { readBody, readEmail, readOptionalText, readPassword, readText, type JsonBody } from "../../http/validation.js";
import * as authService from "./auth.service.js";
import { verifyGoogleIdToken } from "./google.js";
import { revokeSession, type SessionClient } from "./session.service.js";

const MIN_PASSWORD_LENGTH = 8;

function readSessionClient(request: Request, body: JsonBody): SessionClient {
  const deviceName = readOptionalText(body, "deviceName", { max: 80 });
  const userAgent = request.get("user-agent")?.slice(0, 300);
  return { ...(deviceName ? { deviceName } : {}), ...(userAgent ? { userAgent } : {}) };
}

export async function register(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["email", "password", "displayName", "deviceName"]);
  const input = {
    email: readEmail(body, "email"),
    password: readPassword(body, "password", MIN_PASSWORD_LENGTH),
    displayName: readText(body, "displayName", { max: 50 }),
  };

  response.status(201).json(await authService.register(input, readSessionClient(request, body)));
}

export async function login(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["email", "password", "deviceName"]);
  const input = { email: readEmail(body, "email"), password: readPassword(body, "password", 1) };

  response.json(await authService.login(input, readSessionClient(request, body)));
}

export async function logout(_request: Request, response: Response): Promise<void> {
  await revokeSession(currentUserId(response), currentSessionId(response));
  response.json({ ok: true });
}

export async function verifyEmail(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["token"]);
  response.json(await authService.verifyEmail(readText(body, "token", { max: 200 })));
}

export async function resendVerification(_request: Request, response: Response): Promise<void> {
  response.json(await authService.resendVerification(currentUserId(response)));
}

export async function forgotPassword(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["email"]);
  response.json(await authService.forgotPassword(readEmail(body, "email")));
}

export async function resetPassword(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["token", "newPassword"]);
  const token = readText(body, "token", { max: 200 });
  const newPassword = readPassword(body, "newPassword", MIN_PASSWORD_LENGTH);
  response.json(await authService.resetPassword(token, newPassword));
}

export async function google(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["idToken", "deviceName"]);
  const idToken = readText(body, "idToken", { max: 4096 });
  const client = readSessionClient(request, body);
  const identity = await verifyGoogleIdToken(idToken);
  const { created, ...result } = await authService.googleSignIn(identity, client);
  response.status(created ? 201 : 200).json(result);
}
