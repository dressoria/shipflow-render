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
import type { LabelResult, RateInput, RateResult, VoidLabelResult } from "@/lib/logistics/types";

type EasyshipCourierService = {
  id?: string;
  name?: string;
  umbrella_name?: string;
};

type EasyshipRate = {
  courier_service?: EasyshipCourierService;
  currency?: string;
  total_charge?: string | number;
  min_delivery_time?: number | null;
  max_delivery_time?: number | null;
  full_description?: string;
  available_handover_options?: string[];
};

type EasyshipRatesResponse = {
  rates?: EasyshipRate[];
};

type EasyshipAddress = {
  line_1: string;
  line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country_alpha2: "US";
  contact_name: string;
  contact_phone: string;
};

function toEasyshipWeightUnit(unit?: string): "lb" | "oz" | "kg" {
  if (unit === "oz") return "oz";
  if (unit === "kg") return "kg";
  return "lb";
}

function toEasyshipDimensionUnit(unit?: string): "in" | "cm" {
  if (unit === "cm") return "cm";
  return "in";
}

function buildEasyshipAddress(address: RateInput["origin"], fallbackName: string): EasyshipAddress {
  const line1 = address.line1?.trim() ?? "";
  const city = address.city?.trim() ?? "";
  const state = address.state?.trim() ?? "";
  const postalCode = address.postalCode?.trim() ?? "";

  if (!line1 || !city || !state || !postalCode) {
    throw new InvalidAddressError(
      "Complete street, city, state, and ZIP for Easyship rates.",
    );
  }
  if ((address.country ?? "US") !== "US") {
    throw new InvalidAddressError("Only US domestic Easyship rates are supported right now.");
  }

  return {
    line_1: line1,
    line_2: address.line2?.trim() || undefined,
    city,
    state,
    postal_code: postalCode,
    country_alpha2: "US",
    contact_name: address.name?.trim() || fallbackName,
    contact_phone: address.phone?.trim() || "5555555555",
  };
}

function buildEasyshipPayload(input: RateInput) {
  const parcel = input.parcel;
  if (!Number.isFinite(parcel.weight) || parcel.weight <= 0) {
    throw new InvalidPayloadError("parcel.weight must be a positive number for Easyship rates.");
  }
  if (
    parcel.length == null ||
    parcel.width == null ||
    parcel.height == null ||
    parcel.length <= 0 ||
    parcel.width <= 0 ||
    parcel.height <= 0
  ) {
    throw new InvalidPayloadError(
      "parcel length, width, and height must be positive numbers for Easyship rates.",
    );
  }

  return {
    origin_address: buildEasyshipAddress(input.origin, "Sender"),
    destination_address: buildEasyshipAddress(input.destination, "Recipient"),
    incoterms: "DDU",
    insurance: {
      is_insured: false,
    },
    shipping_settings: {
      units: {
        weight: toEasyshipWeightUnit(parcel.weightUnit),
        dimensions: toEasyshipDimensionUnit(parcel.dimensionUnit),
      },
    },
    parcels: [
      {
        box: {
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
        },
        items: [
          {
            description: "General merchandise",
            sku: "SHIPFLOW-ITEM",
            quantity: 1,
            actual_weight: parcel.weight,
            hs_code: "610910",
            declared_currency: "USD",
            declared_customs_value: 10,
          },
        ],
      },
    ],
  };
}

function handleEasyshipHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new ProviderAuthError("Easyship rejected the request: check EASYSHIP_API_KEY.");
  }
  if (status === 429) throw new ProviderRateLimitError();
  if (status === 400 || status === 422) {
    throw new InvalidPayloadError(
      "Easyship rejected the payload. Verify address, ZIP, dimensions, weight, and item data.",
    );
  }
  throw new ProviderUnavailableError(
    `Easyship returned an unexpected error (HTTP ${status}).`,
  );
}

function estimatedTime(min?: number | null, max?: number | null): string | undefined {
  if (min == null && max == null) return undefined;
  if (min != null && max != null && min !== max) return `${min}-${max} day(s)`;
  const days = max ?? min;
  return days != null ? `${days} day(s)` : undefined;
}

function stableRateId(rate: EasyshipRate): string {
  const service = rate.courier_service;
  return [
    service?.id,
    service?.umbrella_name,
    service?.name,
    rate.total_charge,
    rate.min_delivery_time,
    rate.max_delivery_time,
  ]
    .filter(Boolean)
    .join(":");
}

function mapFromEasyshipRates(rates: EasyshipRate[]): RateResult[] {
  return rates
    .filter((rate) => {
      const providerCost = Number(rate.total_charge);
      const currency = rate.currency?.toUpperCase();
      return (
        Number.isFinite(providerCost) &&
        providerCost > 0 &&
        currency === "USD" &&
        Boolean(rate.courier_service?.name)
      );
    })
    .map((rate) => {
      const providerCost = Number(Number(rate.total_charge).toFixed(2));
      const pricing = applyMarkup(providerCost, 0);
      const service = rate.courier_service!;
      const courierName = service.umbrella_name || service.name || "";
      const serviceName = service.name || courierName;

      return {
        provider: "easyship" as const,
        providerRateId: service.id || stableRateId(rate),
        supportsLabels: false,
        serviceCode: service.id || serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        serviceName,
        courierId: courierName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        courierName,
        shippingSubtotal: providerCost,
        cashOnDeliveryCommission: 0,
        total: pricing.customerPrice,
        currency: "USD" as const,
        platformMarkup: pricing.platformMarkup,
        customerPrice: pricing.customerPrice,
        estimatedTime: estimatedTime(rate.min_delivery_time, rate.max_delivery_time),
        pricing,
      };
    });
}

export class EasyshipAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;

  constructor() {
    this.apiKey = process.env.EASYSHIP_API_KEY?.trim();
    this.baseUrl = process.env.EASYSHIP_BASE_URL?.trim()?.replace(/\/$/, "");
  }

  async getRates(input: RateInput): Promise<RateResult[]> {
    if (!this.apiKey || !this.baseUrl?.startsWith("https://")) {
      throw new ProviderUnavailableError(
        "Easyship is not configured: EASYSHIP_API_KEY and EASYSHIP_BASE_URL are required.",
      );
    }

    const body = buildEasyshipPayload(input);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/2024-09/rates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
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
        "Could not reach Easyship. Check network connectivity and EASYSHIP_BASE_URL.",
      );
    }

    if (!response.ok) {
      handleEasyshipHttpError(response.status);
    }

    let data: EasyshipRatesResponse;
    try {
      data = (await response.json()) as EasyshipRatesResponse;
    } catch {
      throw new ProviderUnavailableError("Easyship returned an unreadable response.");
    }

    const mapped = mapFromEasyshipRates(data.rates ?? []);
    if (mapped.length === 0) {
      throw new ProviderUnavailableError(
        "Easyship returned no valid rates for the given address and package.",
      );
    }

    return mapped;
  }

  async createLabel(): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "Easyship label creation is not yet implemented. Only rates are supported in this version.",
    );
  }

  async voidLabel(): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "Easyship void is not yet implemented.",
    );
  }
}
