import { deleteJson, getJson, patchJson, postJson } from "../../services/api";
import type {
  CanDoGoal,
  EvidenceInput,
  ExerciseAnswerPayload,
  ExerciseAnswerResult,
  ExerciseHintResult,
  HomeSummary,
  LearningEvidence,
  LessonAnswersResult,
  LessonCompletionResult,
  MisconceptionItem,
  MissionDetail,
  MissionCompletionResult,
  MissionPassportItem,
  PlannerEntry,
  PlannerInput,
  SkillBaselineResult,
} from "../../types/learning";

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

export async function getHomeSummary(): Promise<HomeSummary> {
  return getJson<HomeSummary>("/home");
}

export async function getLessonAnswers(lessonId: string): Promise<LessonAnswersResult> {
  return getJson<LessonAnswersResult>(`/lessons/${lessonId}/answers`);
}

export async function submitExerciseAnswer(
  exerciseId: string,
  answer: ExerciseAnswerPayload,
): Promise<ExerciseAnswerResult> {
  return postJson<ExerciseAnswerResult>(`/exercises/${exerciseId}/answers`, { answer });
}

export async function getExerciseHint(
  exerciseId: string,
  step: number,
): Promise<ExerciseHintResult> {
  return getJson<ExerciseHintResult>(`/exercises/${exerciseId}/hints?step=${step}`);
}

export async function completeLesson(lessonId: string): Promise<LessonCompletionResult> {
  return postJson<LessonCompletionResult>(`/lessons/${lessonId}/complete`, {});
}

export async function getSkillBaseline(): Promise<SkillBaselineResult> {
  return getJson<SkillBaselineResult>("/learning/skill-baseline");
}

export async function getPlannerEntries(): Promise<PlannerEntry[]> {
  const result = await getJson<{ entries: PlannerEntry[] }>("/planner/entries");
  return result.entries;
}

export async function createPlannerEntry(input: PlannerInput): Promise<PlannerEntry> {
  const result = await postJson<{ entry: PlannerEntry }>("/planner/entries", input);
  return result.entry;
}

export async function getPlannerEntry(id: string): Promise<PlannerEntry> {
  const result = await getJson<{ entry: PlannerEntry }>(`/planner/entries/${id}`);
  return result.entry;
}

export async function updatePlannerEntry(
  id: string,
  input: Partial<PlannerInput>,
): Promise<PlannerEntry> {
  const result = await patchJson<{ entry: PlannerEntry }>(`/planner/entries/${id}`, input);
  return result.entry;
}

export async function deletePlannerEntry(id: string): Promise<boolean> {
  const result = await deleteJson<{ deleted: boolean }>(`/planner/entries/${id}`);
  return result.deleted;
}

export async function getEvidenceList(): Promise<CanDoGoal[]> {
  const result = await getJson<{ goals: CanDoGoal[] }>("/learning/evidence");
  return result.goals;
}

export async function createEvidence(
  goalId: string,
  input: EvidenceInput,
): Promise<LearningEvidence> {
  const result = await postJson<{ evidence: LearningEvidence }>("/learning/evidence", {
    goalId,
    ...input,
  });
  return result.evidence;
}

export async function updateEvidence(
  evidenceId: string,
  input: Partial<EvidenceInput>,
): Promise<LearningEvidence> {
  const result = await patchJson<{ evidence: LearningEvidence }>(
    `/learning/evidence/${evidenceId}`,
    input,
  );
  return result.evidence;
}

export async function deleteEvidence(evidenceId: string): Promise<boolean> {
  const result = await deleteJson<{ deleted: boolean }>(`/learning/evidence/${evidenceId}`);
  return result.deleted;
}

export async function getMissionPassport(): Promise<MissionPassportItem[]> {
  const result = await getJson<{ missions: MissionPassportItem[] }>("/missions/passport");
  return result.missions;
}

export async function getMissionDetail(missionId: string): Promise<MissionDetail> {
  const result = await getJson<{ mission: MissionDetail }>(`/missions/${missionId}`);
  return result.mission;
}

export async function completeMission(missionId: string): Promise<MissionCompletionResult> {
  return postJson<MissionCompletionResult>(`/missions/${missionId}/complete`, {});
}

export async function getMisconceptions(): Promise<MisconceptionItem[]> {
  const result = await getJson<{ items: MisconceptionItem[] }>("/learning/misconceptions");
  return result.items;
}

export async function setMisconceptionDismissed(
  itemId: string,
  dismissed: boolean,
): Promise<MisconceptionItem> {
  const result = await patchJson<{ item: MisconceptionItem }>(
    `/learning/misconceptions/${itemId}`,
    { dismissed },
  );
  return result.item;
}
