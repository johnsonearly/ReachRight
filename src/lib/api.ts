import type { AnalyzeRequest, AnalyzeResponse, ApiErrorBody, ContentRequest, ContentResponse, HealthResponse } from "../types";

export class ApiError extends Error {}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the ReachRight server. Make sure `npm run dev` is running.");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // fall through to the generic error below
  }

  if (!res.ok) {
    throw new ApiError(isErrorBody(data) ? data.error : `Request failed (${res.status}). Please try again.`);
  }
  if (data === null) throw new ApiError("The server returned an empty response.");
  return data as T;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  analyze: (req: AnalyzeRequest) => request<AnalyzeResponse>("/api/analyze", req),
  content: (req: ContentRequest) => request<ContentResponse>("/api/content", req),
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}
