import { getJson } from "../../services/api";
import type {
  CourseOverview,
  CourseSummary,
  LearningPath,
  LessonOverview,
  LessonSummary,
  UnitOverview,
} from "../../types/learning";

export async function getCourses(): Promise<CourseSummary[]> {
  const result = await getJson<{ courses: CourseSummary[] }>("/courses");
  return result.courses;
}

export async function getCourse(courseId: string): Promise<CourseOverview> {
  const result = await getJson<{ course: CourseOverview }>(`/courses/${courseId}`);
  return result.course;
}

export async function getUnit(unitId: string): Promise<UnitOverview> {
  const result = await getJson<{ unit: UnitOverview }>(`/units/${unitId}`);
  return result.unit;
}

export async function getLesson(lessonId: string): Promise<LessonOverview> {
  const result = await getJson<{ lesson: LessonOverview }>(`/lessons/${lessonId}`);
  return result.lesson;
}

export async function searchLessons(filters: {
  query: string;
  level: string;
  skill: string;
  minutes: string;
}): Promise<LessonSummary[]> {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.level) params.set("level", filters.level);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.minutes) params.set("minutes", filters.minutes);

  const query = params.toString();
  const result = await getJson<{ lessons: LessonSummary[] }>(`/lessons/search${query ? `?${query}` : ""}`);
  return result.lessons;
}

export async function getLearningPaths(): Promise<LearningPath[]> {
  const result = await getJson<{ paths: LearningPath[] }>("/learning-paths");
  return result.paths;
}

export async function compareLearningPaths(ids: string[]): Promise<LearningPath[]> {
  const result = await getJson<{ paths: LearningPath[] }>(
    `/learning-paths/compare?ids=${encodeURIComponent(ids.join(","))}`,
  );
  return result.paths;
}
