import { deleteJson, getJson, patchJson, postJson } from "../../services/api";
import { Platform } from "react-native";

export type Learner = { id: string; email: string; displayName: string | null; bio: string | null; avatarUrl: string | null; hasPassword: boolean };
export type Settings = {
  appLanguage: string;
  reminderEnabled: boolean;
  reminderTime: string | null;
  notifyFriendRequests: boolean;
  notifyRewards: boolean;
  notifyReminders: boolean;
  progressVisibility: "public" | "friends" | "private";
  discoverable: boolean;
  saveTutorHistory: boolean;
  textSize: "default" | "large" | "extra_large";
  reducedMotion: boolean;
  captions: boolean;
  focusMode: boolean;
  lowBandwidth: boolean;
  wellbeingTimerMinutes: number | null;
  dailyGoalMinutes: number | null;
  dailyTimeBudgetMinutes: number | null;
  learningPromise: string | null;
  floCompanion: string | null;
};
export type AccountSession = { id: string; deviceName: string | null; userAgent: string | null; lastUsedAt: string; current: boolean };
export type Article = { id: string; category: string; title: string; body: string };
export type SupportRequest = { id: string; message: string; screenshot: string | null; deviceDetails: { issueCategory?: string; platform?: string; osVersion?: string }; status: "open" | "closed"; createdAt: string; updatedAt: string };
export type DataExport = { id: string; status: string; createdAt: string; updatedAt: string };
export type WeeklyDay = { date: string; xp: number; answers: number };

export const profileService = {
  progress: () => getJson<{ currentStreak: number; xp: number; completedLessons: number; gems?: number }>("/progress"),
  weeklyAnalytics: async () => (await getJson<{ days: WeeklyDay[] }>("/analytics/weekly")).days,
  profile: async () => (await getJson<{ user: Learner }>("/users/me")).user,
  updateProfile: async (input: Partial<Pick<Learner, "displayName" | "bio" | "avatarUrl">>) => (await patchJson<{ user: Learner }>("/users/me", input)).user,
  settings: async () => (await getJson<{ settings: Settings }>("/users/me/settings")).settings,
  updateSettings: async (input: Partial<Settings>) => (await patchJson<{ settings: Settings }>("/users/me/settings", input)).settings,
  resetSettings: async () => (await deleteJson<{ settings: Settings }>("/users/me/settings")).settings,
  sessions: async () => (await getJson<{ sessions: AccountSession[] }>("/users/me/sessions")).sessions,
  revokeSession: (id: string) => deleteJson<{ revoked: boolean }>("/users/me/sessions/" + id),
  changePassword: (currentPassword: string, newPassword: string) => patchJson<{ updated: boolean }>("/users/me/password", { currentPassword, newPassword }),
  logout: () => postJson<{ ok: boolean }>("/auth/logout", {}),
  deleteAccount: (email: string) => deleteJson<{ deleted: boolean }>("/users/me", { confirmEmail: email }),
  clearTutorChats: () => deleteJson<{ deleted: boolean }>("/tutor/chats", { confirm: true }),
  articles: async () => (await getJson<{ articles: Article[] }>("/help/articles")).articles,
  requests: async () => (await getJson<{ requests: SupportRequest[] }>("/support/requests")).requests,
  createRequest: (message: string, screenshot: string | undefined, issueCategory: string) => postJson<{ request: SupportRequest }>("/support/requests", { message, ...(screenshot ? { screenshot } : {}), deviceDetails: { platform: Platform.OS, osVersion: String(Platform.Version), issueCategory } }),
  updateRequest: (id: string, message: string, screenshot: string | null, issueCategory: string) => patchJson<{ request: SupportRequest }>("/support/requests/" + id, { message, screenshot, deviceDetails: { platform: Platform.OS, osVersion: String(Platform.Version), issueCategory } }),
  cancelRequest: (id: string) => deleteJson<{ deleted: boolean }>("/support/requests/" + id),
  exports: async () => (await getJson<{ exports: DataExport[] }>("/users/me/data-exports")).exports,
  createExport: () => postJson<{ exportId: string; status: string }>("/users/me/data-exports", {}),
  exportStatus: async (id: string) => (await getJson<{ export: DataExport }>("/users/me/data-exports/" + id)).export,
  downloadExport: (id: string) => getJson<Record<string, unknown>>("/users/me/data-exports/" + id + "/download"),
  cancelExport: (id: string) => deleteJson<{ deleted: boolean }>("/users/me/data-exports/" + id),
};
