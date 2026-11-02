import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { hashPassword, verifyPassword } from "./credentials.js";

export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  passwordHash: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUser = {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  createdAt: Date;
};

/** Converts a user row to the API shape. Credential columns are reduced to booleans. */
export function toPublicUser(row: PublicUserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    emailVerified: row.emailVerifiedAt !== null,
    hasPassword: row.passwordHash !== null,
    createdAt: row.createdAt,
  };
}

function sessionGone(): HttpError {
  return new HttpError(401, "UNAUTHORIZED", "A valid session is required.");
}

export async function getUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw sessionGone();
  return toPublicUser(user);
}

export type ProfileUpdate = { displayName?: string; bio?: string | null; avatarUrl?: string | null };

export async function updateProfile(userId: string, input: ProfileUpdate): Promise<PublicUser> {
  const result = await prisma.user.updateMany({ where: { id: userId }, data: input });
  if (result.count === 0) throw sessionGone();
  return getUser(userId);
}

/**
 * Changes the password and signs out every other device. Google-only accounts (no password yet)
 * may set one without `currentPassword`.
 */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: { currentPassword?: string; newPassword: string },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw sessionGone();

  if (user.passwordHash !== null) {
    if (input.currentPassword === undefined) {
      throw new HttpError(400, "VALIDATION_ERROR", "currentPassword is required.");
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "The current password is incorrect.");
    }
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
  ]);
}
