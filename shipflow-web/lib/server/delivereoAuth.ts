import "server-only";

import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import {
  getDelivereoCredentialStatus,
  getDelivereoMissingConfigFields,
  readDelivereoServerConfig,
  type DelivereoServerConfig,
} from "@/lib/server/delivereoConfig";
import { delivereoPostJson, safeDelivereoFailure } from "@/lib/server/delivereoHttp";

export type DelivereoAuthTestStatus = "success" | "fail" | "not_tested";

type DelivereoTokenResponse = {
  code?: number;
  jwtToken?: string | null;
  message?: string | null;
  result?: string | null;
  status?: boolean;
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
  const missingFields = getDelivereoMissingConfigFields(config);
  if (missingFields.length > 0) {
    throw safeDelivereoFailure(
      "Delivereo is not configured",
      "business_login",
      503,
      `Missing ${missingFields[0]}`,
    );
  }

  if (!config.enabled) {
    throw safeDelivereoFailure(
      "Delivereo is not configured",
      "business_login",
      503,
      "DELIVEREO_ENABLED is false",
    );
  }
}

export async function loginToDelivereo() {
  const config = readDelivereoServerConfig();
  requireDelivereoCredentials(config);

  const payload = await delivereoPostJson<DelivereoTokenResponse>(
    config,
    "/api/protected/login/business",
    {
      apiKey: config.apiKey,
      email: config.username,
      ruc: config.ruc,
      lang: "es",
    },
    undefined,
    {
      stage: "business_login",
      summary: {
        loginMode: "business",
      },
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
    throw safeDelivereoFailure(
      "Delivereo token renewal failed",
      "token_renewal",
      400,
      "Delivereo token renewal requires an existing token.",
    );
  }

  const payload = await delivereoPostJson<DelivereoTokenResponse>(
    config,
    "/api/protected/token-renewal/business",
    {
      email: config.username,
      lang: "es",
      oldJwtToken: token.trim(),
    },
    undefined,
    {
      stage: "token_renewal",
      summary: {
        loginMode: "business",
      },
    },
  );

  return {
    token: typeof payload.result === "string" && payload.result?.trim()
      ? payload.result.trim()
      : typeof payload.jwtToken === "string" && payload.jwtToken.trim()
        ? payload.jwtToken.trim()
        : null,
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
    throw safeDelivereoFailure(
      "Delivereo is not configured",
      "business_login",
      503,
      credentials.missingFields.length > 0 ? `Missing ${credentials.missingFields[0]}` : "Missing Delivereo credentials",
    );
  }

  if (!credentials.enabled) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
    };
    throw safeDelivereoFailure(
      "Delivereo is not configured",
      "business_login",
      503,
      "DELIVEREO_ENABLED is false",
    );
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
