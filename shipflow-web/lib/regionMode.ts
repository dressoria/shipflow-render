export type RegionMode = "us" | "ec";

export const REGION_MODE_STORAGE_KEY = "sendiflash-region-mode";

export const REGION_MODES = {
  us: {
    label: "USA Shipping",
    shortLabel: "USA",
    language: "en" as const,
    heroLabel: "USA / Shipping Labels",
    serviceLabel: "Shipping Labels",
    statusLabel: "Available now",
  },
  ec: {
    label: "Ecuador Shipping",
    shortLabel: "Ecuador",
    language: "es" as const,
    heroLabel: "Ecuador Shipping",
    serviceLabel: "Ecuador Shipping",
    statusLabel: "Proximamente",
  },
} as const;

export const DEFAULT_REGION_MODE: RegionMode = "us";

export function isRegionMode(value: string | null | undefined): value is RegionMode {
  return value === "us" || value === "ec";
}

export function getRegionModeMeta(mode: RegionMode) {
  return REGION_MODES[mode];
}

// Future GeoIP can suggest a default mode, but regional mode should remain a client preference
// and must never hard-block access to other services.
