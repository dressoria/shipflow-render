import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { calculateInternalRates, type RateRequestInput } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { InvalidPayloadError } from "@/lib/logistics/errors";
import type { Address, Parcel, RateInput } from "@/lib/logistics/types";

type ShipStationRateBody = {
  provider: "shipstation";
  origin: Address;
  destination: Address;
  parcel: Parcel;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

type InternalRateBody = RateRequestInput & {
  provider?: "internal" | "mock";
};

function isShipStationRequest(body: unknown): body is ShipStationRateBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).provider === "shipstation"
  );
}

function parseShipStationRateInput(body: ShipStationRateBody): RateInput {
  const { origin, destination, parcel, courier, cashOnDelivery, cashAmount } = body;

  if (!origin || typeof origin.city !== "string" || !origin.city.trim()) {
    throw new InvalidPayloadError("origin.city is required for ShipStation rates.");
  }
  if (!destination || typeof destination.city !== "string" || !destination.city.trim()) {
    throw new InvalidPayloadError("destination.city is required for ShipStation rates.");
  }
  if (!parcel || !Number.isFinite(Number(parcel.weight)) || Number(parcel.weight) <= 0) {
    throw new InvalidPayloadError("parcel.weight must be a positive number.");
  }

  return {
    origin,
    destination,
    parcel: {
      ...parcel,
      weight: Number(parcel.weight),
    },
    courier: typeof courier === "string" ? courier.trim() || undefined : undefined,
    cashOnDelivery: Boolean(cashOnDelivery),
    cashAmount: Number(cashAmount ?? 0),
  };
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase } = await requireSupabaseUser(request);
    const body = (await request.json()) as unknown;

    if (isShipStationRequest(body)) {
      const rateInput = parseShipStationRateInput(body);
      const adapter = getLogisticsAdapter("shipstation");
      const rates = await adapter.getRates(rateInput);

      return apiSuccess({
        provider: "shipstation",
        rates,
        message:
          "ShipStation rates. Live external provider was contacted. " +
          "These are real rates — do not create labels until FASE 4B is complete.",
      });
    }

    // Default: internal/mock
    const rates = await calculateInternalRates(supabase, body as InternalRateBody);

    return apiSuccess({
      provider: "internal",
      rates,
      message: "Internal ShipFlow rates. No external provider was contacted.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not calculate rates.");
  }
}
