/** UTC periods shared by daily quests and the weekly League, consistent with #27's UTC streak. */
export type Period = { key: string; startsAt: Date; endsAt: Date };

export function currentDay(now = new Date()): Period {
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
  return { key: startsAt.toISOString().slice(0, 10), startsAt, endsAt };
}

/** Monday 00:00 UTC to the next Monday. */
export function currentWeek(now = new Date()): Period {
  const day = currentDay(now).startsAt;
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  const startsAt = new Date(day.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key: startsAt.toISOString().slice(0, 10), startsAt, endsAt };
}
