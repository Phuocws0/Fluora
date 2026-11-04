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
