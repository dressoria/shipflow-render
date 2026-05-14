import { calculateShippingRate } from "@/lib/services/courierService";
import { ProviderUnavailableError } from "@/lib/logistics/errors";
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
import type { CourierConfig } from "@/lib/types";

export class MockAdapter implements LogisticsAdapter {
  constructor(private couriers: CourierConfig[]) {}

  async getRates(input: RateInput): Promise<RateResult[]> {
    const activeCouriers = this.couriers.filter((courier) => courier.activo);
    const selectedCouriers = input.courier
      ? activeCouriers.filter((courier) => courier.id === input.courier || courier.nombre === input.courier)
      : activeCouriers;

    if (selectedCouriers.length === 0) {
      throw new ProviderUnavailableError("Selected carrier is not available.");
    }

    return selectedCouriers.map((courier) => {
      if (input.cashOnDelivery && !courier.permiteContraEntrega) {
        throw new ProviderUnavailableError(`${courier.nombre} does not support cash on delivery.`);
      }

      const internalRate = calculateShippingRate({
        courier,
        peso: input.parcel.weight,
        ciudadOrigen: input.origin.city,
        ciudadDestino: input.destination.city,
        contraEntrega: Boolean(input.cashOnDelivery),
        valorCobrar: input.cashAmount ?? 0,
      });
      const pricing = applyMarkup(internalRate.total, 0);

      return {
        provider: "internal",
        serviceCode: courier.id,
        serviceName: courier.nombre,
        courierId: courier.id,
        courierName: courier.nombre,
        shippingSubtotal: internalRate.subtotal,
        cashOnDeliveryCommission: internalRate.contraEntregaComision,
        total: internalRate.total,
        currency: "USD",
        platformMarkup: pricing.platformMarkup,
        customerPrice: pricing.customerPrice,
        estimatedTime: courier.tiempoEstimado,
        pricing,
      };
    });
  }

  async createLabel(input: CreateLabelInput): Promise<LabelResult> {
    const [rate] = await this.getRates(input);
    if (!rate) throw new ProviderUnavailableError("No internal rate is available.");

    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

    return {
      provider: "internal",
      trackingNumber: `SF-${timePart}-${randomPart}`,
      labelStatus: "internal",
      labelUrl: null,
      rate,
      message: "Internal ShipFlow label. No carrier label has been purchased yet.",
    };
  }

  async voidLabel(_input: VoidLabelInput): Promise<VoidLabelResult> {
    return {
      provider: "internal",
      labelStatus: "voided",
      refunded: false,
      message: "Internal label marked as voided. No carrier void or refund was performed.",
    };
  }
}
