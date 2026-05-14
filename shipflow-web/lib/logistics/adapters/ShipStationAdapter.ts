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

type SSWeightUnits = "pounds" | "ounces" | "grams";
type SSDimensionUnits = "inches" | "centimeters";

type SSWeight = { value: number; units: SSWeightUnits };
type SSDimensions = { units: SSDimensionUnits; length: number; width: number; height: number };

type SSAddress = {
  name: string;
  company: string | null;
  street1: string;
  street2: string | null;
  street3: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  residential: boolean | null;
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
  weight: SSWeight;
  dimensions?: SSDimensions | null;
  confirmation: "none";
  residential: boolean;
};

type SSOrderPayload = {
  orderNumber: string;
  orderKey: string;
  orderDate: string;
  orderStatus: "awaiting_shipment";
  billTo: SSAddress;
  shipTo: SSAddress;
  items: Array<{
    lineItemKey: null;
    sku: null;
    name: string;
    imageUrl: null;
    weight: null;
    quantity: 1;
    unitPrice: 0;
  }>;
  weight: SSWeight;
  dimensions: null;
  internalNotes: null;
};

type SSOrderResponse = {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderStatus: string;
};

type SSLabelPayload = {
  orderId: number;
  carrierCode: string;
  serviceCode: string;
  packageCode: "package";
  confirmation: "none";
  shipDate: string;
  weight: SSWeight;
  dimensions: SSDimensions | null;
  insuranceOptions: null;
  internationalOptions: null;
  advancedOptions: null;
  testLabel: false;
};

type SSLabelResponse = {
  shipmentId: number;
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber: string;
  labelData: string | null;
  formData: string | null;
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

function buildSSAddress(
  city: string,
  state: string | undefined,
  postalCode: string,
  country: string | undefined,
  name: string,
  phone: string | undefined,
  street1: string | undefined,
): SSAddress {
  return {
    name: name.trim() || "Unknown",
    company: null,
    street1: street1?.trim() || "",
    street2: null,
    street3: null,
    city: city.trim(),
    state: state?.trim() || "",
    postalCode: postalCode.trim(),
    country: country?.trim() || "US",
    phone: phone?.trim() || null,
    residential: null,
  };
}

function buildSSDimensions(parcel: CreateLabelInput["parcel"]): SSDimensions | null {
  if (
    parcel.length != null && parcel.width != null && parcel.height != null &&
    parcel.length > 0 && parcel.width > 0 && parcel.height > 0
  ) {
    return {
      units: parcel.dimensionUnit === "cm" ? "centimeters" : "inches",
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
    };
  }
  return null;
}

function buildSSOrderPayload(input: CreateLabelInput): SSOrderPayload {
  return {
    orderNumber: input.idempotencyKey,
    orderKey: input.idempotencyKey,
    orderDate: new Date().toISOString(),
    orderStatus: "awaiting_shipment",
    billTo: buildSSAddress(
      input.origin.city,
      input.origin.state,
      input.origin.postalCode!,
      input.origin.country,
      input.senderName || "Sender",
      input.senderPhone,
      input.origin.line1,
    ),
    shipTo: buildSSAddress(
      input.destination.city,
      input.destination.state,
      input.destination.postalCode!,
      input.destination.country,
      input.recipientName || "Recipient",
      input.recipientPhone,
      input.destination.line1 || input.destinationAddress,
    ),
    items: [
      {
        lineItemKey: null,
        sku: null,
        name: input.productType?.trim() || "Package",
        imageUrl: null,
        weight: null,
        quantity: 1,
        unitPrice: 0,
      },
    ],
    weight: { value: input.parcel.weight, units: toSSWeightUnits(input.parcel.weightUnit) },
    dimensions: null,
    internalNotes: null,
  };
}

function buildSSLabelPayload(
  orderId: number,
  carrierCode: string,
  serviceCode: string,
  input: CreateLabelInput,
): SSLabelPayload {
  const shipDate = new Date().toISOString().split("T")[0] ?? "";
  return {
    orderId,
    carrierCode,
    serviceCode,
    packageCode: "package",
    confirmation: "none",
    shipDate,
    weight: { value: input.parcel.weight, units: toSSWeightUnits(input.parcel.weightUnit) },
    dimensions: buildSSDimensions(input.parcel),
    insuranceOptions: null,
    internationalOptions: null,
    advancedOptions: null,
    testLabel: false,
  };
}

function handleShipStationLabelHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(
      "ShipStation rejected the label request: check SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET.",
    );
  }
  if (status === 429) throw new ProviderRateLimitError();
  if (status === 404) {
    throw new InvalidPayloadError(
      "ShipStation could not find the requested service or order. Verify carrierCode and serviceCode.",
    );
  }
  if (status === 400 || status === 422) {
    throw new InvalidPayloadError(
      "ShipStation rejected the label request. Verify carrier code, service code, postal codes, and weight.",
    );
  }
  throw new ProviderUnavailableError(
    `ShipStation returned an unexpected error creating the label (HTTP ${status}).`,
  );
}

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

  async createLabel(input: CreateLabelInput): Promise<LabelResult> {
    const config = readConfig();

    const carrierCode = (input.carrierCode ?? input.courier)?.trim();
    const serviceCode = input.serviceCode?.trim();

    if (!carrierCode) {
      throw new InvalidPayloadError(
        "carrierCode (or courier) is required for ShipStation labels. " +
          "Example: stamps_com, ups, fedex, dhl_express.",
      );
    }
    if (!serviceCode) {
      throw new InvalidPayloadError(
        "serviceCode is required for ShipStation labels. " +
          "Get serviceCode from POST /api/rates with provider: \"shipstation\".",
      );
    }

    const fromPostalCode = input.origin.postalCode?.trim() ?? "";
    const toPostalCode = input.destination.postalCode?.trim() ?? "";
    if (!fromPostalCode) {
      throw new InvalidAddressError("origin.postalCode is required for ShipStation labels.");
    }
    if (!toPostalCode) {
      throw new InvalidAddressError("destination.postalCode is required for ShipStation labels.");
    }
    if (!Number.isFinite(input.parcel.weight) || input.parcel.weight <= 0) {
      throw new InvalidPayloadError("parcel.weight must be a positive number for ShipStation labels.");
    }

    const authHeader = buildAuthHeader(config);

    // Step 1: Create/update the ShipStation order (idempotent via orderKey = idempotencyKey).
    const orderPayload = buildSSOrderPayload(input);
    let orderResponse: SSOrderResponse;
    let orderHttpResponse: Response;
    try {
      orderHttpResponse = await fetch(`${config.baseUrl}/orders/createorder`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(orderPayload),
      });
    } catch (err) {
      if (err instanceof LogisticsError) throw err;
      if (err instanceof Error && err.name === "AbortError") throw new ProviderTimeoutError();
      throw new ProviderUnavailableError(
        "Could not reach ShipStation to create the order. Check network and SHIPSTATION_BASE_URL.",
      );
    }
    if (!orderHttpResponse.ok) {
      handleShipStationHttpError(orderHttpResponse.status);
    }
    try {
      orderResponse = (await orderHttpResponse.json()) as SSOrderResponse;
    } catch {
      throw new ProviderUnavailableError("ShipStation returned an unreadable order response.");
    }
    if (!orderResponse?.orderId) {
      throw new ProviderUnavailableError("ShipStation did not return a valid order ID.");
    }

    // Step 2: Purchase label for the order. This charges the ShipStation account.
    const labelPayload = buildSSLabelPayload(orderResponse.orderId, carrierCode, serviceCode, input);
    let labelHttpResponse: Response;
    let labelResponse: SSLabelResponse;
    try {
      labelHttpResponse = await fetch(`${config.baseUrl}/orders/createlabelfororder`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(labelPayload),
      });
    } catch (err) {
      if (err instanceof LogisticsError) throw err;
      if (err instanceof Error && err.name === "AbortError") throw new ProviderTimeoutError();
      throw new ProviderUnavailableError(
        "Could not reach ShipStation to create the label. Check network and SHIPSTATION_BASE_URL.",
      );
    }
    if (!labelHttpResponse.ok) {
      handleShipStationLabelHttpError(labelHttpResponse.status);
    }
    try {
      labelResponse = (await labelHttpResponse.json()) as SSLabelResponse;
    } catch {
      throw new ProviderUnavailableError("ShipStation returned an unreadable label response.");
    }
    if (!labelResponse?.trackingNumber) {
      throw new ProviderUnavailableError("ShipStation did not return a tracking number for the label.");
    }

    // Build normalized result. V1 returns base64 labelData, not a URL — labelUrl is null.
    const providerCost = Number(
      ((labelResponse.shipmentCost ?? 0) + (labelResponse.insuranceCost ?? 0)).toFixed(2),
    );
    const pricing = applyMarkup(providerCost, 0);

    const rate: RateResult = {
      provider: "shipstation",
      serviceCode,
      serviceName: serviceCode,
      courierId: carrierCode,
      courierName: carrierCode,
      shippingSubtotal: providerCost,
      cashOnDeliveryCommission: 0,
      total: pricing.customerPrice,
      currency: "USD",
      platformMarkup: pricing.platformMarkup,
      customerPrice: pricing.customerPrice,
      pricing,
    };

    return {
      provider: "shipstation",
      trackingNumber: labelResponse.trackingNumber,
      labelStatus: "purchased",
      labelUrl: null,
      rate,
      message: "ShipStation label purchased successfully via V1 API.",
      providerShipmentId: String(labelResponse.shipmentId),
      providerLabelId: String(labelResponse.shipmentId),
      providerServiceCode: serviceCode,
    };
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
