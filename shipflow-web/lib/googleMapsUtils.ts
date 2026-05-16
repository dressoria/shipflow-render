import type { AddressValidationStatus, StructuredAddress } from "@/lib/types";

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "HI",
  "IA",
  "ID",
  "IL",
  "IN",
  "KS",
  "KY",
  "LA",
  "MA",
  "MD",
  "ME",
  "MI",
  "MN",
  "MO",
  "MS",
  "MT",
  "NC",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NM",
  "NV",
  "NY",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "VT",
  "WA",
  "WI",
  "WV",
  "WY",
] as const;

const US_STATE_SET = new Set<string>(US_STATE_CODES);

function cleanCountry(value: string) {
  return value
    .replace(/\b(usa|u\.s\.a\.|united states|ee\.?\s*uu\.?)\b/gi, "")
    .replace(/,\s*$/g, "")
    .trim();
}

function statusForAddress(address: Pick<StructuredAddress, "street1" | "city" | "state" | "postalCode">): AddressValidationStatus {
  return address.street1 && address.city && address.state && address.postalCode ? "complete" : "needs_review";
}

export function parsePastedUSAddress(input: string): Partial<StructuredAddress> {
  const raw = input.trim().replace(/\s+/g, " ");
  if (!raw) {
    return { country: "US", source: "manual", validationStatus: "incomplete" };
  }

  const normalized = cleanCountry(raw);
  const zipMatch = normalized.match(/\b(\d{5})(?:-\d{4})?\b/);
  const postalCode = zipMatch?.[1] ?? "";

  const stateZipMatch = normalized.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/i);
  const stateCandidate = stateZipMatch?.[1]?.toUpperCase() ?? "";
  const state = US_STATE_SET.has(stateCandidate) ? stateCandidate : "";

  let street1 = "";
  let city = "";
  const commaParts = normalized.split(",").map((part) => part.trim()).filter(Boolean);

  if (commaParts.length >= 3) {
    street1 = commaParts[0] ?? "";
    city = commaParts[1] ?? "";
  } else if (commaParts.length === 2) {
    street1 = commaParts[0] ?? "";
    const second = commaParts[1] ?? "";
    city = second.replace(/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i, "").trim();
  } else if (state && postalCode) {
    const beforeStateZip = normalized
      .replace(new RegExp(`\\b${state}\\s+${postalCode}(?:-\\d{4})?\\b`, "i"), "")
      .trim();
    const tokens = beforeStateZip.split(" ").filter(Boolean);

    if (tokens.length > 2) {
      const streetTokens = tokens.slice(0, Math.max(2, tokens.length - 2));
      const cityTokens = tokens.slice(streetTokens.length);
      street1 = streetTokens.join(" ");
      city = cityTokens.join(" ");
    } else {
      street1 = beforeStateZip;
    }
  }

  const parsed = {
    street1,
    city,
    state,
    postalCode,
    country: "US",
    formattedAddress: raw,
    source: "manual" as const,
  };

  return {
    ...parsed,
    validationStatus: statusForAddress(parsed),
  };
}

export function parseAddressComponents(
  components: GoogleAddressComponent[],
  coords: { lat: number; lng: number },
  formattedAddress?: string,
  placeId?: string,
  source: StructuredAddress["source"] = "google_places",
): Partial<StructuredAddress> {
  const get = (type: string, useShort = false) =>
    components.find((c) => c.types.includes(type))?.[useShort ? "short_name" : "long_name"] ?? "";

  const streetNumber = get("street_number");
  const route = get("route");
  const street1 = [streetNumber, route].filter(Boolean).join(" ") || undefined;

  const city =
    get("locality") ||
    get("sublocality_level_1") ||
    get("administrative_area_level_2") ||
    undefined;

  const state = get("administrative_area_level_1", true) || undefined;
  const postalCode = get("postal_code") || undefined;
  const country = get("country", true) || "US";

  const missing = !street1 || !city || !state || !postalCode;

  return {
    street1,
    city,
    state,
    postalCode,
    country,
    latitude: coords.lat,
    longitude: coords.lng,
    formattedAddress,
    placeId,
    source,
    validationStatus: missing ? "needs_review" : "complete",
  };
}

export function loadGoogleMapsScript(apiKey: string, onReady: () => void): void {
  if (typeof window === "undefined") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;

  if (win.__gMapsLoaded) {
    onReady();
    return;
  }

  if (!win.__gMapsCallbacks) win.__gMapsCallbacks = [];
  win.__gMapsCallbacks.push(onReady);

  if (document.querySelector("script[data-gmaps-loader]")) return;

  const script = document.createElement("script");
  script.setAttribute("data-gmaps-loader", "1");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    win.__gMapsLoaded = true;
    ((win.__gMapsCallbacks ?? []) as (() => void)[]).forEach((cb) => cb());
    win.__gMapsCallbacks = [];
  };
  document.head.appendChild(script);
}
