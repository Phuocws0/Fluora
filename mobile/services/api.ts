import { Platform } from "react-native";
import { getAccessToken } from "./session";
import { translateApiError } from "../features/i18n/translations";

const defaultHost =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? defaultHost).replace(
  /\/$/,
  "",
);

type ErrorResponse = { error?: { code?: string; message?: string } };

type UnauthorizedHandler = (rejectedToken: string) => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | undefined;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(translateApiError(message, code));
    this.name = "ApiError";
  }
}

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler,
): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

async function requestJson<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  let response: Response;
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new ApiError(
      "Could not reach Fluora. Check your connection and that the backend is running, then try again.",
    );
  } finally { clearTimeout(timeout); }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    const error = new ApiError(
      body.error?.message ?? "The request could not be completed.",
      response.status,
      body.error?.code,
    );
    if (
      response.status === 401 &&
      body.error?.code === "UNAUTHORIZED" &&
      accessToken &&
      unauthorizedHandler
    ) {
      try {
        await unauthorizedHandler(accessToken);
      } catch {
        // Preserve the API error even if local session cleanup fails.
      }
    }
    throw error;
  }

  return (await response.json()) as T;
}

export function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export function postJson<T>(path: string, body: unknown, timeoutMs?: number): Promise<T> {
  return requestJson<T>(path, { method: "POST", body: JSON.stringify(body) }, timeoutMs);
}

export function patchJson<T>(path: string, body: unknown, timeoutMs?: number): Promise<T> {
  return requestJson<T>(path, { method: "PATCH", body: JSON.stringify(body) }, timeoutMs);
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "DELETE",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
