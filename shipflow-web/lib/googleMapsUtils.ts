import type { StructuredAddress } from "@/lib/types";

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

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
