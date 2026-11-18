import "server-only";
import { applyMarkup } from "@/lib/logistics/pricing";
import { carrierApiBase, getDirectCarrierToken, type DirectCarrier } from "@/lib/logistics/directCarriers/auth";
import type { RateInput, RateResult } from "@/lib/logistics/types";

/** Direct rates only. No buying postage, no vendor markup at this layer. */
type Dict = Record<string, unknown>;
function obj(v: unknown): Dict { return v && typeof v === "object" && !Array.isArray(v) ? v as Dict : {}; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : v == null ? [] : [v]; }
function str(v: unknown): string { return typeof v === "string" ? v : ""; }
function num(v: unknown): number { return typeof v === "string" || typeof v === "number" ? Number(v) : NaN; }
function asRate(carrier: DirectCarrier, code: string, name: string, cost: number, duration?: string): RateResult | null {
  if (!code || !Number.isFinite(cost) || cost <= 0) return null;
  const amount = Math.round(cost * 100) / 100;
  const pricing = applyMarkup(amount, 0);
  return {
    provider: carrier, courierId: carrier, courierName: carrier.toUpperCase(),
    serviceCode: code, serviceName: name || code, shippingSubtotal: amount,
    cashOnDeliveryCommission: 0, total: amount, currency: "USD",
    platformMarkup: 0, customerPrice: amount, pricing, supportsLabels: false,
    ...(duration ? { estimatedTime: duration } : {}),
  };
}
function pounds(input: RateInput): number {
  const w = input.parcel.weight;
  return input.parcel.weightUnit === "kg" ? w * 2.20462262185 : input.parcel.weightUnit === "oz" ? w / 16 : w;
}
function inches(input: RateInput, field: "length" | "width" | "height"): number {
  const v = Number(input.parcel[field]);
  return input.parcel.dimensionUnit === "cm" ? v / 2.54 : v;
}
function zip(value: string | undefined): string {
  const z = (value || "").trim();
  if (!/^\d{5}(?:-\d{4})?$/.test(z)) throw new Error("Direct carrier rating requires a US ZIP Code.");
  return z.slice(0, 5);
}
function ensureUs(input: RateInput): void {
  if ((input.origin.country || "US").toUpperCase() !== "US" ||
      (input.destination.country || "US").toUpperCase() !== "US") {
    throw new Error("Direct carrier rating currently supports USA domestic shipping only.");
  }
  zip(input.origin.postalCode);
  zip(input.destination.postalCode);
  if (!Number.isFinite(pounds(input)) || pounds(input) <= 0 ||
      !["length", "width", "height"].every((key) => {
        const val = inches(input, key as "length" | "width" | "height");
        return Number.isFinite(val) && val > 0;
      })) throw new Error("Package dimensions and weight are required.");
}
async function postJson(carrier: DirectCarrier, path: string, payload: Dict, headers: Record<string, string> = {}): Promise<Dict> {
  const token = await getDirectCarrierToken(carrier);
  const response = await fetch(carrierApiBase(carrier) + path, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    // Never log provider responses or raw customer addresses.
    throw new Error(`${carrier.toUpperCase()} rating failed (HTTP ${response.status}).`);
  }
  return obj(await response.json());
}
async function upsRates(input: RateInput): Promise<RateResult[]> {
  const address = (a: RateInput["origin"]) => ({
    Address: { AddressLine: [a.line1 || ""], City: a.city, StateProvinceCode: a.state,
      PostalCode: zip(a.postalCode), CountryCode: "US" },
  });
  const payload = {
    RateRequest: {
      Request: { RequestOption: "Shop", TransactionReference: { CustomerContext: "SendiFlash rate quote" } },
      Shipment: {
        Shipper: address(input.origin), ShipFrom: address(input.origin), ShipTo: address(input.destination),
        Package: {
          PackagingType: { Code: "02" },
          Dimensions: { UnitOfMeasurement: { Code: "IN" }, Length: inches(input, "length").toFixed(2),
            Width: inches(input, "width").toFixed(2), Height: inches(input, "height").toFixed(2) },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: pounds(input).toFixed(2) },
        },
        ...(process.env.UPS_SHIPPER_NUMBER?.trim() ? { ShipperNumber: process.env.UPS_SHIPPER_NUMBER.trim() } : {}),
      },
    },
  };
  const json = await postJson("ups", "/api/rating/v2409/Shop", payload);
  return arr(obj(json.RateResponse).RatedShipment).flatMap((raw) => {
    const item = obj(raw), service = obj(item.Service), charges = obj(item.TotalCharges);
    const rated = obj(item.NegotiatedRateCharges);
    const price = obj(rated.TotalCharge).MonetaryValue ?? charges.MonetaryValue;
    const result = asRate("ups", str(service.Code), str(service.Description) || `UPS ${str(service.Code)}`, num(price));
    return result ? [result] : [];
  });
}
async function fedexRates(input: RateInput): Promise<RateResult[]> {
  const account = process.env.FEDEX_ACCOUNT_NUMBER?.trim();
  if (!account) throw new Error("FEDEX_ACCOUNT_NUMBER is required for account rate quotes.");
  const payload = {
    accountNumber: { value: account },
    requestedShipment: {
      shipper: { address: { streetLines: [input.origin.line1 || ""], city: input.origin.city, stateOrProvinceCode: input.origin.state,
        postalCode: zip(input.origin.postalCode), countryCode: "US" } },
      recipient: { address: { streetLines: [input.destination.line1 || ""], city: input.destination.city, stateOrProvinceCode: input.destination.state,
        postalCode: zip(input.destination.postalCode), countryCode: "US" } },
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      rateRequestType: ["ACCOUNT"],
      requestedPackageLineItems: [{ weight: { units: "LB", value: Number(pounds(input).toFixed(2)) },
        dimensions: { length: Math.ceil(inches(input, "length")), width: Math.ceil(inches(input, "width")),
          height: Math.ceil(inches(input, "height")), units: "IN" } }],
    },
  };
  const json = await postJson("fedex", "/rate/v1/rates/quotes", payload, { "X-locale": "en_US" });
  return arr(obj(json.output).rateReplyDetails).flatMap((raw) => {
    const item = obj(raw), code = str(item.serviceType);
    const amounts = arr(item.ratedShipmentDetails).map(obj);
    const withUsd = amounts.find((v) => str(v.currency || obj(v.totalNetCharge).currency) === "USD") || amounts[0];
    const cost = num(obj(withUsd).totalNetCharge);
    const alternativeCost = num(obj(obj(withUsd).shipmentRateDetail).totalNetCharge);
    const rate = asRate("fedex", code, str(item.serviceName) || code, Number.isFinite(cost) ? cost : alternativeCost);
    return rate ? [rate] : [];
  });
}
async function uspsRates(input: RateInput): Promise<RateResult[]> {
  const options = (process.env.USPS_MAIL_CLASSES || "USPS_GROUND_ADVANTAGE,PRIORITY_MAIL").split(",")
    .map((s) => s.trim()).filter((s) => /^[A-Z_]+$/.test(s)).slice(0, 5);
  // USPS Prices V3 uses ounces; package dimensions are inches.
  const weightOz = Math.ceil(pounds(input) * 16 * 100) / 100;
  const account = process.env.USPS_EPS_ACCOUNT_NUMBER?.trim();
  const results = await Promise.allSettled(options.map(async (mailClass) => {
    const payload: Dict = {
      originZIPCode: zip(input.origin.postalCode), destinationZIPCode: zip(input.destination.postalCode),
      weight: weightOz, length: Number(inches(input, "length").toFixed(2)),
      width: Number(inches(input, "width").toFixed(2)), height: Number(inches(input, "height").toFixed(2)),
      mailClass, priceType: account ? "COMMERCIAL" : "RETAIL",
      mailingDate: new Date().toISOString().slice(0, 10),
      ...(account ? { accountType: "EPS", accountNumber: account } : {}),
    };
    const response = await postJson("usps", "/prices/v3/base-rates/search", payload);
    const price = num(response.totalBasePrice);
    return asRate("usps", mailClass, mailClass.replace(/_/g, " "), price);
  }));
  const successful = results.filter((r): r is PromiseFulfilledResult<RateResult | null> => r.status === "fulfilled");
  if (!successful.length) {
    throw new Error("USPS price lookup failed for all configured classes.");
  }
  return successful.map((r) => r.value).filter((r): r is RateResult => r !== null);
}
export async function getDirectCarrierRates(carrier: DirectCarrier, input: RateInput): Promise<RateResult[]> {
  ensureUs(input);
  if (carrier === "ups") return upsRates(input);
  if (carrier === "fedex") return fedexRates(input);
  return uspsRates(input);
}
