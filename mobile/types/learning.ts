export type LearningPathSummary = {
  id: string;
  slug: string;
  title: string;
};

export type LearningPath = LearningPathSummary & {
  summary: string;
  careerGoal: string;
  targetLanguage: string;
  level: string;
  estimatedMinutes: number;
  estimatedWeeks: number | null;
  outcomes: string[];
  course: { id: string; slug: string; title: string };
};

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: string;
  level: string;
  estimatedMinutes: number;
  unitCount: number;
  lessonCount: number;
  learningPaths: LearningPathSummary[];
};

export type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  skill: string;
  level: string;
  durationMinutes: number;
  order: number;
  unit: { id: string; slug: string; title: string; course: { id: string; slug: string; title: string } };
};

export type UnitSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  lessonCount?: number;
};

export type CourseUnit = UnitSummary & {
  lessons: Array<Pick<LessonSummary, "id" | "slug" | "title" | "skill" | "level" | "durationMinutes" | "order">>;
};

export type CourseOverview = Omit<CourseSummary, "unitCount" | "lessonCount"> & { units: CourseUnit[] };

export type UnitOverview = UnitSummary & {
  course: { id: string; slug: string; title: string };
  lessons: Array<Omit<LessonSummary, "unit">>;
};

export type LessonOverview = Omit<LessonSummary, "unit"> & {
  unit: { id: string; slug: string; title: string; course: { id: string; slug: string; title: string } };
  exercises: Array<{
    id: string;
    type: string;
    prompt: string;
    instruction: string | null;
    content: unknown;
    order: number;
    options: Array<{ id: string; label: string; value: string; order: number }>;
  }>;
};
