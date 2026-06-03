import "server-only";

import type { EcuadorShippingProvider } from "@/lib/ecuador/providers/types";
import type {
  EcuadorCreateShipmentInput,
  EcuadorCreateShipmentResult,
  EcuadorQuoteInput,
  EcuadorQuoteResult,
  EcuadorTrackingEvent,
} from "@/lib/ecuador/types";
import { readDelivereoServerConfig } from "@/lib/server/delivereoConfig";
import { loginToDelivereo } from "@/lib/server/delivereoAuth";
import { delivereoPostJson, safeDelivereoFailure } from "@/lib/server/delivereoHttp";

const DELIVEREO_NOT_CONFIGURED_MESSAGE = "Delivereo provider is not configured yet.";

type DelivereoCityType =
  | "AMBATO"
  | "ATACAMES"
  | "BABAHOYO"
  | "CAYAMBE"
  | "COJIMIES"
  | "CUENCA"
  | "ESMERALDAS"
  | "GUAYAQUIL"
  | "IBARRA"
  | "LATACUNGA"
  | "LA_CONCORDIA"
  | "LA_LIBERTAD"
  | "LOJA"
  | "MACHACHI"
  | "MACHALA"
  | "MANTA"
  | "MILAGRO"
  | "OTAVALO"
  | "PEDERNALES"
  | "PORTOVIEJO"
  | "QUEVEDO"
  | "QUININDE"
  | "QUITO"
  | "RIOBAMBA"
  | "SALINAS"
  | "SANGOLQUI"
  | "SANTA_ELENA"
  | "SANTA_ROSA"
  | "SANTO_DOMINGO"
  | "TULCAN";

type DelivereoCalculateAddress = {
  addressCrossingStreet: string;
  addressMainStreet: string;
  addressOrder: number;
  countryCode: "EC";
  fullAddress: string;
};

type DelivereoCalculatePayload = {
  categoryType: "SMALL" | "MEDIUM" | "LARGE";
  cityType: DelivereoCityType;
  lang: "es" | "en";
  addresses: DelivereoCalculateAddress[];
};

type DelivereoCalculateResponse = {
  code?: number;
  status?: boolean;
  message?: string;
  farePrice?: number;
  itemsPrice?: number;
  iva?: number;
  ivaPercentage?: number;
  totalAmount?: number;
  totalDistance?: number;
  estimatedTime?: string;
  numberOfTrackingMessages?: number;
  trackingMessageIndividualPrice?: number;
};

const CITY_ALIAS_MAP: Record<string, DelivereoCityType> = {
  ambato: "AMBATO",
  atacames: "ATACAMES",
  babahoyo: "BABAHOYO",
  cayambe: "CAYAMBE",
  cojimies: "COJIMIES",
  cojimíes: "COJIMIES",
  cuenca: "CUENCA",
  esmeraldas: "ESMERALDAS",
  guayaquil: "GUAYAQUIL",
  ibarra: "IBARRA",
  latacunga: "LATACUNGA",
  "la concordia": "LA_CONCORDIA",
  "la libertad": "LA_LIBERTAD",
  loja: "LOJA",
  machachi: "MACHACHI",
  machala: "MACHALA",
  manta: "MANTA",
  milagro: "MILAGRO",
  otavalo: "OTAVALO",
  pedernales: "PEDERNALES",
  portoviejo: "PORTOVIEJO",
  quevedo: "QUEVEDO",
  quininde: "QUININDE",
  quinindé: "QUININDE",
  quito: "QUITO",
  riobamba: "RIOBAMBA",
  salinas: "SALINAS",
  sangolqui: "SANGOLQUI",
  sangolquí: "SANGOLQUI",
  "santa elena": "SANTA_ELENA",
  "santa elena province": "SANTA_ELENA",
  "santa rosa": "SANTA_ROSA",
  "santo domingo": "SANTO_DOMINGO",
  "santo domingo de los tsachilas": "SANTO_DOMINGO",
  "santo domingo de los tsáchilas": "SANTO_DOMINGO",
  tulcan: "TULCAN",
  tulcán: "TULCAN",
};

function normalizeCityKey(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function resolveCityType(originCity?: string, destinationCity?: string): DelivereoCityType {
  const originKey = normalizeCityKey(originCity);
  const destinationKey = normalizeCityKey(destinationCity);
  const origin = CITY_ALIAS_MAP[originKey];
  const destination = CITY_ALIAS_MAP[destinationKey];

  if (!origin && !destination) {
    throw safeDelivereoFailure("No pudimos calcular esta cotización beta con Delivereo para las ciudades indicadas.", 400);
  }

  if (origin && destination && origin !== destination) {
    throw safeDelivereoFailure("La cotización beta automática de Delivereo por ahora solo está disponible para rutas dentro de la misma ciudad soportada.", 400);
  }

  return origin ?? destination!;
}

function splitAddress(value?: string, fallback?: string | null) {
  const raw = (value ?? "").trim();
  const segments = raw
    .split(/[,\-;/]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const fallbackText = fallback?.trim() || "Referencia";
  const mainStreet = segments[0] || raw || fallbackText || "Direccion principal";
  const crossingStreet = segments[1] || fallbackText;

  return {
    mainStreet,
    crossingStreet,
  };
}

function buildFullAddress(address?: string, city?: string, reference?: string) {
  return [address, city, reference].map((part) => part?.trim()).filter(Boolean).join(", ");
}

function deriveCategory(input: EcuadorQuoteInput): "SMALL" | "MEDIUM" | "LARGE" {
  if (input.category) return input.category;
  const weight = input.packageWeight ?? 0;
  if (weight <= 2) return "SMALL";
  if (weight <= 10) return "MEDIUM";
  return "LARGE";
}

export function mapEcuadorQuoteInputToDelivereoCalculatePayload(input: EcuadorQuoteInput): DelivereoCalculatePayload {
  const originFull = buildFullAddress(input.origin.addressLine, input.origin.city, input.origin.reference);
  const destinationFull = buildFullAddress(input.destination.addressLine, input.destination.city, input.destination.reference);
  if (!originFull || !destinationFull) {
    throw safeDelivereoFailure("La cotización beta requiere dirección y ciudad de origen y destino.", 400);
  }

  const originSplit = splitAddress(input.origin.addressLine, input.origin.reference ?? input.origin.city ?? null);
  const destinationSplit = splitAddress(input.destination.addressLine, input.destination.reference ?? input.destination.city ?? null);

  return {
    categoryType: deriveCategory(input),
    cityType: resolveCityType(input.origin.city, input.destination.city),
    lang: input.language ?? "es",
    addresses: [
      {
        addressCrossingStreet: originSplit.crossingStreet,
        addressMainStreet: originSplit.mainStreet,
        addressOrder: 1,
        countryCode: "EC",
        fullAddress: originFull,
      },
      {
        addressCrossingStreet: destinationSplit.crossingStreet,
        addressMainStreet: destinationSplit.mainStreet,
        addressOrder: 2,
        countryCode: "EC",
        fullAddress: destinationFull,
      },
    ],
  };
}

export function normalizeDelivereoQuoteResponse(response: DelivereoCalculateResponse): EcuadorQuoteResult {
  const totalAmount = typeof response.totalAmount === "number" ? response.totalAmount : null;
  const farePrice = typeof response.farePrice === "number" ? response.farePrice : null;

  return {
    provider: "delivereo",
    status: response.status === false ? "failed" : "quote_ready",
    message: response.message?.trim() || "Cotización beta calculada con Delivereo. No genera orden ni cobro.",
    currency: "USD",
    providerCost: farePrice,
    customerPrice: totalAmount,
    estimatedTime: response.estimatedTime?.trim() || null,
    metadata: {
      quoteMode: "beta_calculation",
      totalDistance: typeof response.totalDistance === "number" ? response.totalDistance : null,
      iva: typeof response.iva === "number" ? response.iva : null,
      ivaPercentage: typeof response.ivaPercentage === "number" ? response.ivaPercentage : null,
      itemsPrice: typeof response.itemsPrice === "number" ? response.itemsPrice : null,
      trackingMessages: typeof response.numberOfTrackingMessages === "number" ? response.numberOfTrackingMessages : null,
      trackingMessagePrice: typeof response.trackingMessageIndividualPrice === "number" ? response.trackingMessageIndividualPrice : null,
      providerCode: response.code ?? null,
    },
  };
}

function assertDelivereoQuoteConfig() {
  const config = readDelivereoServerConfig();
  if (!config.enabled || !config.baseUrl || !config.username || !config.password) {
    throw new Error(DELIVEREO_NOT_CONFIGURED_MESSAGE);
  }
  return config;
}

export class DelivereoEcuadorShippingProvider implements EcuadorShippingProvider {
  async quote(input: EcuadorQuoteInput): Promise<EcuadorQuoteResult> {
    const config = assertDelivereoQuoteConfig();
    const payload = mapEcuadorQuoteInputToDelivereoCalculatePayload(input);
    const auth = await loginToDelivereo();
    if (!auth.token) {
      throw safeDelivereoFailure("Delivereo authentication succeeded without a usable token.", 502);
    }

    const response = await delivereoPostJson<DelivereoCalculateResponse>(
      config,
      "/api/private/business-bookings/calculate",
      payload,
      auth.token,
    );

    return normalizeDelivereoQuoteResponse(response);
  }

  async createShipment(input: EcuadorCreateShipmentInput): Promise<EcuadorCreateShipmentResult> {
    void input;
    throw new Error(DELIVEREO_NOT_CONFIGURED_MESSAGE);
  }

  async getTracking(providerOrderId: string): Promise<EcuadorTrackingEvent[]> {
    void providerOrderId;
    throw new Error(DELIVEREO_NOT_CONFIGURED_MESSAGE);
  }

  async cancelShipment(providerOrderId: string): Promise<{ success: boolean; message?: string }> {
    void providerOrderId;
    throw new Error(DELIVEREO_NOT_CONFIGURED_MESSAGE);
  }
}

export function getDelivereoNotConfiguredMessage() {
  return DELIVEREO_NOT_CONFIGURED_MESSAGE;
}
