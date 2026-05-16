import {
  InvalidAddressError,
  InvalidPayloadError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "@/lib/logistics/errors";
import { applyMarkup } from "@/lib/logistics/pricing";
import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type {
  CreateLabelInput,
  LabelResult,
  RateInput,
  RateResult,
  VoidLabelInput,
  VoidLabelResult,
} from "@/lib/logistics/types";

// Shippo API v1 — rates only. Label creation is not yet implemented.
// Auth: Authorization: ShippoToken <SHIPPO_API_KEY>
// Docs: https://docs.goshippo.com/shippoapi/public-api/
const SHIPPO_API_URL = "https://api.goshippo.com";

type ShippoAddress = {
  name?: string;
  phone?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type ShippoParcel = {
  length?: string;
  width?: string;
  height?: string;
  distance_unit?: "in" | "cm";
  weight: string;
  mass_unit: "lb" | "oz" | "kg" | "g";
};

type ShippoShipmentPayload = {
  address_from: ShippoAddress;
  address_to: ShippoAddress;
  parcels: ShippoParcel[];
  async: false;
};

type ShippoServiceLevel = {
  name: string;
  token: string;
};

type ShippoRate = {
  object_id: string;
  provider: string;           // e.g. "USPS", "UPS", "FedEx"
  provider_image_75?: string;
  servicelevel: ShippoServiceLevel;
  amount: string;             // decimal string, e.g. "6.29"
  amount_local?: string;
  currency: string;
  currency_local?: string;
  estimated_days: number | null;
  duration_terms?: string | null;
  arrives_by?: string | null;
};

type ShippoShipmentResponse = {
  object_id?: string;
  status?: string;
  rates?: ShippoRate[];
  messages?: Array<{ code: string; text: string; source?: string }>;
};

function toShippoMassUnit(unit?: string): "lb" | "oz" | "kg" | "g" {
  if (unit === "oz") return "oz";
  if (unit === "kg") return "kg";
  return "lb";
}

function toShippoDistanceUnit(unit?: string): "in" | "cm" {
  if (unit === "cm") return "cm";
  return "in";
}

function buildShippoAddress(
  city: string,
  state?: string,
  postalCode?: string,
  country?: string,
  name?: string,
  phone?: string,
  street1?: string,
): ShippoAddress {
  return {
    name: name?.trim() || undefined,
    phone: phone?.trim() || undefined,
    street1: street1?.trim() || "",
    city: city.trim(),
    state: state?.trim() ?? "",
    zip: postalCode?.trim() ?? "",
    country: country?.trim() ?? "US",
  };
}

function handleShippoHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(
      "Shippo rejected the request: check SHIPPO_API_KEY.",
    );
  }
  if (status === 429) throw new ProviderRateLimitError();
  if (status === 400 || status === 422) {
    throw new InvalidPayloadError(
      "Shippo rejected the payload. Verify addresses, postal codes, and parcel weight.",
    );
  }
  throw new ProviderUnavailableError(
    `Shippo returned an unexpected error (HTTP ${status}).`,
  );
}

function mapFromShippoRates(rates: ShippoRate[]): RateResult[] {
  return rates
    .filter((r) => r.provider && r.servicelevel?.token && r.amount)
    .map((rate) => {
      const providerCost = Number(parseFloat(rate.amount).toFixed(2));
      const pricing = applyMarkup(providerCost, 0);
      const days = rate.estimated_days;
      const estimatedTime = days != null ? `${days} day(s)` : undefined;

      return {
        provider: "shippo" as const,
        providerRateId: rate.object_id,
        serviceCode: rate.servicelevel.token ?? "",
        serviceName: rate.servicelevel.name ?? "",
        courierId: rate.provider ?? "",
        courierName: rate.provider ?? "",
        shippingSubtotal: providerCost,
        cashOnDeliveryCommission: 0,
        total: pricing.customerPrice,
        currency: "USD" as const,
        platformMarkup: pricing.platformMarkup,
        customerPrice: pricing.customerPrice,
        estimatedTime,
        pricing,
      };
    });
}

export class ShippoAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.SHIPPO_API_KEY?.trim();
  }

  async getRates(input: RateInput): Promise<RateResult[]> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "Shippo is not configured: SHIPPO_API_KEY is missing.",
      );
    }

    const fromPostalCode = input.origin.postalCode?.trim() ?? "";
    const toPostalCode = input.destination.postalCode?.trim() ?? "";

    if (!fromPostalCode) {
      throw new InvalidAddressError(
        "origin.postalCode is required for Shippo rates.",
      );
    }
    if (!toPostalCode) {
      throw new InvalidAddressError(
        "destination.postalCode is required for Shippo rates.",
      );
    }
    if (!Number.isFinite(input.parcel.weight) || input.parcel.weight <= 0) {
      throw new InvalidPayloadError(
        "parcel.weight must be a positive number for Shippo rates.",
      );
    }

    const fromAddress = buildShippoAddress(
      input.origin.city ?? "",
      input.origin.state,
      fromPostalCode,
      input.origin.country,
      input.origin.name,
      input.origin.phone,
      input.origin.line1,
    );
    const toAddress = buildShippoAddress(
      input.destination.city ?? "",
      input.destination.state,
      toPostalCode,
      input.destination.country,
      input.destination.name,
      input.destination.phone,
      input.destination.line1,
    );

    const parcel: ShippoParcel = {
      weight: String(input.parcel.weight),
      mass_unit: toShippoMassUnit(input.parcel.weightUnit),
    };

    if (
      input.parcel.length != null && input.parcel.width != null &&
      input.parcel.height != null && input.parcel.length > 0 &&
      input.parcel.width > 0 && input.parcel.height > 0
    ) {
      parcel.length = String(input.parcel.length);
      parcel.width = String(input.parcel.width);
      parcel.height = String(input.parcel.height);
      parcel.distance_unit = toShippoDistanceUnit(input.parcel.dimensionUnit);
    }

    const body: ShippoShipmentPayload = {
      address_from: fromAddress,
      address_to: toAddress,
      parcels: [parcel],
      async: false,
    };

    const authHeader = `ShippoToken ${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(`${SHIPPO_API_URL}/shipments/`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError();
      }
      throw new ProviderUnavailableError(
        "Could not reach Shippo. Check network connectivity.",
      );
    }

    if (!response.ok) {
      handleShippoHttpError(response.status);
    }

    let data: ShippoShipmentResponse;
    try {
      data = (await response.json()) as ShippoShipmentResponse;
    } catch {
      throw new ProviderUnavailableError("Shippo returned an unreadable response.");
    }

    if (!Array.isArray(data.rates) || data.rates.length === 0) {
      throw new ProviderUnavailableError(
        "Shippo returned no rates for the given addresses. " +
          "Verify postal codes, country, and that your Shippo account has connected carriers.",
      );
    }

    const mapped = mapFromShippoRates(data.rates);
    if (mapped.length === 0) {
      throw new ProviderUnavailableError(
        "Shippo returned rates but none could be parsed. Verify carrier and service data.",
      );
    }

    return mapped;
  }

  async createLabel(_: CreateLabelInput): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "Shippo label creation is not yet implemented. Only rates are supported in this version.",
    );
  }

  async voidLabel(_: VoidLabelInput): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "Shippo void is not yet implemented.",
    );
  }
}
