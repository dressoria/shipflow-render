import type { EcuadorShippingProvider } from "@/lib/ecuador/providers/types";
import type {
  EcuadorCreateShipmentInput,
  EcuadorCreateShipmentResult,
  EcuadorQuoteInput,
  EcuadorQuoteResult,
  EcuadorTrackingEvent,
} from "@/lib/ecuador/types";

const PENDING_MESSAGE = "Delivereo integration is pending. Ecuador provider is not configured yet.";

export class MockEcuadorShippingProvider implements EcuadorShippingProvider {
  async quote(input: EcuadorQuoteInput): Promise<EcuadorQuoteResult> {
    void input;
    return {
      provider: "mock",
      status: "quote_requested",
      message: PENDING_MESSAGE,
      currency: "USD",
      providerCost: null,
      customerPrice: null,
      estimatedTime: null,
      metadata: {
        mode: "disabled_preview",
      },
    };
  }

  async createShipment(input: EcuadorCreateShipmentInput): Promise<EcuadorCreateShipmentResult> {
    void input;
    return {
      provider: "mock",
      status: "action_required",
      message: "Ecuador Shipping is still in preparation. No real orders are created from this module yet.",
      providerOrderId: null,
      trackingId: null,
      metadata: {
        mode: "no_op",
      },
    };
  }

  async getTracking(providerOrderId: string): Promise<EcuadorTrackingEvent[]> {
    void providerOrderId;
    return [];
  }

  async cancelShipment(providerOrderId: string): Promise<{ success: boolean; message?: string }> {
    void providerOrderId;
    return {
      success: false,
      message: PENDING_MESSAGE,
    };
  }
}
