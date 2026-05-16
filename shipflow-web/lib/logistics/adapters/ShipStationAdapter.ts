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
  TrackingResult,
  VoidLabelInput,
  VoidLabelResult,
} from "@/lib/logistics/types";

type ShipStationConfig = {
  apiMode: "legacy" | "shipengine";
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

type ShipEngineService = {
  service_code?: string;
  name?: string;
  supports_rates?: boolean;
  send_rates?: boolean;
};

type ShipEngineCarrier = {
  carrier_id?: string;
  carrier_code?: string;
  friendly_name?: string;
  disabled_by_billing_plan?: boolean;
  services?: ShipEngineService[];
};

type ShipEngineCarriersResponse = {
  carriers?: ShipEngineCarrier[];
};

type ShipEngineMoney = {
  amount?: string | number;
  currency?: string;
};

type ShipEngineRateItem = {
  rate_id?: string;
  service_type?: string;
  service_code?: string;
  carrier_code?: string;
  carrier_friendly_name?: string;
  shipping_amount?: ShipEngineMoney;
  delivery_days?: number | null;
  estimated_delivery_date?: string | null;
  validation_status?: string;
  error_messages?: string[];
};

type ShipEngineRatesResponse = {
  rate_response?: {
    rates?: ShipEngineRateItem[];
    invalid_rates?: unknown[];
    errors?: unknown[];
  };
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
  const apiMode =
    process.env.SHIPSTATION_API_MODE?.trim().toLowerCase() === "shipengine"
      ? "shipengine"
      : "legacy";
  const apiKey = process.env.SHIPSTATION_API_KEY?.trim() ?? "";
  const apiSecret = process.env.SHIPSTATION_API_SECRET?.trim() ?? "";
  const baseUrl =
    process.env.SHIPSTATION_BASE_URL?.trim() ??
    (apiMode === "shipengine" ? "https://api.shipengine.com/v1" : "https://ssapi.shipstation.com");

  if (!apiKey) {
    throw new ProviderUnavailableError(
      "ShipStation is not configured: SHIPSTATION_API_KEY is missing.",
    );
  }

  if (apiMode === "legacy" && !apiSecret) {
    throw new ProviderUnavailableError(
      "ShipStation legacy mode is not configured: SHIPSTATION_API_SECRET is missing.",
    );
  }

  if (!baseUrl.startsWith("https://")) {
    throw new ProviderUnavailableError(
      "ShipStation base URL is not valid. Expected an https:// URL.",
    );
  }

  return { apiMode, apiKey, apiSecret, baseUrl: baseUrl.replace(/\/$/, "") };
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

function toShipEngineWeightUnit(unit: string | undefined): "pound" | "ounce" | "gram" {
  if (unit === "oz") return "ounce";
  if (unit === "kg") return "gram";
  return "pound";
}

function toShipEngineDimensionUnit(unit: string | undefined): "inch" | "centimeter" {
  if (unit === "cm") return "centimeter";
  return "inch";
}

function hasRateService(carrier: ShipEngineCarrier): boolean {
  const services = carrier.services ?? [];
  if (services.length === 0) return true;
  return services.some((service) => service.supports_rates !== false && service.send_rates !== false);
}

function activeShipEngineCarrierIds(carriers: ShipEngineCarrier[]): string[] {
  return carriers
    .filter((carrier) => {
      return (
        Boolean(carrier.carrier_id?.trim()) &&
        carrier.disabled_by_billing_plan !== true &&
        hasRateService(carrier)
      );
    })
    .map((carrier) => carrier.carrier_id!.trim());
}

async function fetchShipEngineCarriers(config: ShipStationConfig): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/carriers`, {
      method: "GET",
      headers: {
        "API-Key": config.apiKey,
        Accept: "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new ProviderTimeoutError();
    throw new ProviderUnavailableError(
      "Could not reach ShipEngine carriers endpoint. Check network connectivity and SHIPSTATION_BASE_URL.",
    );
  }

  if (!response.ok) {
    handleShipStationHttpError(response.status, "shipengine");
  }

  let data: ShipEngineCarriersResponse;
  try {
    data = (await response.json()) as ShipEngineCarriersResponse;
  } catch {
    throw new ProviderUnavailableError("ShipEngine returned an unreadable carriers response.");
  }

  const carrierIds = activeShipEngineCarrierIds(data.carriers ?? []);
  if (carrierIds.length === 0) {
    throw new ProviderUnavailableError(
      "ShipEngine returned no active carriers that can provide rates.",
    );
  }

  return carrierIds;
}

function requireShipEngineAddress(input: RateInput): void {
  const required = [
    input.origin.line1,
    input.origin.city,
    input.origin.state,
    input.origin.postalCode,
    input.destination.line1,
    input.destination.city,
    input.destination.state,
    input.destination.postalCode,
  ];
  if (required.some((value) => !value?.trim())) {
    throw new InvalidAddressError(
      "Complete street, city, state, and ZIP for origin and destination.",
    );
  }
  if ((input.origin.country ?? "US") !== "US" || (input.destination.country ?? "US") !== "US") {
    throw new InvalidAddressError("Only US domestic ShipEngine rates are supported right now.");
  }
}

function buildShipEngineRatesPayload(input: RateInput, carrierIds: string[]) {
  requireShipEngineAddress(input);

  if (!Number.isFinite(input.parcel.weight) || input.parcel.weight <= 0) {
    throw new InvalidPayloadError(
      "parcel.weight must be a positive number for ShipEngine rates.",
    );
  }
  if (
    input.parcel.length == null ||
    input.parcel.width == null ||
    input.parcel.height == null ||
    input.parcel.length <= 0 ||
    input.parcel.width <= 0 ||
    input.parcel.height <= 0
  ) {
    throw new InvalidPayloadError(
      "parcel length, width, and height must be positive numbers for ShipEngine rates.",
    );
  }

  return {
    rate_options: {
      carrier_ids: carrierIds,
    },
    shipment: {
      validate_address: "no_validation",
      ship_to: {
        name: input.destination.name?.trim() || "Recipient",
        phone: input.destination.phone?.trim() || "5555555555",
        address_line1: input.destination.line1!.trim(),
        address_line2: input.destination.line2?.trim() || undefined,
        city_locality: input.destination.city.trim(),
        state_province: input.destination.state!.trim(),
        postal_code: input.destination.postalCode!.trim(),
        country_code: "US",
        address_residential_indicator: "yes",
      },
      ship_from: {
        name: input.origin.name?.trim() || "Sender",
        phone: input.origin.phone?.trim() || "5555555555",
        address_line1: input.origin.line1!.trim(),
        address_line2: input.origin.line2?.trim() || undefined,
        city_locality: input.origin.city.trim(),
        state_province: input.origin.state!.trim(),
        postal_code: input.origin.postalCode!.trim(),
        country_code: "US",
        address_residential_indicator: "no",
      },
      packages: [
        {
          weight: {
            value: input.parcel.weight,
            unit: toShipEngineWeightUnit(input.parcel.weightUnit),
          },
          dimensions: {
            unit: toShipEngineDimensionUnit(input.parcel.dimensionUnit),
            length: input.parcel.length,
            width: input.parcel.width,
            height: input.parcel.height,
          },
        },
      ],
    },
  };
}

function mapFromShipEngineRates(items: ShipEngineRateItem[]): RateResult[] {
  return items
    .filter((item) => {
      const amount = Number(item.shipping_amount?.amount);
      const currency = item.shipping_amount?.currency?.toUpperCase();
      return (
        item.rate_id &&
        Number.isFinite(amount) &&
        amount > 0 &&
        currency === "USD" &&
        (item.error_messages?.length ?? 0) === 0
      );
    })
    .map((item) => {
      const providerCost = Number(Number(item.shipping_amount!.amount).toFixed(2));
      const pricing = applyMarkup(providerCost, 0);
      const days = item.delivery_days;
      const estimatedTime = days != null ? `${days} day(s)` : undefined;

      return {
        provider: "shipstation" as const,
        providerRateId: item.rate_id,
        supportsLabels: false,
        serviceCode: item.service_code ?? "",
        serviceName: item.service_type ?? item.service_code ?? "",
        courierId: item.carrier_code ?? "",
        courierName: item.carrier_friendly_name ?? item.carrier_code ?? "",
        shippingSubtotal: providerCost,
        cashOnDeliveryCommission: 0,
        total: pricing.customerPrice,
        currency: "USD" as const,
        platformMarkup: pricing.platformMarkup,
        customerPrice: pricing.customerPrice,
        estimatedTime,
        deliveryDate: item.estimated_delivery_date ?? undefined,
        pricing,
      };
    });
}

async function getShipEngineRates(input: RateInput, config: ShipStationConfig): Promise<RateResult[]> {
  const carrierIds = await fetchShipEngineCarriers(config);
  const payload = buildShipEngineRatesPayload(input, carrierIds);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/rates`, {
      method: "POST",
      headers: {
        "API-Key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new ProviderTimeoutError();
    throw new ProviderUnavailableError(
      "Could not reach ShipEngine rates endpoint. Check network connectivity and SHIPSTATION_BASE_URL.",
    );
  }

  if (!response.ok) {
    handleShipStationHttpError(response.status, "shipengine");
  }

  let data: ShipEngineRatesResponse;
  try {
    data = (await response.json()) as ShipEngineRatesResponse;
  } catch {
    throw new ProviderUnavailableError("ShipEngine returned an unreadable rates response.");
  }

  const mapped = mapFromShipEngineRates(data.rate_response?.rates ?? []);
  if (mapped.length === 0) {
    throw new ProviderUnavailableError(
      "ShipEngine returned no valid rates for the given address and package.",
    );
  }

  return mapped;
}

function handleShipStationHttpError(status: number, mode: "legacy" | "shipengine" = "legacy"): never {
  const providerName = mode === "shipengine" ? "ShipEngine" : "ShipStation";
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(
      mode === "shipengine"
        ? "ShipEngine rejected the request: check SHIPSTATION_API_KEY."
        : "ShipStation rejected the request: check SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET.",
    );
  }
  if (status === 429) {
    throw new ProviderRateLimitError();
  }
  if (status === 400 || status === 422) {
    throw new InvalidPayloadError(
      `${providerName} rejected the payload. Verify address, ZIP, dimensions, and weight.`,
    );
  }
  throw new ProviderUnavailableError(
    `${providerName} returned an unexpected error (HTTP ${status}).`,
  );
}

export class ShipStationAdapter implements LogisticsAdapter {
  async getRates(input: RateInput): Promise<RateResult[]> {
    const config = readConfig();

    if (config.apiMode === "shipengine") {
      return getShipEngineRates(input, config);
    }

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
    if (config.apiMode === "shipengine") {
      throw new ProviderUnavailableError(
        "ShipEngine label creation is not implemented yet. Select a rate from a provider with labels enabled.",
      );
    }

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
      // V1 returns base64 PDF in labelData; not stored in DB, passed back in the immediate response only.
      labelData: labelResponse.labelData ?? null,
      rate,
      message: "ShipStation label purchased successfully via V1 API.",
      providerShipmentId: String(labelResponse.shipmentId),
      providerLabelId: String(labelResponse.shipmentId),
      providerServiceCode: serviceCode,
    };
  }

  async voidLabel(input: VoidLabelInput): Promise<VoidLabelResult> {
    const config = readConfig();
    if (config.apiMode === "shipengine") {
      throw new ProviderUnavailableError(
        "ShipEngine label void is not implemented yet.",
      );
    }

    const ssShipmentId = input.providerShipmentId?.trim();
    if (!ssShipmentId) {
      throw new InvalidPayloadError(
        "providerShipmentId is required for ShipStation void. " +
          "Provide the ShipStation numeric shipmentId stored as provider_shipment_id in the DB.",
      );
    }

    const authHeader = buildAuthHeader(config);
    let voidHttpResponse: Response;

    try {
      voidHttpResponse = await fetch(
        `${config.baseUrl}/shipments/${encodeURIComponent(ssShipmentId)}/voidlabel`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );
    } catch (err) {
      if (err instanceof LogisticsError) throw err;
      if (err instanceof Error && err.name === "AbortError") throw new ProviderTimeoutError();
      throw new ProviderUnavailableError(
        "Could not reach ShipStation to void the label. Check network and SHIPSTATION_BASE_URL.",
      );
    }

    if (!voidHttpResponse.ok) {
      if (voidHttpResponse.status === 401 || voidHttpResponse.status === 403) {
        throw new ProviderAuthError(
          "ShipStation rejected the void request: check SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET.",
        );
      }
      if (voidHttpResponse.status === 429) throw new ProviderRateLimitError();
      if (voidHttpResponse.status === 404) {
        throw new InvalidPayloadError(
          "ShipStation could not find the shipment to void. Verify the providerShipmentId.",
        );
      }
      throw new ProviderUnavailableError(
        `ShipStation returned an unexpected error voiding the label (HTTP ${voidHttpResponse.status}).`,
      );
    }

    let voidData: { approved: boolean; message?: string };
    try {
      voidData = (await voidHttpResponse.json()) as { approved: boolean; message?: string };
    } catch {
      throw new ProviderUnavailableError("ShipStation returned an unreadable void response.");
    }

    if (!voidData.approved) {
      throw new ProviderUnavailableError(
        `ShipStation could not void the label: ${voidData.message ?? "Unknown reason."}`,
      );
    }

    return {
      provider: "shipstation",
      labelStatus: "voided",
      refunded: true,
      message: voidData.message ?? "ShipStation label voided successfully.",
    };
  }

  async trackShipment(): Promise<TrackingResult> {
    throw new LogisticsError(
      "ShipStation tracking via adapter is not implemented yet.",
      "NOT_IMPLEMENTED",
      501,
    );
  }
}
