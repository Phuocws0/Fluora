import { prisma } from "../../db/prisma.js";
import { generateToken, hashToken } from "./credentials.js";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const MAX_TOKEN_LENGTH = 200;

export type SessionClient = { deviceName?: string; userAgent?: string };

export type SessionSummary = {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  current: boolean;
};

function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + SESSION_LIFETIME_MS);
}

/** Builds the nested `sessions.create` input and the raw token returned once to the client. */
export function newSessionData(client: SessionClient) {
  const token = generateToken();
  return {
    token,
    data: {
      tokenHash: hashToken(token),
      deviceName: client.deviceName ?? null,
      userAgent: client.userAgent ?? null,
      expiresAt: expiryFrom(new Date()),
    },
  };
}

export async function createSession(userId: string, client: SessionClient): Promise<string> {
  const { token, data } = newSessionData(client);
  await prisma.session.create({ data: { ...data, userId } });
  return token;
}

/** Resolves a bearer token to an active session. Expired sessions are deleted; active ones slide forward. */
export async function findActiveSession(token: string): Promise<{ id: string; userId: string } | null> {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, lastUsedAt: true, expiresAt: true },
  });
  if (!session) return null;

  const now = new Date();
  if (session.expiresAt <= now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.updateMany({
      where: { id: session.id },
      data: { lastUsedAt: now, expiresAt: expiryFrom(now) },
    });
  }

  return { id: session.id, userId: session.userId };
}

export async function listSessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, deviceName: true, userAgent: true, createdAt: true, lastUsedAt: true },
  });

  return sessions.map((session) => ({ ...session, current: session.id === currentSessionId }));
}

/** Returns false when the session does not exist or belongs to another learner. */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  return result.count > 0;
}
