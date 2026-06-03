import type { EcuadorShippingProvider } from "@/lib/ecuador/providers/types";
import type {
  EcuadorCreateShipmentInput,
  EcuadorCreateShipmentResult,
  EcuadorQuoteInput,
  EcuadorQuoteResult,
  EcuadorTrackingEvent,
} from "@/lib/ecuador/types";

const DELIVEREO_NOT_CONFIGURED_MESSAGE = "Delivereo provider is not configured yet.";

export class DelivereoEcuadorShippingProvider implements EcuadorShippingProvider {
  async quote(input: EcuadorQuoteInput): Promise<EcuadorQuoteResult> {
    void input;
    throw new Error(DELIVEREO_NOT_CONFIGURED_MESSAGE);
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
