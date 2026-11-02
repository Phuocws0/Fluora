import { prisma } from "../../db/prisma.js";
import type { Prisma, UserSettings } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const PROGRESS_VISIBILITY = ["public", "friends", "private"] as const;
export const TEXT_SIZES = ["default", "large", "extra_large"] as const;

export type ProgressVisibility = (typeof PROGRESS_VISIBILITY)[number];

export type LearnerSettings = Omit<UserSettings, "userId" | "onboardingCompletedAt"> & { onboardingCompleted: boolean };

/** Writable columns validated by the controller. `onboardingCompletedAt` is set separately. */
export type SettingsUpdate = Omit<Prisma.UserSettingsUncheckedUpdateInput, "userId" | "updatedAt" | "onboardingCompletedAt">;

/** Column defaults restored by `DELETE /users/me/settings`. Onboarding fields are kept (#3 plan §5.3). */
const RESETTABLE_DEFAULTS = {
  appLanguage: "en",
  motivation: null,
  dailyGoalMinutes: null,
  dailyTimeBudgetMinutes: null,
  learningPromise: null,
  reminderEnabled: false,
  reminderTime: null,
  reminderDays: [],
  timezone: null,
  notifyFriendRequests: true,
  notifyRewards: true,
  notifyReminders: true,
  floCompanion: null,
  progressVisibility: "friends",
  discoverable: true,
  saveTutorHistory: true,
  textSize: "default",
  reducedMotion: false,
  captions: false,
  focusMode: false,
  lowBandwidth: false,
  wellbeingTimerMinutes: null,
} satisfies SettingsUpdate;

function toLearnerSettings(row: UserSettings): LearnerSettings {
  const { userId: _userId, onboardingCompletedAt, ...settings } = row;
  return { ...settings, onboardingCompleted: onboardingCompletedAt !== null };
}

/** Returns the learner's settings row, creating it with defaults when it is missing. */
async function ensureRow(userId: string, client: Prisma.TransactionClient | typeof prisma = prisma): Promise<UserSettings> {
  return client.userSettings.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function getSettings(userId: string): Promise<LearnerSettings> {
  return toLearnerSettings(await ensureRow(userId));
}

export async function updateSettings(userId: string, input: SettingsUpdate, completeOnboarding: boolean): Promise<LearnerSettings> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await ensureRow(userId, tx);
    const reminderEnabled = input.reminderEnabled === undefined ? current.reminderEnabled : input.reminderEnabled;
    const reminderTime = input.reminderTime === undefined ? current.reminderTime : input.reminderTime;
    if (reminderEnabled === true && !reminderTime) {
      throw new HttpError(400, "VALIDATION_ERROR", "reminderTime is required when reminderEnabled is true.");
    }

    return tx.userSettings.update({
      where: { userId },
      data: {
        ...input,
        ...(completeOnboarding && current.onboardingCompletedAt === null ? { onboardingCompletedAt: new Date() } : {}),
      },
    });
  });

  return toLearnerSettings(row);
}

export async function resetSettings(userId: string): Promise<LearnerSettings> {
  await ensureRow(userId);
  return toLearnerSettings(await prisma.userSettings.update({ where: { userId }, data: RESETTABLE_DEFAULTS }));
}

export type PrivacySettings = { discoverable: boolean; progressVisibility: ProgressVisibility; saveTutorHistory: boolean };

const DEFAULT_PRIVACY: PrivacySettings = { discoverable: true, progressVisibility: "friends", saveTutorHistory: true };

function asVisibility(value: string): ProgressVisibility {
  return (PROGRESS_VISIBILITY as readonly string[]).includes(value) ? (value as ProgressVisibility) : "friends";
}

/** Privacy choices for several learners. Learners without a settings row get the defaults. */
export async function getPrivacySettings(userIds: string[]): Promise<Map<string, PrivacySettings>> {
  const rows = await prisma.userSettings.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
    select: { userId: true, discoverable: true, progressVisibility: true, saveTutorHistory: true },
  });
  const byId = new Map(rows.map((row) => [row.userId, { ...row, progressVisibility: asVisibility(row.progressVisibility) }]));
  return new Map(userIds.map((id) => [id, byId.get(id) ?? DEFAULT_PRIVACY]));
}

export type NotificationPreferences = Pick<
  UserSettings,
  "notifyFriendRequests" | "notifyRewards" | "notifyReminders" | "reminderEnabled" | "reminderTime" | "reminderDays" | "timezone"
>;

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await ensureRow(userId);
  return {
    notifyFriendRequests: row.notifyFriendRequests,
    notifyRewards: row.notifyRewards,
    notifyReminders: row.notifyReminders,
    reminderEnabled: row.reminderEnabled,
    reminderTime: row.reminderTime,
    reminderDays: row.reminderDays,
    timezone: row.timezone,
  };
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
