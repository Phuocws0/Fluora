import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { generateToken, hashToken } from "./credentials.js";

export type TokenPurpose = "email_verification" | "password_reset";

const LIFETIME_MS: Record<TokenPurpose, number> = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 30 * 60 * 1000,
};

const MAX_TOKEN_LENGTH = 200;

type Db = Prisma.TransactionClient | typeof prisma;

/** Builds a nested `authTokens.create` input plus the raw token, which is returned only once. */
export function newTokenData(purpose: TokenPurpose) {
  const token = generateToken();
  return { token, data: { purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LIFETIME_MS[purpose]) } };
}

/** Invalidates older unused tokens for the same purpose, then stores a new one. */
export async function issueToken(db: Db, userId: string, purpose: TokenPurpose): Promise<string> {
  await db.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  const { token, data } = newTokenData(purpose);
  await db.authToken.create({ data: { ...data, userId } });
  return token;
}

/**
 * Marks a token used and returns its owner. The conditional update makes concurrent use safe:
 * only one request can flip `usedAt` from null.
 */
export async function consumeToken(db: Db, rawToken: string, purpose: TokenPurpose): Promise<string> {
  const invalid = new HttpError(400, "INVALID_TOKEN", "The link or code is not valid.");
  if (rawToken.length === 0 || rawToken.length > MAX_TOKEN_LENGTH) throw invalid;

  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const claimed = await db.authToken.updateMany({
    where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  const row = await db.authToken.findUnique({ where: { tokenHash }, select: { userId: true, purpose: true } });
  if (!row || row.purpose !== purpose) throw invalid;
  if (claimed.count === 0) throw new HttpError(410, "TOKEN_EXPIRED", "This link or code has expired or was already used.");
  return row.userId;
}

/** Local-demo delivery: the only place a raw token is written (read with `docker compose logs backend`). */
export function logDevMail(email: string, purpose: TokenPurpose, token: string): void {
  console.info(`[dev-mail] ${purpose} for ${email}: ${token}`);
}
