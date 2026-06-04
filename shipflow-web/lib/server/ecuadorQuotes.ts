import "server-only";

import { getEcuadorProvider } from "@/lib/ecuador/providers";
import { getDelivereoNotConfiguredMessage } from "@/lib/ecuador/providers/delivereoProvider";
import type { EcuadorQuoteInput, EcuadorQuoteRequestBody, EcuadorQuoteResult } from "@/lib/ecuador/types";
import { normalizeCreateEcuadorShipmentRequestInput } from "@/lib/server/regionalShipments";
import { formatDelivereoApiError } from "@/lib/server/delivereoHttp";

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

export async function getDelivereoQuoteForEcuador(body: EcuadorQuoteRequestBody): Promise<EcuadorQuoteResult> {
  const provider = getEcuadorProvider("delivereo");
  return provider.quote(buildEcuadorQuoteInput(body));
}

export function toSafeDelivereoQuoteError(error: unknown): Response {
  if (error instanceof Error && error.message === getDelivereoNotConfiguredMessage()) {
    return new Response("Delivereo quote calculation is not configured yet.", { status: 503 });
  }

  const safe = formatDelivereoApiError(error);
  return new Response(
    JSON.stringify({
      error: safe.error,
      stage: safe.stage,
      status: safe.status,
      details: safe.details,
      providerMessage: safe.providerMessage ?? null,
    }),
    {
      status: safe.status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
