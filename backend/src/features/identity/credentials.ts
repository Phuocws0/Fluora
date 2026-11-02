import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt cost parameters for new hashes. Stored hashes carry their own parameters.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

type ScryptParams = { N: number; r: number; p: number };

function deriveKey(password: string, salt: Buffer, keyLength: number, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, { ...params, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Returns `scrypt$N$r$p$salt$hash` with base64url-encoded salt and hash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, rawN, rawR, rawP, rawSalt, rawKey] = storedHash.split("$");
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (algorithm !== "scrypt" || !rawSalt || !rawKey || ![N, r, p].every(Number.isSafeInteger)) return false;
  if (N < 2 || N > 2 ** 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  const expected = Buffer.from(rawKey, "base64url");
  if (expected.length === 0) return false;

  const actual = await deriveKey(password, Buffer.from(rawSalt, "base64url"), expected.length, { N, r, p });
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/** Spends the same work as a real check so unknown emails are not revealed by response time. */
export async function verifyAgainstDummyHash(password: string): Promise<void> {
  dummyHash ??= hashPassword("fluora-timing-placeholder");
  await verifyPassword(password, await dummyHash);
}

/** A high-entropy opaque token for sessions and one-time links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored only as SHA-256 hex digests. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
