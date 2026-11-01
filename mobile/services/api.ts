import { Platform } from "react-native";

const defaultHost = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? defaultHost).replace(/\/$/, "");

type ErrorResponse = { error?: { message?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getJson<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api${path}`);
  } catch {
    throw new ApiError("Could not reach Fluora. Check that the backend is running.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(body.error?.message ?? "The request could not be completed.", response.status);
  }

  return (await response.json()) as T;
}
