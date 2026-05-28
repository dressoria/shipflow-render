import type { StructuredAddress } from "@/lib/types";
import type { Address } from "@/lib/logistics/types";

export type SupportedDomesticCountryCode = "US" | "CA" | "ES" | "DE" | "FR" | "GB";

export const SUPPORTED_DOMESTIC_COUNTRIES: Array<{
  code: SupportedDomesticCountryCode;
  name: string;
  googleCode: string;
}> = [
  { code: "US", name: "United States", googleCode: "us" },
  { code: "CA", name: "Canada", googleCode: "ca" },
  { code: "ES", name: "Spain", googleCode: "es" },
  { code: "DE", name: "Germany", googleCode: "de" },
  { code: "FR", name: "France", googleCode: "fr" },
  { code: "GB", name: "United Kingdom", googleCode: "gb" },
];

const SUPPORTED_CODES = new Set(SUPPORTED_DOMESTIC_COUNTRIES.map((country) => country.code));

export const INTERNATIONAL_SHIPPING_SOON_MESSAGE =
  "International shipping is coming soon. For now, SendiFlash supports domestic shipments within selected countries.";

export const UNSUPPORTED_COUNTRY_MESSAGE = "This country is not available yet.";

export function normalizeCountryCode(value: string | null | undefined): string {
  const normalized = (value ?? "US").trim().toUpperCase();
  if (normalized === "UK") return "GB";
  return normalized || "US";
}

export function isSupportedDomesticCountry(value: string | null | undefined): value is SupportedDomesticCountryCode {
  return SUPPORTED_CODES.has(normalizeCountryCode(value) as SupportedDomesticCountryCode);
}

export function getDomesticCountryName(value: string | null | undefined): string {
  const code = normalizeCountryCode(value);
  return SUPPORTED_DOMESTIC_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

export function getGooglePlacesCountryRestrictions(): string[] {
  return SUPPORTED_DOMESTIC_COUNTRIES.map((country) => country.googleCode);
}

export function validateDomesticShipmentCountries(
  origin: Pick<StructuredAddress | Address, "country">,
  destination: Pick<StructuredAddress | Address, "country">,
): { countryCode: SupportedDomesticCountryCode } {
  const originCountry = normalizeCountryCode(origin.country);
  const destinationCountry = normalizeCountryCode(destination.country);

  if (!isSupportedDomesticCountry(originCountry) || !isSupportedDomesticCountry(destinationCountry)) {
    throw new Error(UNSUPPORTED_COUNTRY_MESSAGE);
  }

  if (originCountry !== destinationCountry) {
    throw new Error(INTERNATIONAL_SHIPPING_SOON_MESSAGE);
  }

  return { countryCode: originCountry };
}
