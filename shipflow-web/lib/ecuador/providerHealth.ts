import type { EcuadorProviderId, EcuadorQuoteProviderStatus } from "@/lib/ecuador/providers/types";

export type EcuadorProviderEnvironment = "unavailable" | "not_configured" | "sandbox" | "production";

export type EcuadorProviderReadiness = {
  provider: EcuadorProviderId;
  status: EcuadorProviderEnvironment;
  configured: boolean;
  credentialsPresent: boolean;
  canQuote: boolean;
  canCreateOrders: boolean;
  canTrack: boolean;
  networkTested: boolean;
  ordersEnabled: boolean;
  trackingEnabled: boolean;
};

export type EcuadorProviderDiagnosticsSnapshot = EcuadorProviderReadiness & {
  providerName: string;
  logoPath: string;
  providerStatus: EcuadorQuoteProviderStatus;
  credentialsConfigured: boolean;
  authTest?: "success" | "fail" | "not_tested";
  tokenReceived?: boolean;
  baseUrl?: string | null;
  enabled?: boolean;
  lastCheckedAt?: string | null;
  lastFailureReason?: string | null;
};

export function getProviderHealthStatus(): EcuadorProviderEnvironment {
  return "not_configured";
}

export function getProviderReadiness(provider: EcuadorProviderId = "delivereo"): EcuadorProviderReadiness {
  return {
    provider,
    status: getProviderHealthStatus(),
    configured: false,
    credentialsPresent: false,
    canQuote: false,
    canCreateOrders: false,
    canTrack: false,
    networkTested: false,
    ordersEnabled: false,
    trackingEnabled: false,
  };
}
