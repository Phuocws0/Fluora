import { getJson } from "../../services/api";

export type LearningProgress = {
  completedLessons: number;
  currentStreak: number;
  xp: number;
  gems: number;
};

export type WeeklyLearningAnalytics = {
  days: Array<{ date: string; xp: number; answers: number }>;
  summary: { xp: number; answers: number; completedLessons: number };
};

export async function getLearningProgress(): Promise<LearningProgress> {
  return getJson<LearningProgress>("/progress");
}

export async function getWeeklyLearningAnalytics(): Promise<WeeklyLearningAnalytics> {
  return getJson<WeeklyLearningAnalytics>("/analytics/weekly");
}
