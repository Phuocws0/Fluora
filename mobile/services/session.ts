import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const accessTokenKey = "fluora.session.token";

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
}
