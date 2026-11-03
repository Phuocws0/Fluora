import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthenticatedUser } from "./auth";
import type { LearnerSettings } from "../features/onboarding/onboarding.types";

const accessTokenKey = "fluora.session.token";
const snapshotKey = "fluora.session.offline-profile";
export type SessionSnapshot = { token: string; user: AuthenticatedUser; settings: LearnerSettings | null };

export async function saveSessionSnapshot(snapshot: SessionSnapshot): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(snapshotKey, JSON.stringify(snapshot));
}
export async function loadSessionSnapshot(token: string): Promise<SessionSnapshot | null> {
  if (Platform.OS === "web") return null;
  const raw = await SecureStore.getItemAsync(snapshotKey);
  if (!raw) return null;
  const value = JSON.parse(raw) as SessionSnapshot;
  return value.token === token && typeof value.user?.id === "string" && typeof value.user?.email === "string" ? value : null;
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(accessTokenKey);
}

export async function saveAccessToken(token: string): Promise<void> {
  if (Platform.OS === "web") throw new Error("Fluora sign-in is available in the mobile app.");
  await SecureStore.setItemAsync(accessTokenKey, token);
}

export async function clearAccessToken(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(snapshotKey);
}
