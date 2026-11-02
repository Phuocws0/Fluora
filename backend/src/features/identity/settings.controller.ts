import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import {
  readBody,
  readNullableEnum,
  readNullableInt,
  readNullablePattern,
  readNullableText,
  readOptionalBoolean,
  readOptionalEnum,
  requireSomeField,
  validationError,
  type JsonBody,
} from "../../http/validation.js";
import * as settings from "./settings.service.js";

const LANGUAGE = /^[a-z]{2}(-[A-Z]{2})?$/;
const SLUG = /^[a-z0-9_-]{1,40}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const BOOLEAN_FIELDS = [
  "reminderEnabled",
  "notifyFriendRequests",
  "notifyRewards",
  "notifyReminders",
  "discoverable",
  "saveTutorHistory",
  "reducedMotion",
  "captions",
  "focusMode",
  "lowBandwidth",
] as const;

const ALLOWED_FIELDS = [
  ...BOOLEAN_FIELDS,
  "appLanguage",
  "courseLanguage",
  "motivation",
  "startingLevel",
  "dailyGoalMinutes",
  "dailyTimeBudgetMinutes",
  "learningPromise",
  "reminderTime",
  "reminderDays",
  "timezone",
  "floCompanion",
  "progressVisibility",
  "textSize",
  "wellbeingTimerMinutes",
  "onboardingCompleted",
] as const;

function readReminderDays(body: JsonBody): number[] | undefined {
  const value = body.reminderDays;
  if (value === undefined) return undefined;
  const valid =
    Array.isArray(value) &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(value).size === value.length;
  if (!valid) throw validationError("reminderDays must be a list of unique days from 0 (Sunday) to 6 (Saturday).");
  return [...(value as number[])].sort((a, b) => a - b);
}

function readTimeZone(body: JsonBody): string | null | undefined {
  const value = readNullableText(body, "timezone", 64);
  if (value && !settings.isValidTimeZone(value)) throw validationError("timezone must be an IANA time zone such as Asia/Ho_Chi_Minh.");
  return value;
}

/** Validates the whole body before anything is written. */
function readSettingsUpdate(body: JsonBody): settings.SettingsUpdate {
  const update: settings.SettingsUpdate = {};
  for (const key of BOOLEAN_FIELDS) {
    const value = readOptionalBoolean(body, key);
    if (value !== undefined) update[key] = value;
  }

  const appLanguage = readNullablePattern(body, "appLanguage", LANGUAGE, "a language code such as en or vi");
  if (appLanguage === null) throw validationError("appLanguage cannot be null.");
  const fields: settings.SettingsUpdate = {
    appLanguage,
    courseLanguage: readNullablePattern(body, "courseLanguage", LANGUAGE, "a language code such as en or vi"),
    motivation: readNullablePattern(body, "motivation", SLUG, "a short slug"),
    startingLevel: readNullableEnum(body, "startingLevel", settings.LEVELS),
    dailyGoalMinutes: readNullableInt(body, "dailyGoalMinutes", { min: 1, max: 240 }),
    dailyTimeBudgetMinutes: readNullableInt(body, "dailyTimeBudgetMinutes", { min: 1, max: 240 }),
    learningPromise: readNullableText(body, "learningPromise", 200),
    reminderTime: readNullablePattern(body, "reminderTime", TIME, "a 24-hour time such as 19:30"),
    reminderDays: readReminderDays(body),
    timezone: readTimeZone(body),
    floCompanion: readNullablePattern(body, "floCompanion", SLUG, "a short slug"),
    progressVisibility: readOptionalEnum(body, "progressVisibility", settings.PROGRESS_VISIBILITY),
    textSize: readOptionalEnum(body, "textSize", settings.TEXT_SIZES),
    wellbeingTimerMinutes: readNullableInt(body, "wellbeingTimerMinutes", { min: 5, max: 180 }),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) (update as Record<string, unknown>)[key] = value;
  }

  return update;
}

export async function getSettings(_request: Request, response: Response): Promise<void> {
  response.json({ settings: await settings.getSettings(currentUserId(response)) });
}

export async function updateSettings(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ALLOWED_FIELDS);
  requireSomeField(body);

  const onboardingCompleted = readOptionalBoolean(body, "onboardingCompleted");
  if (onboardingCompleted === false) throw validationError("onboardingCompleted can only be set to true.");

  const update = readSettingsUpdate(body);
  response.json({ settings: await settings.updateSettings(currentUserId(response), update, onboardingCompleted === true) });
}

export async function resetSettings(_request: Request, response: Response): Promise<void> {
  response.json({ settings: await settings.resetSettings(currentUserId(response)) });
}
