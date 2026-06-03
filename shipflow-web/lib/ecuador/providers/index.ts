import { DelivereoEcuadorShippingProvider } from "@/lib/ecuador/providers/delivereoProvider";
import { MockEcuadorShippingProvider } from "@/lib/ecuador/providers/mockProvider";
import type { EcuadorShippingProvider } from "@/lib/ecuador/providers/types";
import type { EcuadorProvider } from "@/lib/ecuador/types";

const providerRegistry: Record<EcuadorProvider, () => EcuadorShippingProvider> = {
  mock: () => new MockEcuadorShippingProvider(),
  manual: () => new MockEcuadorShippingProvider(),
  delivereo: () => new DelivereoEcuadorShippingProvider(),
};

export function getEcuadorProvider(providerName: EcuadorProvider): EcuadorShippingProvider {
  const resolver = providerRegistry[providerName] ?? providerRegistry.manual;
  return resolver();
}
