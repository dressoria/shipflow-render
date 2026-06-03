import type {
  EcuadorCreateShipmentInput,
  EcuadorCreateShipmentResult,
  EcuadorQuoteInput,
  EcuadorQuoteResult,
  EcuadorTrackingEvent,
} from "@/lib/ecuador/types";

export interface EcuadorShippingProvider {
  quote(input: EcuadorQuoteInput): Promise<EcuadorQuoteResult>;
  createShipment(input: EcuadorCreateShipmentInput): Promise<EcuadorCreateShipmentResult>;
  getTracking(providerOrderId: string): Promise<EcuadorTrackingEvent[]>;
  cancelShipment?(providerOrderId: string): Promise<{ success: boolean; message?: string }>;
}
