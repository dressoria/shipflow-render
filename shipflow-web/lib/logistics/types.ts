import type { TrackingResult as AppTrackingResult } from "@/lib/types";

export type LogisticsProvider = "internal" | "mock" | "shipstation" | "shippo" | "easypost" | "easyship";

export type LogisticsServiceCode = string;

export type Address = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type Parcel = {
  weight: number;
  weightUnit?: "lb" | "oz" | "kg";
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: "in" | "cm";
};

export type PricingBreakdown = {
  providerCost: number;
  platformMarkup: number;
  subtotal: number;          // providerCost + platformMarkup (before payment fee)
  paymentFee: number;        // estimated payment processing cost (not absorbed by ShipFlow)
  customerPrice: number;
  currency: "USD";
  // Config snapshot used for this calculation
  markupPercentage?: number;
  markupMinimum?: number;
  paymentFeePercentage?: number;
  paymentFeeFixed?: number;
};

export type RateInput = {
  origin: Address;
  destination: Address;
  parcel: Parcel;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type RateResult = {
  provider: LogisticsProvider;
  serviceCode: LogisticsServiceCode;
  serviceName: string;
  courierId: string;
  courierName: string;
  providerRateId?: string; // provider-specific rate ID; needed for label creation by some providers
  supportsLabels?: boolean; // false when the provider/rate is rates-only in the current phase
  shippingSubtotal: number;
  cashOnDeliveryCommission: number;
  total: number;
  currency: "USD";
  platformMarkup: number;
  customerPrice: number;
  estimatedTime?: string;
  deliveryDate?: string;
  pricing: PricingBreakdown;
  tags?: ("cheapest" | "fastest" | "recommended")[];
};

export type CreateLabelInput = RateInput & {
  idempotencyKey: string;
  provider?: LogisticsProvider;
  serviceCode?: string;
  carrierCode?: string;
  labelFormat?: "pdf" | "zpl" | "png";
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  destinationAddress?: string;
  productType?: string;
};

export type LabelResult = {
  provider: LogisticsProvider;
  trackingNumber: string;
  labelStatus: "internal" | "pending" | "processing" | "purchased" | "failed" | "voided" | "refunded";
  labelUrl: string | null;
  labelData?: string | null; // base64 PDF from ShipStation V1; not stored in DB, only in immediate response
  rate: RateResult;
  message: string;
  providerShipmentId?: string | null;
  providerLabelId?: string | null;
  providerServiceCode?: string | null;
};

export type VoidLabelInput = {
  shipmentId: string;
  providerShipmentId?: string; // Provider-specific numeric ID; required for ShipStation void API
  trackingNumber?: string;
  provider?: LogisticsProvider;
};

export type VoidLabelResult = {
  provider: LogisticsProvider;
  labelStatus: "voided";
  refunded: boolean;
  message: string;
};

export type TrackingInput = {
  trackingNumber: string;
  courier?: string;
  provider?: LogisticsProvider;
};

export type TrackingResult = AppTrackingResult;
