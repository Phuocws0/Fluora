import { Platform } from "react-native";
import { getAccessToken } from "./session";

const defaultHost = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? defaultHost).replace(/\/$/, "");

type ErrorResponse = { error?: { message?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Could not reach Fluora. Check that the backend is running.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(body.error?.message ?? "The request could not be completed.", response.status);
  }

  return (await response.json()) as T;
}

export function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "DELETE",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
