export type PlacementOption = {
  id: string;
  label: string;
};

export type PlacementQuestion = {
  id: string;
  skill: "vocabulary" | "grammar" | "reading" | "listening";
  prompt: string;
  options: PlacementOption[];
};

export type PlacementQuestionsResponse = {
  version: number;
  questions: PlacementQuestion[];
};

export type SkillScore = {
  skill: string;
  score: number;
  correct: number;
  total: number;
};

export type PlacementAttemptResult = {
  attemptId: string | null;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  skillBaseline: SkillScore[];
};

export type LearnerSettings = {
  appLanguage: string;
  courseLanguage: string | null;
  motivation: string | null;
  startingLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  dailyGoalMinutes: number | null;
  dailyTimeBudgetMinutes: number | null;
  learningPromise: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderDays: number[];
  timezone: string | null;
  notifyFriendRequests: boolean;
  notifyRewards: boolean;
  notifyReminders: boolean;
  floCompanion: string | null;
  progressVisibility: "public" | "friends" | "private";
  discoverable: boolean;
  saveTutorHistory: boolean;
  textSize: "default" | "large" | "extra_large";
  reducedMotion: boolean;
  captions: boolean;
  focusMode: boolean;
  lowBandwidth: boolean;
  wellbeingTimerMinutes: number | null;
  onboardingCompleted: boolean;
  updatedAt: string;
};

export type OnboardingDraft = {
  appLanguage: string;
  courseLanguage: string;
  motivation: string | null;
  startingLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  placementAttempt: PlacementAttemptResult | null;
  placementAnswers: Array<{ questionId: string; optionId: string }> | null;
  dailyGoalMinutes: number;
  dailyTimeBudgetMinutes: number;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderDays: number[];
  timezone: string;
  learningPromise: string;
  floCompanion: string | null;
};
