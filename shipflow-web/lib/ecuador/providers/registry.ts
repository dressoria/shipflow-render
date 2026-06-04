import { DelivereoEcuadorShippingProvider } from "@/lib/ecuador/providers/delivereoProvider";
import { PlaceholderEcuadorQuoteProvider } from "@/lib/ecuador/providers/placeholderProvider";
import type { EcuadorProviderId, EcuadorQuoteProvider } from "@/lib/ecuador/providers/types";

type ProviderFactory = () => EcuadorQuoteProvider;

const providerRegistry: Record<EcuadorProviderId, ProviderFactory> = {
  delivereo: () => new DelivereoEcuadorShippingProvider(),
  servientrega: () =>
    new PlaceholderEcuadorQuoteProvider({
      id: "servientrega",
      name: "Servientrega",
      logoPath: "/images/ecuador/operators/servientrega.svg",
      status: "contact_required",
      reason: "contact_required",
    }),
  laarcourier: () =>
    new PlaceholderEcuadorQuoteProvider({
      id: "laarcourier",
      name: "LaarCourier",
      logoPath: "/images/ecuador/operators/laarcourier.png",
      status: "contact_required",
      reason: "contact_required",
    }),
  urbano: () =>
    new PlaceholderEcuadorQuoteProvider({
      id: "urbano",
      name: "Urbano Envíos",
      logoPath: "/images/ecuador/operators/urbano-envios.png",
      status: "contact_required",
      reason: "contact_required",
    }),
  tramaco: () =>
    new PlaceholderEcuadorQuoteProvider({
      id: "tramaco",
      name: "Tramaco",
      logoPath: "/images/ecuador/operators/tramaco.png",
      status: "integration_pending",
      reason: "integration_pending",
    }),
  yobel: () =>
    new PlaceholderEcuadorQuoteProvider({
      id: "yobel",
      name: "Yobel",
      logoPath: "/images/ecuador/operators/yobel.svg",
      status: "integration_pending",
      reason: "integration_pending",
    }),
};

export function getEcuadorQuoteProvider(id: EcuadorProviderId): EcuadorQuoteProvider {
  return (providerRegistry[id] ?? providerRegistry.delivereo)();
}

export function getEcuadorQuoteProviders(): EcuadorQuoteProvider[] {
  return (Object.keys(providerRegistry) as EcuadorProviderId[]).map((id) => providerRegistry[id]());
}
