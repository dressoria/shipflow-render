import "server-only";

import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import { getDelivereoCredentialStatus, readDelivereoServerConfig, type DelivereoServerConfig } from "@/lib/server/delivereoConfig";
import { delivereoPostJson, safeDelivereoFailure } from "@/lib/server/delivereoHttp";

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

function requireDelivereoCredentials(config: DelivereoServerConfig) {
  if (!config.baseUrl || !config.username || !config.password) {
    throw safeDelivereoFailure("Delivereo credentials are not configured.", 503);
  }

  if (!config.enabled) {
    throw safeDelivereoFailure("Delivereo is disabled in server configuration.", 503);
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
    throw safeDelivereoFailure("Delivereo token renewal requires an existing token.", 400);
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
    canQuote: credentials.enabled && credentials.credentialsPresent,
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
    throw safeDelivereoFailure("Delivereo credentials are not configured.", 503);
  }

  if (!credentials.enabled) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
    };
    throw safeDelivereoFailure("Delivereo is disabled in server configuration.", 503);
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
