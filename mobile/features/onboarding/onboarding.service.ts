import { getJson, patchJson, postJson } from "../../services/api";
import type {
  LearnerSettings,
  PlacementAttemptResult,
  PlacementQuestionsResponse,
} from "./onboarding.types";

export async function getPlacementQuestions(): Promise<PlacementQuestionsResponse> {
  return getJson<PlacementQuestionsResponse>("/placement/questions");
}

export async function submitPlacementAttempt(
  answers: Array<{ questionId: string; optionId: string }>,
): Promise<PlacementAttemptResult> {
  return postJson<PlacementAttemptResult>("/placement/attempts", { answers });
}

export async function getLearnerSettings(): Promise<LearnerSettings> {
  const result = await getJson<{ settings: LearnerSettings }>("/users/me/settings");
  return result.settings;
}

export async function updateLearnerSettings(
  changes: Partial<LearnerSettings> & { onboardingCompleted?: boolean },
): Promise<LearnerSettings> {
  const result = await patchJson<{ settings: LearnerSettings }>("/users/me/settings", changes);
  return result.settings;
}
