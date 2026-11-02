import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { getJson, postJson } from "./api";
import { clearAccessToken, saveAccessToken } from "./session";

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  createdAt: string;
};

export type PublicUser = AuthenticatedUser;

export type AuthResponse = {
  token: string;
  user: AuthenticatedUser;
};

export type RegisterWithEmailInput = {
  email: string;
  password: string;
  displayName: string;
  deviceName?: string;
};

export type LoginWithEmailInput = {
  email: string;
  password: string;
  deviceName?: string;
};

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function googleSignInUnavailableMessage(): string | null {
  if (Platform.OS === "web") return "Google sign-in is available in the Android and iOS app.";
  if (!webClientId) return "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and GOOGLE_CLIENT_IDS to enable Google sign-in.";
  if (Platform.OS === "ios" && !iosClientId) return "Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID before building the iOS app.";
  return null;
}

export async function signInWithGoogle(): Promise<AuthenticatedUser | null> {
  const unavailableMessage = googleSignInUnavailableMessage();
  if (unavailableMessage) throw new Error(unavailableMessage);

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId ?? "",
    offlineAccess: false,
  });

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await GoogleSignin.signIn();
  if (result.type === "cancelled") return null;

  const idToken = result.data.idToken;
  if (!idToken) throw new Error("Google did not return an ID token. Check the web OAuth client configuration.");

  const auth = await postJson<AuthResponse>("/auth/google", { idToken });
  await saveAccessToken(auth.token);
  return auth.user;
}

export async function registerWithEmail(body: {
  email: string;
  password: string;
  displayName: string;
  deviceName?: string;
}): Promise<AuthResponse> {
  const result = await postJson<AuthResponse>("/auth/register", body);
  await saveAccessToken(result.token);
  return result;
}

export async function loginWithEmail(body: {
  email: string;
  password: string;
  deviceName?: string;
}): Promise<AuthResponse> {
  const result = await postJson<AuthResponse>("/auth/login", body);
  await saveAccessToken(result.token);
  return result;
}

export async function logoutSession(): Promise<void> {
  try {
    await postJson<{ ok: boolean }>("/auth/logout", {});
  } catch {
    // Session may already be expired or invalid on the backend
  } finally {
    await clearAccessToken();
  }
}

export async function verifyEmail(token: string): Promise<{ verified: boolean }> {
  return postJson<{ verified: boolean }>("/auth/verify-email", { token });
}

export async function resendEmailVerification(): Promise<{ sent: boolean }> {
  return postJson<{ sent: boolean }>("/auth/verify-email/resend", {});
}

export async function forgotPassword(email: string): Promise<{ accepted: boolean }> {
  return postJson<{ accepted: boolean }>("/auth/password/forgot", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ updated: boolean }> {
  return postJson<{ updated: boolean }>("/auth/password/reset", { token, newPassword });
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const result = await getJson<{ user: AuthenticatedUser }>("/users/me");
  return result.user;
}
