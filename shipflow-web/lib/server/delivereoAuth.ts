import "server-only";

import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import { getDelivereoCredentialStatus, readDelivereoServerConfig, type DelivereoServerConfig } from "@/lib/server/delivereoConfig";

export type DelivereoAuthTestStatus = "success" | "fail" | "not_tested";

type DelivereoTokenResponse = {
  jwtToken?: string | null;
};

type LastAuthCheck = {
  authTest: DelivereoAuthTestStatus;
  tokenReceived: boolean;
  lastCheckedAt: string | null;
};

let lastAuthCheck: LastAuthCheck = {
  authTest: "not_tested",
  tokenReceived: false,
  lastCheckedAt: null,
};

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeoutId),
  };
}

async function parseJsonSafely(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeAuthFailure(message: string, status = 400) {
  return new Response(message, { status });
}

function requireDelivereoCredentials(config: DelivereoServerConfig) {
  if (!config.baseUrl || !config.username || !config.password) {
    throw safeAuthFailure("Delivereo credentials are not configured.", 503);
  }

  if (!config.enabled) {
    throw safeAuthFailure("Delivereo is disabled in server configuration.", 503);
  }
}

async function delivereoPostJson<T>(
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
        : "Delivereo authentication failed.";
      throw safeAuthFailure(safeMessage, response.status);
    }

    return (payload ?? {}) as T;
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw safeAuthFailure("Delivereo authentication timed out.", 504);
    }
    throw safeAuthFailure("Delivereo authentication failed.", 502);
  } finally {
    timeout.clear();
  }
}

export async function loginToDelivereo() {
  const config = readDelivereoServerConfig();
  requireDelivereoCredentials(config);

  const payload = await delivereoPostJson<DelivereoTokenResponse>(
    config,
    "/api/protected/login/business-user",
    {
      email: config.username,
      password: config.password,
      lang: "en",
    },
  );

  return {
    token: typeof payload.jwtToken === "string" && payload.jwtToken.trim() ? payload.jwtToken.trim() : null,
  };
}

export async function renewDelivereoToken(token: string) {
  const config = readDelivereoServerConfig();
  requireDelivereoCredentials(config);
  if (!token.trim()) {
    throw safeAuthFailure("Delivereo token renewal requires an existing token.", 400);
  }

  const payload = await delivereoPostJson<DelivereoTokenResponse>(
    config,
    "/api/protected/token-renewal/business-user",
    {},
    token.trim(),
  );

  return {
    token: typeof payload.jwtToken === "string" && payload.jwtToken.trim() ? payload.jwtToken.trim() : null,
  };
}

export function getDelivereoAuthSnapshot(): EcuadorProviderDiagnosticsSnapshot {
  const credentials = getDelivereoCredentialStatus();

  return {
    provider: "delivereo",
    status: credentials.enabled && credentials.credentialsPresent ? "sandbox" : "not_configured",
    credentialsConfigured: credentials.credentialsPresent,
    authTest: lastAuthCheck.authTest,
    tokenReceived: lastAuthCheck.tokenReceived,
    baseUrl: credentials.baseUrl,
    enabled: credentials.enabled,
    lastCheckedAt: lastAuthCheck.lastCheckedAt,
    configured: credentials.configured,
    credentialsPresent: credentials.credentialsPresent,
    canQuote: false,
    canCreateOrders: false,
    canTrack: false,
    networkTested: lastAuthCheck.authTest !== "not_tested",
    ordersEnabled: false,
    trackingEnabled: false,
  };
}

export async function testDelivereoAuthentication() {
  const credentials = getDelivereoCredentialStatus();
  if (!credentials.credentialsPresent) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
    };
    throw safeAuthFailure("Delivereo credentials are not configured.", 503);
  }

  if (!credentials.enabled) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
    };
    throw safeAuthFailure("Delivereo is disabled in server configuration.", 503);
  }

  try {
    const result = await loginToDelivereo();
    lastAuthCheck = {
      authTest: result.token ? "success" : "fail",
      tokenReceived: Boolean(result.token),
      lastCheckedAt: new Date().toISOString(),
    };
    return getDelivereoAuthSnapshot();
  } catch (error) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
    };
    throw error;
  }
}
