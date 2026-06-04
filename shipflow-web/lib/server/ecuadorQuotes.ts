import "server-only";

import { getEcuadorQuoteProviders } from "@/lib/ecuador/providers";
import type { EcuadorProviderQuoteResult } from "@/lib/ecuador/providers/types";
import type { EcuadorQuoteInput, EcuadorQuoteRequestBody } from "@/lib/ecuador/types";
import { normalizeCreateEcuadorShipmentRequestInput } from "@/lib/server/regionalShipments";

export type EcuadorQuotesResponse = {
  results: EcuadorProviderQuoteResult[];
  summary: {
    totalProviders: number;
    realQuotesCount: number;
    pendingProvidersCount: number;
    failedProvidersCount: number;
  };
  beta: true;
  message: string;
};

export function buildEcuadorQuoteInput(body: EcuadorQuoteRequestBody): EcuadorQuoteInput {
  const normalized = normalizeCreateEcuadorShipmentRequestInput(body);

  return {
    market: "EC",
    serviceType: "ecuador_delivery",
    origin: {
      name: normalized.originName,
      phone: normalized.originPhone,
      city: normalized.originCity,
      addressLine: normalized.originAddress,
      reference: normalized.originReference || undefined,
      lat: typeof body.originLatitude === "number" ? body.originLatitude : undefined,
      lng: typeof body.originLongitude === "number" ? body.originLongitude : undefined,
    },
    destination: {
      name: normalized.destinationName,
      phone: normalized.destinationPhone,
      city: normalized.destinationCity,
      addressLine: normalized.destinationAddress,
      reference: normalized.destinationReference || undefined,
      lat: typeof body.destinationLatitude === "number" ? body.destinationLatitude : undefined,
      lng: typeof body.destinationLongitude === "number" ? body.destinationLongitude : undefined,
    },
    packageDescription: normalized.packageDescription,
    packageWeight: normalized.packageWeight,
    packageDimensions: {
      length: normalized.packageLength,
      width: normalized.packageWidth,
      height: normalized.packageHeight,
      unit: "cm",
    },
    declaredValue: normalized.declaredValue,
    notes: normalized.customerNotes || undefined,
    category: body.category,
    language: body.language ?? "es",
  };
}

function sortProviderResults(results: EcuadorProviderQuoteResult[]) {
  return [...results].sort((a, b) => {
    if (a.ok && !b.ok) return -1;
    if (!a.ok && b.ok) return 1;
    return a.providerName.localeCompare(b.providerName, "es");
  });
}

export async function getEcuadorQuotes(body: EcuadorQuoteRequestBody): Promise<EcuadorQuotesResponse> {
  const input = buildEcuadorQuoteInput(body);
  const providers = getEcuadorQuoteProviders();
  const settled = await Promise.allSettled(providers.map((provider) => provider.getQuote(input)));

  const results = settled.map((item, index): EcuadorProviderQuoteResult => {
    const provider = providers[index];
    if (item.status === "fulfilled") {
      return item.value;
    }

    return {
      ok: false,
      providerId: provider.id,
      providerName: provider.name,
      reason: "provider_error",
      userMessage: "Proveedor pendiente de activación",
      debugMessage: item.reason instanceof Error ? item.reason.message : "Provider execution failed",
      source: "system",
    };
  });

  const ordered = sortProviderResults(results);
  const realQuotesCount = ordered.filter((item) => item.ok).length;
  const pendingProvidersCount = ordered.filter((item) => !item.ok && ["integration_pending", "contact_required"].includes(item.reason)).length;
  const failedProvidersCount = ordered.filter((item) => !item.ok && !["integration_pending", "contact_required"].includes(item.reason)).length;

  return {
    results: ordered,
    summary: {
      totalProviders: ordered.length,
      realQuotesCount,
      pendingProvidersCount,
      failedProvidersCount,
    },
    beta: true,
    message: "Cotización multicourier preparada. No genera orden ni cobro.",
  };
}

export async function getDelivereoQuoteForEcuador(body: EcuadorQuoteRequestBody) {
  const response = await getEcuadorQuotes(body);
  return response.results.find((item) => item.providerId === "delivereo") ?? null;
}
