import { HttpError } from "./errors.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type JsonBody = Record<string, unknown>;

function invalid(message: string): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", message);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function readUuidParam(value: unknown, name: string): string {
  if (!isUuid(value)) throw invalid(`${name} must be a valid UUID.`);
  return value;
}

/** Requires a JSON object body and rejects fields outside `allowedKeys`. */
export function readBody(value: unknown, allowedKeys: readonly string[]): JsonBody {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid("The request body must be a JSON object.");
  }

  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) throw invalid(`Unknown field: ${unknownKey}.`);

  return value as JsonBody;
}

export function requireSomeField(body: JsonBody): void {
  if (Object.keys(body).length === 0) throw invalid("Provide at least one field to update.");
}

type TextRule = { min?: number; max: number };

/** Reads a trimmed string. Returns `undefined` when the field is absent. */
export function readOptionalText(body: JsonBody, key: string, rule: TextRule): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalid(`${key} must be a string.`);

  const text = value.trim();
  const min = rule.min ?? 1;
  if (text.length < min || text.length > rule.max) {
    throw invalid(`${key} must be between ${min} and ${rule.max} characters.`);
  }

  return text;
}

export function readText(body: JsonBody, key: string, rule: TextRule): string {
  const text = readOptionalText(body, key, rule);
  if (text === undefined) throw invalid(`${key} is required.`);
  return text;
}

/** Reads a trimmed string or `null`; an empty string is stored as `null`. */
export function readNullableText(body: JsonBody, key: string, max: number): string | null | undefined {
  const value = body[key];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") throw invalid(`${key} must be a string or null.`);

  const text = value.trim();
  if (text.length > max) throw invalid(`${key} must be at most ${max} characters.`);
  return text || null;
}

export function readNullableHttpUrl(body: JsonBody, key: string, max: number): string | null | undefined {
  const text = readNullableText(body, key, max);
  if (!text) return text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw invalid(`${key} must be an http or https URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw invalid(`${key} must be an http or https URL.`);
  }

  return text;
}

/** Reads, trims, and lowercases an email address. */
export function readEmail(body: JsonBody, key: string): string {
  const email = readText(body, key, { max: 254 }).toLowerCase();
  if (!emailPattern.test(email)) throw invalid(`${key} must be a valid email address.`);
  return email;
}

/** Reads a password without trimming it, so leading or trailing spaces stay significant. */
export function readPassword(body: JsonBody, key: string, min: number): string {
  const value = body[key];
  if (value === undefined) throw invalid(`${key} is required.`);
  if (typeof value !== "string") throw invalid(`${key} must be a string.`);
  if (value.length < min || value.length > 128) {
    throw invalid(`${key} must be between ${min} and 128 characters.`);
  }

  return value;
}
