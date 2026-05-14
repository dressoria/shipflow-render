import { MockAdapter } from "@/lib/logistics/adapters/MockAdapter";
import { ShipStationAdapter } from "@/lib/logistics/adapters/ShipStationAdapter";
import { UnsupportedProviderError } from "@/lib/logistics/errors";
import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type { LogisticsProvider } from "@/lib/logistics/types";
import type { CourierConfig } from "@/lib/types";

export type LogisticsRegistryOptions = {
  couriers?: CourierConfig[];
};

export function normalizeProvider(provider?: string): LogisticsProvider {
  if (!provider || provider === "internal") return "internal";
  if (provider === "mock") return "mock";
  if (provider === "shipstation") return "shipstation";

  throw new UnsupportedProviderError(`Unsupported logistics provider: ${provider}`);
}

export function getLogisticsAdapter(provider?: string, options: LogisticsRegistryOptions = {}): LogisticsAdapter {
  const normalizedProvider = normalizeProvider(provider);

  if (normalizedProvider === "internal" || normalizedProvider === "mock") {
    return new MockAdapter(options.couriers ?? []);
  }

  if (normalizedProvider === "shipstation") {
    return new ShipStationAdapter();
  }

  throw new UnsupportedProviderError();
}
