import type {
  EcuadorCreateShipmentInput,
  EcuadorCreateShipmentResult,
  EcuadorQuoteInput,
  EcuadorQuoteResult,
  EcuadorTrackingEvent,
} from "@/lib/ecuador/types";

export type EcuadorProviderId =
  | "delivereo"
  | "servientrega"
  | "laarcourier"
  | "urbano"
  | "tramaco"
  | "yobel";

export type EcuadorQuoteProviderStatus =
  | "active"
  | "beta"
  | "integration_pending"
  | "contact_required"
  | "disabled";

export type EcuadorProviderQuoteResult =
  | {
      ok: true;
      providerId: EcuadorProviderId;
      providerName: string;
      serviceName: string;
      amount: number;
      currency: "USD";
      etaLabel?: string;
      estimatedDays?: string;
      rawStatus?: string;
      source: "real_provider";
    }
  | {
      ok: false;
      providerId: EcuadorProviderId;
      providerName: string;
      reason:
        | "provider_auth_failed"
        | "integration_pending"
        | "unsupported_city"
        | "missing_config"
        | "provider_error"
        | "timeout"
        | "contact_required";
      userMessage: string;
      debugMessage?: string;
      source: "provider" | "system";
    };

export interface EcuadorQuoteProvider {
  id: EcuadorProviderId;
  name: string;
  logoPath: string;
  status: EcuadorQuoteProviderStatus;
  supportsQuote: boolean;
  supportsBooking: boolean;
  getQuote(input: EcuadorQuoteInput): Promise<EcuadorProviderQuoteResult>;
}

export interface EcuadorShippingProvider {
  quote(input: EcuadorQuoteInput): Promise<EcuadorQuoteResult>;
  createShipment(input: EcuadorCreateShipmentInput): Promise<EcuadorCreateShipmentResult>;
  getTracking(providerOrderId: string): Promise<EcuadorTrackingEvent[]>;
  cancelShipment?(providerOrderId: string): Promise<{ success: boolean; message?: string }>;
}
