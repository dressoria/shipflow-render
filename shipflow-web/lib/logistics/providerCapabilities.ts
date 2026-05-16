import type { LogisticsProvider } from "@/lib/logistics/types";

export type ProviderCapabilities = {
  supportsRates: boolean;
  supportsLabels: boolean;
  supportsVoid: boolean;
  supportsTracking: boolean;
  supportsAddressValidation: boolean;
  configured: boolean;
  priority: number; // lower = higher priority in aggregation
};

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
    supportsRates: true,
    supportsLabels: true,
    supportsVoid: true,
    supportsTracking: false,
    supportsAddressValidation: false,
    configured: true,
    priority: 99, // internal fallback only — never included in aggregation
  },
  mock: {
    supportsRates: true,
    supportsLabels: true,
    supportsVoid: true,
    supportsTracking: false,
    supportsAddressValidation: false,
    configured: true,
    priority: 99,
  },
  shipstation: {
    supportsRates: true,
    supportsLabels: true,
    supportsVoid: true,
    supportsTracking: false,
    supportsAddressValidation: false,
    configured: isShipStationConfigured(),
    priority: 1,
  },
  shippo: {
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.15)
    supportsVoid: false,   // not yet implemented
    supportsTracking: true,
    supportsAddressValidation: true,
    configured: Boolean(process.env.SHIPPO_API_KEY?.trim()?.length),
    priority: 2,
  },
  easypost: {
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.12)
    supportsVoid: false,   // not yet implemented
    supportsTracking: true,
    supportsAddressValidation: true,
    configured: Boolean(process.env.EASYPOST_API_KEY?.trim()?.length),
    priority: 3,
  },
  easyship: {
    supportsRates: true,
    supportsLabels: false, // labels not yet implemented — rates only (FASE 5.18)
    supportsVoid: false,
    supportsTracking: true,
    supportsAddressValidation: false,
    configured: isEasyshipConfigured(),
    priority: 4,
  },
};

export function getProviderCapabilities(provider: LogisticsProvider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}
