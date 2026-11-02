import { HttpError } from "../../http/errors.js";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const TIMEOUT_MS = 5000;

export type GoogleIdentity = { subject: string; email: string | null; emailVerified: boolean; name: string | null };

function unavailable(): HttpError {
  return new HttpError(503, "GOOGLE_SIGN_IN_UNAVAILABLE", "Google sign-in is not available right now.");
}

function invalidToken(): HttpError {
  return new HttpError(401, "INVALID_GOOGLE_TOKEN", "The Google sign-in could not be verified.");
}

function allowedClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}

/** Verifies a Google ID token with the `tokeninfo` endpoint and the configured client IDs. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const clientIds = allowedClientIds();
  if (clientIds.length === 0) throw unavailable();

  let response: globalThis.Response;
  try {
    response = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw unavailable();
  }

  if (response.status >= 500) throw unavailable();
  if (!response.ok) throw invalidToken();

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) throw invalidToken();

  const { aud, iss, exp, sub, email, email_verified: emailVerified, name } = payload;
  const expiresAt = Number(exp);
  const valid =
    typeof aud === "string" &&
    clientIds.includes(aud) &&
    typeof iss === "string" &&
    ISSUERS.has(iss) &&
    Number.isFinite(expiresAt) &&
    expiresAt * 1000 > Date.now() &&
    typeof sub === "string" &&
    sub.length > 0;
  if (!valid) throw invalidToken();

  return {
    subject: sub,
    email: typeof email === "string" ? email.toLowerCase() : null,
    emailVerified: emailVerified === true || emailVerified === "true",
    name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : null,
  };
}
