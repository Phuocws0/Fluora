/** Completing a course must not silently turn its first lesson into a new lesson. */
export function firstUnfinishedLesson<T extends { id: string }>(lessons: readonly T[], completedIds: readonly string[]): T | null {
  const completed = new Set(completedIds);
  return lessons.find((lesson) => !completed.has(lesson.id)) ?? null;
}
