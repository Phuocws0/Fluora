import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { OnboardingDraft } from "./onboarding.types";

const ONBOARDING_DRAFT_KEY = "fluora.onboarding.draft";

let inMemoryDraft: OnboardingDraft | null = null;

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
  inMemoryDraft = draft;
  if (Platform.OS === "web") {
    return;
  }
  try {
    await SecureStore.setItemAsync(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Retain in-memory fallback if SecureStore is unavailable
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  if (Platform.OS === "web") {
    return inMemoryDraft;
  }
  try {
    const raw = await SecureStore.getItemAsync(ONBOARDING_DRAFT_KEY);
    if (!raw) {
      return inMemoryDraft;
    }
    const parsed = JSON.parse(raw) as OnboardingDraft;
    inMemoryDraft = parsed;
    return parsed;
  } catch {
    return inMemoryDraft;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  inMemoryDraft = null;
  if (Platform.OS === "web") {
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY);
  } catch {
    // Retain in-memory clearing
  }
}
