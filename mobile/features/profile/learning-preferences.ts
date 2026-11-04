export function lessonTextScale(size: string | undefined): number {
  return size === "extra_large" ? 1.4 : size === "large" ? 1.2 : 1;
}

/** Background time and an open reminder do not count as foreground study time. */
export function addStudyTime(elapsedMs: number, deltaMs: number, active: boolean, reminding: boolean): number {
  return active && !reminding ? elapsedMs + Math.max(0, deltaMs) : elapsedMs;
}

export function breakIsDue(elapsedMs: number, intervalMinutes: number | null | undefined): boolean {
  return typeof intervalMinutes === "number" && intervalMinutes >= 5 && elapsedMs >= intervalMinutes * 60000;
}
