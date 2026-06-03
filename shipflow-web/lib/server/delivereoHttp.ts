import "server-only";

import type { DelivereoServerConfig } from "@/lib/server/delivereoConfig";

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

export function safeDelivereoFailure(message: string, status = 400) {
  return new Response(message, { status });
}

export async function delivereoPostJson<T>(
  config: DelivereoServerConfig,
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const url = new URL(path, config.baseUrl!).toString();
  const timeout = createTimeoutSignal(config.timeoutMs);

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
      const safeMessage = typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : "Delivereo request failed.";
      throw safeDelivereoFailure(safeMessage, response.status);
    }

    return (payload ?? {}) as T;
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw safeDelivereoFailure("Delivereo request timed out.", 504);
    }
    throw safeDelivereoFailure("Delivereo request failed.", 502);
  } finally {
    timeout.clear();
  }
}
