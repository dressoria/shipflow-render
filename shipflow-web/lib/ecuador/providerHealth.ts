import type { EcuadorProvider } from "@/lib/ecuador/types";

export type EcuadorProviderEnvironment = "unavailable" | "not_configured" | "sandbox" | "production";

export type EcuadorProviderReadiness = {
  provider: EcuadorProvider;
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

export function getProviderHealthStatus(): EcuadorProviderEnvironment {
  return "not_configured";
}

export function getProviderReadiness(provider: EcuadorProvider = "delivereo"): EcuadorProviderReadiness {
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
