import "server-only";

import { getEcuadorProvider } from "@/lib/ecuador/providers";
import { getDelivereoNotConfiguredMessage } from "@/lib/ecuador/providers/delivereoProvider";
import type { EcuadorQuoteInput, EcuadorQuoteRequestBody, EcuadorQuoteResult } from "@/lib/ecuador/types";
import { normalizeCreateEcuadorShipmentRequestInput } from "@/lib/server/regionalShipments";

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
    },
    destination: {
      name: normalized.destinationName,
      phone: normalized.destinationPhone,
      city: normalized.destinationCity,
      addressLine: normalized.destinationAddress,
      reference: normalized.destinationReference || undefined,
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
  if (error instanceof Response) return error;

  if (error instanceof Error && error.message === getDelivereoNotConfiguredMessage()) {
    return new Response("Delivereo quote calculation is not configured yet.", { status: 503 });
  }

  if (error instanceof Error) {
    return new Response(error.message || "No pudimos calcular la cotización beta de Ecuador.", { status: 400 });
  }

  return new Response("No pudimos calcular la cotización beta de Ecuador.", { status: 500 });
}
