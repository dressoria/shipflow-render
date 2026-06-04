import "server-only";

import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import { getEcuadorQuoteProviders } from "@/lib/ecuador/providers";
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
  lastFailureReason: string | null;
};

let lastAuthCheck: LastAuthCheck = {
  authTest: "not_tested",
  tokenReceived: false,
  lastCheckedAt: null,
  lastFailureReason: null,
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
  const provider = getEcuadorQuoteProviders().find((item) => item.id === "delivereo");

  return {
    provider: "delivereo",
    providerName: provider?.name ?? "Delivereo",
    logoPath: provider?.logoPath ?? "/images/ecuador/operators/delivereo.svg",
    providerStatus: provider?.status ?? "beta",
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
    lastFailureReason: lastAuthCheck.lastFailureReason,
  };
}

export function getEcuadorProviderDiagnosticsSnapshots(): EcuadorProviderDiagnosticsSnapshot[] {
  const delivereoSnapshot = getDelivereoAuthSnapshot();
  const providers = getEcuadorQuoteProviders()
    .filter((provider) => provider.id !== "delivereo")
    .map<EcuadorProviderDiagnosticsSnapshot>((provider) => ({
      provider: provider.id,
      providerName: provider.name,
      logoPath: provider.logoPath,
      providerStatus: provider.status,
      status: provider.status === "contact_required" || provider.status === "integration_pending" ? "not_configured" : "sandbox",
      configured: false,
      credentialsPresent: false,
      credentialsConfigured: false,
      canQuote: provider.supportsQuote,
      canCreateOrders: provider.supportsBooking,
      canTrack: false,
      networkTested: false,
      ordersEnabled: provider.supportsBooking,
      trackingEnabled: false,
      lastFailureReason: provider.status === "contact_required" ? "Pendiente de contacto" : "Integración en preparación",
      authTest: "not_tested",
      tokenReceived: false,
      baseUrl: null,
      enabled: false,
      lastCheckedAt: null,
    }));

  return [delivereoSnapshot, ...providers];
}

export async function testDelivereoAuthentication() {
  const credentials = getDelivereoCredentialStatus();
  if (!credentials.credentialsPresent) {
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
      lastFailureReason: credentials.missingFields.length > 0 ? `Missing ${credentials.missingFields[0]}` : "Missing Delivereo credentials",
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
      lastFailureReason: "DELIVEREO_ENABLED is false",
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
      lastFailureReason: result.token ? null : "Delivereo did not return a jwtToken",
    };
    return getDelivereoAuthSnapshot();
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Delivereo authentication failed.";
    lastAuthCheck = {
      authTest: "fail",
      tokenReceived: false,
      lastCheckedAt: new Date().toISOString(),
      lastFailureReason: failureReason,
    };
    throw error;
  }
}
