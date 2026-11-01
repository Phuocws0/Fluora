import type { NextFunction, Request, Response } from "express";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUser(_request: Request, response: Response, next: NextFunction) {
  const userId: unknown = response.locals.userId;
  if (typeof userId !== "string" || !uuid.test(userId)) {
    response.status(401).json({ error: { code: "UNAUTHORIZED", message: "A valid session is required." } });
    return;
  }
  next();
}

export function currentUserId(response: Response): string {
  return response.locals.userId as string;
}
