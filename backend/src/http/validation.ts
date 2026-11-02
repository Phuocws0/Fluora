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

export function validationError(message: string): HttpError {
  return invalid(message);
}

export function readOptionalBoolean(body: JsonBody, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw invalid(`${key} must be true or false.`);
  return value;
}

type IntRule = { min: number; max: number };

export function readOptionalInt(body: JsonBody, key: string, rule: IntRule): number | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < rule.min || value > rule.max) {
    throw invalid(`${key} must be a whole number from ${rule.min} to ${rule.max}.`);
  }
  return value;
}

export function readInt(body: JsonBody, key: string, rule: IntRule): number {
  const value = readOptionalInt(body, key, rule);
  if (value === undefined) throw invalid(`${key} is required.`);
  return value;
}

export function readNullableInt(body: JsonBody, key: string, rule: IntRule): number | null | undefined {
  if (body[key] === null) return null;
  return readOptionalInt(body, key, rule);
}

export function readOptionalEnum<T extends string>(body: JsonBody, key: string, values: readonly T[]): T | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) {
    throw invalid(`${key} must be one of: ${values.join(", ")}.`);
  }
  return value as T;
}

export function readNullableEnum<T extends string>(body: JsonBody, key: string, values: readonly T[]): T | null | undefined {
  if (body[key] === null) return null;
  return readOptionalEnum(body, key, values);
}

/** Reads a string that must match `pattern`, or `null`. */
export function readNullablePattern(body: JsonBody, key: string, pattern: RegExp, description: string): string | null | undefined {
  const value = body[key];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string" || !pattern.test(value)) throw invalid(`${key} must be ${description}.`);
  return value;
}

function parseDate(value: unknown, key: string): Date {
  if (typeof value !== "string" || value.length > 40) throw invalid(`${key} must be an ISO 8601 date-time.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalid(`${key} must be an ISO 8601 date-time.`);
  return date;
}

export function readOptionalDate(body: JsonBody, key: string): Date | undefined {
  return body[key] === undefined ? undefined : parseDate(body[key], key);
}

export function readNullableDate(body: JsonBody, key: string): Date | null | undefined {
  if (body[key] === null) return null;
  return readOptionalDate(body, key);
}

/** Reads one optional query-string value. Repeated parameters are rejected. */
export function readQueryText(query: unknown, key: string, rule: TextRule): string | undefined {
  const record = (query ?? {}) as Record<string, unknown>;
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalid(`${key} must be a single value.`);
  return readOptionalText({ [key]: value }, key, rule);
}
