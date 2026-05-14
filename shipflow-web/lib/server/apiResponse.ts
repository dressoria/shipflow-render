import { NextResponse } from "next/server";
import { LogisticsError } from "@/lib/logistics/errors";

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      error: null,
    },
    { status },
  );
}

export function apiError(message: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      data: null,
      error: message,
    },
    { status },
  );
}

export async function apiErrorFromUnknown(error: unknown, fallbackMessage: string, status = 500) {
  if (error instanceof Response) {
    return apiError((await error.text()) || fallbackMessage, error.status);
  }

  if (error instanceof LogisticsError) {
    return apiError(error.message || fallbackMessage, error.status);
  }

  return apiError(error instanceof Error ? error.message : fallbackMessage, status);
}

export function isMissingSchemaColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    candidate.message?.toLowerCase().includes("column") ||
    false
  );
}

export function isRpcNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  // PGRST202: PostgREST "function not found in schema cache"
  // 42883: PostgreSQL "undefined_function"
  return (
    candidate.code === "PGRST202" ||
    candidate.code === "42883" ||
    (candidate.message?.toLowerCase().includes("could not find the function") ?? false) ||
    (candidate.message?.toLowerCase().includes("does not exist") ?? false)
  );
}
