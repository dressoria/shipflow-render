import type { LogisticsProvider } from "@/lib/logistics/types";

export type ProviderCapabilities = {
  displayName: string;
  supportsRates: boolean;
  supportsLabels: boolean;
  supportsVoid: boolean;
  supportsTracking: boolean;
  supportsAddressValidation: boolean;
  apiMode?: "internal" | "mock" | "shipengine" | "shipstation_legacy" | "shippo" | "easypost" | "easyship";
  labelImplementation: "available" | "planned" | "rates_only" | "legacy" | "none";
  environment?: "sandbox" | "test" | "live" | "unknown";
  configured: boolean;
  priority: number; // lower = higher priority in aggregation
};

function shipStationMode(): "legacy" | "shipengine" {
  return process.env.SHIPSTATION_API_MODE?.trim().toLowerCase() === "shipengine"
    ? "shipengine"
    : "legacy";
}

function isShipStationConfigured(): boolean {
  const mode = process.env.SHIPSTATION_API_MODE?.trim().toLowerCase();
  const key = process.env.SHIPSTATION_API_KEY?.trim();
  if (mode === "shipengine") {
    return Boolean(key && key.length > 4);
  }

  const secret = process.env.SHIPSTATION_API_SECRET?.trim();
  return Boolean(key && secret && key.length > 4 && secret.length > 4);
}

function isEasyshipConfigured(): boolean {
  const key = process.env.EASYSHIP_API_KEY?.trim();
  const baseUrl = process.env.EASYSHIP_BASE_URL?.trim();
  return Boolean(key && key.length > 4 && baseUrl?.startsWith("https://"));
}

export const PROVIDER_CAPABILITIES: Record<LogisticsProvider, ProviderCapabilities> = {
  internal: {
    displayName: "Internal",
    supportsRates: true,
    supportsLabels: true,
    supportsVoid: true,
    supportsTracking: false,
    supportsAddressValidation: false,
    apiMode: "internal",
    labelImplementation: "none",
    environment: "unknown",
    configured: true,
    priority: 99, // internal fallback only — never included in aggregation
  },
  mock: {
    displayName: "Mock",
    supportsRates: true,
    supportsLabels: true,
    supportsVoid: true,
    supportsTracking: false,
    supportsAddressValidation: false,
    apiMode: "mock",
    labelImplementation: "none",
    environment: "unknown",
    configured: true,
    priority: 99,
  },
  shipstation: {
    displayName: shipStationMode() === "shipengine" ? "ShipEngine" : "ShipStation Legacy",
    supportsRates: true,
    supportsLabels: shipStationMode() === "shipengine",
    supportsVoid: false,
    supportsTracking: false,
    supportsAddressValidation: false,
    apiMode: shipStationMode() === "shipengine" ? "shipengine" : "shipstation_legacy",
    labelImplementation: shipStationMode() === "shipengine" ? "available" : "legacy",
    environment: shipStationMode() === "shipengine" ? "sandbox" : "unknown",
    configured: isShipStationConfigured(),
    priority: 1,
  },
  shippo: {
    displayName: "Shippo",
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.15)
    supportsVoid: false,   // not yet implemented
    supportsTracking: true,
    supportsAddressValidation: true,
    apiMode: "shippo",
    labelImplementation: "rates_only",
    environment: "test",
    configured: Boolean(process.env.SHIPPO_API_KEY?.trim()?.length),
    priority: 2,
  },
  easypost: {
    displayName: "EasyPost",
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.12)
    supportsVoid: false,   // not yet implemented
    supportsTracking: true,
    supportsAddressValidation: true,
    apiMode: "easypost",
    labelImplementation: "rates_only",
    environment: "unknown",
    configured: Boolean(process.env.EASYPOST_API_KEY?.trim()?.length),
    priority: 3,
  },
  easyship: {
    displayName: "Easyship",
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.18)
    supportsVoid: false,
    supportsTracking: true,
    supportsAddressValidation: false,
    apiMode: "easyship",
    labelImplementation: "rates_only",
    environment: "sandbox",
    configured: isEasyshipConfigured(),
    priority: 4,
  },
};

export function getProviderCapabilities(provider: LogisticsProvider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}
