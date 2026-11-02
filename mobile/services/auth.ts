import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { postJson } from "./api";
import { saveAccessToken } from "./session";

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

type GoogleAuthResponse = { token: string; user: AuthenticatedUser };

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

  const auth = await postJson<GoogleAuthResponse>("/auth/google", { idToken });
  await saveAccessToken(auth.token);
  return auth.user;
}
