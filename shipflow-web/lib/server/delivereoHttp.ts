import "server-only";

import type { DelivereoServerConfig } from "@/lib/server/delivereoConfig";
import { NextResponse } from "next/server";

export type DelivereoFailureStage = "business_login" | "token_renewal" | "calculate";

export type DelivereoErrorShape = {
  error: string;
  stage: DelivereoFailureStage;
  status: number;
  details: string;
  providerMessage?: string | null;
};

export class DelivereoRequestError extends Error {
  stage: DelivereoFailureStage;
  status: number;
  details: string;
  providerMessage?: string | null;

  constructor(shape: DelivereoErrorShape) {
    super(shape.error);
    this.name = "DelivereoRequestError";
    this.stage = shape.stage;
    this.status = shape.status;
    this.details = shape.details;
    this.providerMessage = shape.providerMessage ?? null;
  }
}

export function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeoutId),
  };
}

export async function parseJsonSafely(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function safeDelivereoFailure(
  error: string,
  stage: DelivereoFailureStage,
  status = 400,
  details = error,
  providerMessage?: string | null,
) {
  return new DelivereoRequestError({
    error,
    stage,
    status,
    details,
    providerMessage,
  });
}

export function formatDelivereoApiError(error: unknown): DelivereoErrorShape {
  if (error && typeof error === "object") {
    const candidate = error as Partial<DelivereoErrorShape>;
    if (
      typeof candidate.error === "string" &&
      typeof candidate.stage === "string" &&
      typeof candidate.status === "number" &&
      typeof candidate.details === "string"
    ) {
      return {
        error: candidate.error,
        stage: candidate.stage as DelivereoFailureStage,
        status: candidate.status,
        details: candidate.details,
        providerMessage: typeof candidate.providerMessage === "string" ? candidate.providerMessage : null,
      };
    }
  }

  if (error instanceof DelivereoRequestError) {
    return {
      error: error.message,
      stage: error.stage,
      status: error.status,
      details: error.details,
      providerMessage: error.providerMessage ?? null,
    };
  }

  if (error instanceof Response) {
    return {
      error: "Delivereo quote failed",
      stage: "calculate",
      status: error.status,
      details: "La respuesta de Delivereo no pudo interpretarse de forma segura.",
      providerMessage: null,
    };
  }

  if (error instanceof Error) {
    return {
      error: "Delivereo quote failed",
      stage: "calculate",
      status: 500,
      details: error.message || "No pudimos completar la solicitud hacia Delivereo.",
      providerMessage: null,
    };
  }

  return {
    error: "Delivereo quote failed",
    stage: "calculate",
    status: 500,
    details: "No pudimos completar la solicitud hacia Delivereo.",
    providerMessage: null,
  };
}

export function delivereoErrorResponse(error: unknown) {
  const safe = formatDelivereoApiError(error);
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: safe.error,
      stage: safe.stage,
      status: safe.status,
      details: safe.details,
      providerMessage: safe.providerMessage ?? null,
    },
    { status: safe.status },
  );
}

type DelivereoPostOptions = {
  stage: DelivereoFailureStage;
  summary?: Record<string, unknown>;
};

function toSafeProviderMessage(payload: Record<string, unknown> | null) {
  const candidate = typeof payload?.message === "string" ? payload.message.trim() : "";
  return candidate || null;
}

function logDelivereoFailure(stage: DelivereoFailureStage, summary: Record<string, unknown> | undefined, status: number, providerMessage?: string | null) {
  console.error("[delivereo]", {
    stage,
    status,
    ...(summary ? { summary } : {}),
    ...(providerMessage ? { providerMessage } : {}),
  });
}

export async function delivereoPostJson<T>(
  config: DelivereoServerConfig,
  path: string,
  body: Record<string, unknown>,
  token?: string,
  options?: DelivereoPostOptions,
): Promise<T> {
  const url = new URL(path, config.baseUrl!).toString();
  const timeout = createTimeoutSignal(config.timeoutMs);
  const stage = options?.stage ?? "calculate";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: timeout.signal,
      cache: "no-store",
    });

    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      const providerMessage = toSafeProviderMessage(payload);
      const details = providerMessage || "Delivereo rechazó la solicitud.";
      logDelivereoFailure(stage, options?.summary, response.status, providerMessage);
      throw safeDelivereoFailure("Delivereo quote failed", stage, response.status, details, providerMessage);
    }

    return (payload ?? {}) as T;
  } catch (error) {
    if (error instanceof DelivereoRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      logDelivereoFailure(stage, options?.summary, 504);
      throw safeDelivereoFailure("Delivereo quote failed", stage, 504, "Delivereo no respondió dentro del tiempo límite.");
    }
    logDelivereoFailure(stage, options?.summary, 502);
    throw safeDelivereoFailure("Delivereo quote failed", stage, 502, "No pudimos comunicarnos con Delivereo.");
  } finally {
    timeout.clear();
  }
}
