import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../http/errors.js";
import { publicUserSelect, toPublicUser, type PublicUser } from "./account.service.js";
import { hashPassword, verifyAgainstDummyHash, verifyPassword } from "./credentials.js";
import { createSession, newSessionData, type SessionClient } from "./session.service.js";

export type AuthResult = { token: string; user: PublicUser };

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function invalidCredentials(): HttpError {
  return new HttpError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
}

/** Creates the account, its default settings row, and the first session in one nested write. */
export async function register(
  input: { email: string; password: string; displayName: string },
  client: SessionClient,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  const session = newSessionData(client);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        settings: { create: {} },
        sessions: { create: session.data },
      },
      select: publicUserSelect,
    });

    return { token: session.token, user: toPublicUser(user) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }
    throw error;
  }
}

/** Unknown emails, wrong passwords, and Google-only accounts all return the same 401. */
export async function login(input: { email: string; password: string }, client: SessionClient): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email }, select: publicUserSelect });

  if (!user?.passwordHash) {
    await verifyAgainstDummyHash(input.password);
    throw invalidCredentials();
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) throw invalidCredentials();

  const token = await createSession(user.id, client);
  return { token, user: toPublicUser(user) };
}
