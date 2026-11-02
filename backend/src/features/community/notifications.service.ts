import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { createdBefore, toPage, type PageQuery } from "../../http/pagination.js";
import { getNotificationPreferences } from "../identity/settings.service.js";

export type NotificationType =
  | "friend_request_received"
  | "friend_request_accepted"
  | "reward_earned"
  | "reward_redeemed"
  | "study_reminder";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonObject;
  dedupeKey: string;
};

/** The single creation path. Respects the learner's notification preferences and never duplicates a key. */
export async function notify(input: NotificationInput): Promise<void> {
  const preferences = await getNotificationPreferences(input.userId);
  const allowed =
    input.type.startsWith("friend_") ? preferences.notifyFriendRequests
    : input.type.startsWith("reward_") ? preferences.notifyRewards
    : preferences.notifyReminders;
  if (!allowed) return;

  await prisma.notification.createMany({
    data: [{ userId: input.userId, type: input.type, title: input.title, body: input.body, data: input.data ?? {}, dedupeKey: input.dedupeKey }],
    skipDuplicates: true,
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));
  const second = Number(part("second"));
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    weekday: WEEKDAYS.indexOf(part("weekday")),
    minutes: hour * 60 + minute,
    midnight: new Date(now.getTime() - ((hour * 60 + minute) * 60 + second) * 1000 - now.getMilliseconds()),
  };
}

/**
 * Lazy study reminder: created when the learner opens notifications after their reminder time on a
 * reminder day and hasn't completed a lesson today. No scheduler is involved.
 */
export async function ensureStudyReminder(userId: string, now = new Date()): Promise<void> {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.reminderEnabled || !preferences.notifyReminders || !preferences.reminderTime) return;

  const clock = localClock(now, preferences.timezone ?? "UTC");
  const [hours, minutes] = preferences.reminderTime.split(":").map(Number);
  if (preferences.reminderDays.length > 0 && !preferences.reminderDays.includes(clock.weekday)) return;
  if (clock.minutes < (hours ?? 0) * 60 + (minutes ?? 0)) return;

  const studied = await prisma.lessonCompletion.count({ where: { userId, completedAt: { gte: clock.midnight } } });
  if (studied > 0) return;

  await notify({
    userId,
    type: "study_reminder",
    title: "Time to practise",
    body: "A short lesson keeps your streak growing.",
    data: { date: clock.date },
    dedupeKey: `study_reminder:${clock.date}`,
  });
}

const notificationSelect = { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true } satisfies Prisma.NotificationSelect;

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

function toNotification({ readAt, ...row }: NotificationRow) {
  return { ...row, read: readAt !== null };
}

export async function listNotifications(userId: string, options: { unreadOnly: boolean; page: PageQuery }) {
  await ensureStudyReminder(userId);
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(options.unreadOnly ? { readAt: null } : {}), ...createdBefore(options.page) },
      orderBy: { createdAt: "desc" },
      take: options.page.limit + 1,
      select: notificationSelect,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const page = toPage(rows, options.page);
  return { notifications: page.items.map(toNotification), unreadCount, nextBefore: page.nextBefore };
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { updatedCount: result.count };
}

export async function setRead(userId: string, notificationId: string, read: boolean) {
  const result = await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: read ? new Date() : null } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "Notification not found.");
  const row = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId }, select: notificationSelect });
  return { notification: toNotification(row) };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const result = await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "Notification not found.");
  return { deleted: true };
}

export async function clearNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({ where: { userId } });
  return { deletedCount: result.count };
}
