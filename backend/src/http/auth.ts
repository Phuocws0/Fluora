import type { NextFunction, Request, Response } from "express";
import { findActiveSession } from "../features/identity/session.service.js";
import { sendError } from "./errors.js";

/**
 * Resolves an optional `Authorization: Bearer <token>` header into `res.locals.userId` and
 * `res.locals.sessionId`. It never rejects a request: public routes keep working with a stale
 * token, and protected routes enforce identity with `requireUser`.
 */
export async function authenticate(request: Request, response: Response, next: NextFunction): Promise<void> {
  const header = request.get("authorization");
  const match = header ? /^Bearer\s+(\S+)\s*$/i.exec(header) : null;

  if (match) {
    const session = await findActiveSession(match[1]);
    if (session) {
      response.locals.userId = session.userId;
      response.locals.sessionId = session.id;
    }
  }

  next();
}

export function requireUser(_request: Request, response: Response, next: NextFunction): void {
  if (!response.locals.userId || !response.locals.sessionId) {
    sendError(response, 401, "UNAUTHORIZED", "A valid session is required.");
    return;
  }

  next();
}

export function currentUserId(response: Response): string {
  const { userId } = response.locals;
  if (!userId) throw new Error("currentUserId() requires the requireUser middleware.");
  return userId;
}

export function currentSessionId(response: Response): string {
  const { sessionId } = response.locals;
  if (!sessionId) throw new Error("currentSessionId() requires the requireUser middleware.");
  return sessionId;
}
