import {
  InvalidAddressError,
  InvalidPayloadError,
  LogisticsError,
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
  TrackingInput,
  TrackingResult,
  VoidLabelInput,
  VoidLabelResult,
} from "@/lib/logistics/types";

type ShipStationConfig = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
};

type ShipStationRatePayload = {
  carrierCode: string;
  serviceCode: null;
  packageCode: null;
  fromPostalCode: string;
  toPostalCode: string;
  toCity: string;
  toState: string;
  toCountry: string;
  weight: {
    value: number;
    units: "pounds" | "ounces" | "grams";
  };
  dimensions?: {
    units: "inches" | "centimeters";
    length: number;
    width: number;
    height: number;
  } | null;
  confirmation: "none";
  residential: boolean;
};

type ShipStationRateItem = {
  serviceName: string;
  serviceCode: string;
  shipmentCost: number;
  otherCost: number;
  transitDays: number | null;
  deliveryDate: string | null;
  deliveryDateGuaranteed: boolean;
};

function readConfig(): ShipStationConfig {
  const apiKey = process.env.SHIPSTATION_API_KEY?.trim() ?? "";
  const apiSecret = process.env.SHIPSTATION_API_SECRET?.trim() ?? "";
  const baseUrl =
    process.env.SHIPSTATION_BASE_URL?.trim() ?? "https://ssapi.shipstation.com";

  if (!apiKey) {
    throw new ProviderUnavailableError(
      "ShipStation is not configured: SHIPSTATION_API_KEY is missing.",
    );
  }

  if (!baseUrl.startsWith("https://")) {
    throw new ProviderUnavailableError(
      "ShipStation base URL is not valid. Expected an https:// URL.",
    );
  }

  return { apiKey, apiSecret, baseUrl };
}

function buildAuthHeader(config: ShipStationConfig): string {
  // ShipStation V1 uses Basic Auth: base64(apiKey:apiSecret).
  // If only the API key is configured, use apiKey as the username with an empty password.
  const credentials = `${config.apiKey}:${config.apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function toSSWeightUnits(unit: string | undefined): "pounds" | "ounces" | "grams" {
  if (unit === "oz") return "ounces";
  if (unit === "kg") return "grams";
  return "pounds";
}

function mapToShipStationPayload(input: RateInput, carrierCode: string): ShipStationRatePayload {
  const fromPostalCode = input.origin.postalCode?.trim() ?? "";
  const toPostalCode = input.destination.postalCode?.trim() ?? "";

  if (!fromPostalCode) {
    throw new InvalidAddressError(
      "origin.postalCode is required for ShipStation rates.",
    );
  }
  if (!toPostalCode) {
    throw new InvalidAddressError(
      "destination.postalCode is required for ShipStation rates.",
    );
  }

  if (!Number.isFinite(input.parcel.weight) || input.parcel.weight <= 0) {
    throw new InvalidPayloadError(
      "parcel.weight must be a positive number for ShipStation rates.",
    );
  }

  const payload: ShipStationRatePayload = {
    carrierCode,
    serviceCode: null,
    packageCode: null,
    fromPostalCode,
    toPostalCode,
    toCity: input.destination.city ?? "",
    toState: input.destination.state ?? "",
    toCountry: input.destination.country ?? "US",
    weight: {
      value: input.parcel.weight,
      units: toSSWeightUnits(input.parcel.weightUnit),
    },
    dimensions: null,
    confirmation: "none",
    residential: false,
  };

  if (
    input.parcel.length != null &&
    input.parcel.width != null &&
    input.parcel.height != null &&
    input.parcel.length > 0 &&
    input.parcel.width > 0 &&
    input.parcel.height > 0
  ) {
    payload.dimensions = {
      units: input.parcel.dimensionUnit === "cm" ? "centimeters" : "inches",
      length: input.parcel.length,
      width: input.parcel.width,
      height: input.parcel.height,
    };
  }

  return payload;
}

function mapFromShipStationRates(items: ShipStationRateItem[], carrierCode: string): RateResult[] {
  return items.map((item) => {
    const providerCost = Number(((item.shipmentCost ?? 0) + (item.otherCost ?? 0)).toFixed(2));
    const pricing = applyMarkup(providerCost, 0);
    const estimatedTime =
      item.transitDays != null ? `${item.transitDays} day(s)` : undefined;

    return {
      provider: "shipstation",
      serviceCode: item.serviceCode ?? "",
      serviceName: item.serviceName ?? "",
      courierId: carrierCode,
      courierName: carrierCode,
      shippingSubtotal: providerCost,
      cashOnDeliveryCommission: 0,
      total: pricing.customerPrice,
      currency: "USD",
      platformMarkup: pricing.platformMarkup,
      customerPrice: pricing.customerPrice,
      estimatedTime,
      pricing,
    };
  });
}

function handleShipStationHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(
      "ShipStation rejected the request: check SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET.",
    );
  }
  if (status === 429) {
    throw new ProviderRateLimitError();
  }
  if (status === 400) {
    throw new InvalidPayloadError(
      "ShipStation rejected the payload. Verify carrier code, postal codes, and weight.",
    );
  }
  throw new ProviderUnavailableError(
    `ShipStation returned an unexpected error (HTTP ${status}).`,
  );
}

export class ShipStationAdapter implements LogisticsAdapter {
  async getRates(input: RateInput): Promise<RateResult[]> {
    const config = readConfig();

    const carrierCode = input.courier?.trim();
    if (!carrierCode) {
      throw new InvalidPayloadError(
        "courier (carrier code) is required for ShipStation rates. " +
          "Example: stamps_com, ups, fedex, dhl_express.",
      );
    }

    const payload = mapToShipStationPayload(input, carrierCode);
    const authHeader = buildAuthHeader(config);

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/shipments/getrates`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError();
      }
      throw new ProviderUnavailableError(
        "Could not reach ShipStation. Check network connectivity and SHIPSTATION_BASE_URL.",
      );
    }

    if (!response.ok) {
      handleShipStationHttpError(response.status);
    }

    let rates: ShipStationRateItem[];
    try {
      rates = (await response.json()) as ShipStationRateItem[];
    } catch {
      throw new ProviderUnavailableError(
        "ShipStation returned an unreadable response.",
      );
    }

    if (!Array.isArray(rates)) {
      throw new ProviderUnavailableError(
        "ShipStation returned an unexpected response format.",
      );
    }

    if (rates.length === 0) {
      throw new ProviderUnavailableError(
        "ShipStation returned no rates for the given address and carrier. " +
          "Check postal codes and that the carrier is connected to your ShipStation account.",
      );
    }

    return mapFromShipStationRates(rates, carrierCode);
  }

  async createLabel(_input: CreateLabelInput): Promise<LabelResult> {
    throw new LogisticsError(
      "ShipStation label creation is not implemented in FASE 4A. " +
        "Use the internal provider for label creation until FASE 4B is complete.",
      "NOT_IMPLEMENTED",
      501,
    );
  }

  async voidLabel(_input: VoidLabelInput): Promise<VoidLabelResult> {
    throw new LogisticsError(
      "ShipStation void is not implemented yet.",
      "NOT_IMPLEMENTED",
      501,
    );
  }

  async trackShipment(_input: TrackingInput): Promise<TrackingResult> {
    throw new LogisticsError(
      "ShipStation tracking via adapter is not implemented yet.",
      "NOT_IMPLEMENTED",
      501,
    );
  }
}
