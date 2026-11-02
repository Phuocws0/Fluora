import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import { HttpError } from "../../http/errors.js";
import { publicUserSelect, toPublicUser, type PublicUser } from "./account.service.js";
import { consumeToken, issueToken, logDevMail, newTokenData } from "./auth-token.service.js";
import { hashPassword, verifyAgainstDummyHash, verifyPassword } from "./credentials.js";
import type { GoogleIdentity } from "./google.js";
import { createSession, newSessionData, type SessionClient } from "./session.service.js";

export type AuthResult = { token: string; user: PublicUser };

function invalidCredentials(): HttpError {
  return new HttpError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
}

function emailTaken(): HttpError {
  return new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");
}

/** Creates the account, default settings, first session, and a verification token in one nested write. */
export async function register(
  input: { email: string; password: string; displayName: string },
  client: SessionClient,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  const session = newSessionData(client);
  const verification = newTokenData("email_verification");

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        settings: { create: {} },
        sessions: { create: session.data },
        authTokens: { create: verification.data },
      },
      select: publicUserSelect,
    });

    logDevMail(user.email, "email_verification", verification.token);
    return { token: session.token, user: toPublicUser(user) };
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
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

export async function verifyEmail(token: string): Promise<{ verified: true }> {
  await prisma.$transaction(async (tx) => {
    const userId = await consumeToken(tx, token, "email_verification");
    await tx.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  });
  return { verified: true };
}

export async function resendVerification(userId: string): Promise<{ sent: true }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  if (!user) throw new HttpError(401, "UNAUTHORIZED", "A valid session is required.");
  if (user.emailVerifiedAt) throw new HttpError(409, "ALREADY_VERIFIED", "This email address is already verified.");

  const token = await prisma.$transaction((tx) => issueToken(tx, userId, "email_verification"));
  logDevMail(user.email, "email_verification", token);
  return { sent: true };
}

/** Always succeeds so the response doesn't reveal whether an account exists. */
export async function forgotPassword(email: string): Promise<{ accepted: true }> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    const token = await prisma.$transaction((tx) => issueToken(tx, user.id, "password_reset"));
    logDevMail(user.email, "password_reset", token);
  }
  return { accepted: true };
}

/** Sets a new password, proves the email address, and signs out every device. */
export async function resetPassword(token: string, newPassword: string): Promise<{ updated: true }> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    const userId = await consumeToken(tx, token, "password_reset");
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }) },
    });
    await tx.session.deleteMany({ where: { userId } });
  });
  return { updated: true };
}

/**
 * Signs in with a verified Google identity: match by Google subject, then link a verified email,
 * otherwise create a password-less account.
 */
export async function googleSignIn(identity: GoogleIdentity, client: SessionClient): Promise<AuthResult & { created: boolean }> {
  const bySubject = await prisma.user.findUnique({ where: { googleSubject: identity.subject }, select: publicUserSelect });
  if (bySubject) {
    return { token: await createSession(bySubject.id, client), user: toPublicUser(bySubject), created: false };
  }

  if (!identity.email) throw new HttpError(401, "INVALID_GOOGLE_TOKEN", "The Google account has no email address.");

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email }, select: { id: true, emailVerifiedAt: true } });
  if (byEmail) {
    if (!identity.emailVerified) throw emailTaken();
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { googleSubject: identity.subject, ...(byEmail.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }) },
      select: publicUserSelect,
    });
    return { token: await createSession(user.id, client), user: toPublicUser(user), created: false };
  }

  const session = newSessionData(client);
  try {
    const user = await prisma.user.create({
      data: {
        email: identity.email,
        displayName: identity.name ?? identity.email.split("@")[0]?.slice(0, 50) ?? "Learner",
        googleSubject: identity.subject,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
        settings: { create: {} },
        sessions: { create: session.data },
      },
      select: publicUserSelect,
    });
    return { token: session.token, user: toPublicUser(user), created: true };
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}
