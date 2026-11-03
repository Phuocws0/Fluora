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

export type ExerciseAnswerPayload =
  | { kind: "choice"; optionId: string }
  | { kind: "sentence_tiles"; tokens: string[] }
  | { kind: "transcript_gap" | "dictation"; text: string }
  | { kind: "matching"; pairs: Array<{ left: string; right: string }> }
  | { kind: "speaking"; transcript: string; score: number };

export type ExerciseAnswerResult = {
  isCorrect: boolean;
  feedback: string;
  explanation?: string | null;
  score: number;
  speakingScorecard?: {
    overall: number;
    transcript: string;
  };
};

export type UserAnswerHistoryItem = {
  id: string;
  exerciseId: string;
  answer: unknown;
  isCorrect: boolean;
  score: number;
  feedback: string;
  createdAt: string;
};

export type LessonAnswersResult = {
  answers: UserAnswerHistoryItem[];
};

export type ExerciseHintResult = {
  step: number;
  text: string;
};

export type LessonCompletionResult = {
  lessonId: string;
  completedAt: string;
  xpEarned: number;
  alreadyCompleted: boolean;
};

export type HomeSummary = {
  course: {
    id: string;
    title: string;
    language: string;
    level: string;
  } | null;
  progress: {
    completedLessonIds: string[];
    completedLessons: number;
    currentStreak: number;
    xp: number;
    gems: number;
    lastCompletedLesson: {
      lessonId: string;
      completedAt: string;
    } | null;
  };
  streak: number;
  wallet: {
    gems: number;
  };
};

export type SkillBaselineResult = {
  level: string;
  skills: Array<{ skill: string; confidence: number; attempts: number }>;
  source: "answers" | "placement";
};

export type PlannerInput = {
  date: string;
  time: string;
  durationMinutes: number;
  label?: string | null;
};

export type PlannerEntry = {
  id: string;
  userId: string;
  date: string;
  time: string;
  durationMinutes: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceInput = {
  kind: string;
  summary: string;
  reference?: string | null;
};

export type LearningEvidence = {
  id: string;
  userId: string;
  goalId: string;
  kind: string;
  summary: string;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanDoGoal = {
  id: string;
  slug: string;
  title: string;
  description: string;
  skill: string;
  evidence: LearningEvidence[];
};

export type MissionPassportItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  requiredLessonId: string | null;
  completedAt: string | null;
};

export type MissionDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  requiredLessonId: string | null;
};

export type MissionCompletionResult = {
  completion: {
    id: string;
    userId: string;
    missionId: string;
    completedAt: string;
  };
};

export type MisconceptionItem = {
  id: string;
  exerciseId: string;
  prompt: string;
  type: string;
  explanation: string | null;
  lesson: {
    title: string;
    skill: string;
  };
  mistakeCount: number;
  dismissed: boolean;
};
