"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin, Search } from "lucide-react";
import type { StructuredAddress } from "@/lib/types";

// ── Minimal Google Maps types (no @types/google.maps needed) ─────────────────

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlace = {
  address_components?: GoogleAddressComponent[];
  geometry?: { location?: { lat(): number; lng(): number } };
  formatted_address?: string;
  place_id?: string;
};

type GoogleAutocomplete = {
  addListener(event: string, fn: () => void): void;
  getPlace(): GooglePlace;
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            el: HTMLInputElement,
            opts?: { types?: string[]; fields?: string[] },
          ) => GoogleAutocomplete;
        };
      };
    };
    __gMapsLoaded?: boolean;
    __gMapsCallbacks?: (() => void)[];
  }
}

// ── Script loader (idempotent across multiple AddressInput instances) ─────────

function loadGoogleMapsScript(apiKey: string, onReady: () => void): void {
  if (typeof window === "undefined") return;

  if (window.__gMapsLoaded) {
    onReady();
    return;
  }

  if (!window.__gMapsCallbacks) window.__gMapsCallbacks = [];
  window.__gMapsCallbacks.push(onReady);

  if (document.querySelector('script[data-gmaps-loader]')) return;

  const script = document.createElement("script");
  script.setAttribute("data-gmaps-loader", "1");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.__gMapsLoaded = true;
    (window.__gMapsCallbacks ?? []).forEach((cb) => cb());
    window.__gMapsCallbacks = [];
  };
  document.head.appendChild(script);
}

// ── Address component parser ──────────────────────────────────────────────────

function parseGooglePlace(place: GooglePlace): Partial<StructuredAddress> {
  const components = place.address_components ?? [];
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
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
    formattedAddress: place.formatted_address,
    placeId: place.place_id,
    source: "google_places",
    validationStatus: missing ? "needs_review" : "complete",
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type AddressInputErrors = Partial<
  Record<"name" | "phone" | "street1" | "city" | "state" | "postalCode" | "country", string>
>;

type Props = {
  sectionLabel: string;
  value: StructuredAddress;
  onChange: (addr: StructuredAddress) => void;
  requirePostal?: boolean;
  errors?: AddressInputErrors;
};

// ── Component ─────────────────────────────────────────────────────────────────

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const HAS_GOOGLE_MAPS = Boolean(GOOGLE_MAPS_KEY);

export function AddressInput({ sectionLabel, value, onChange, requirePostal = false, errors = {} }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!HAS_GOOGLE_MAPS) return;
    loadGoogleMapsScript(GOOGLE_MAPS_KEY, () => setMapsReady(true));
  }, []);

  useEffect(() => {
    if (!mapsReady || !searchRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
      types: ["address"],
      fields: ["address_components", "geometry", "formatted_address", "place_id"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const parsed = parseGooglePlace(place);
      setSearchText(place.formatted_address ?? "");
      onChange({
        ...value,
        ...parsed,
        name: value.name,
        phone: value.phone,
        company: value.company,
        street2: value.street2,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  function set(field: keyof StructuredAddress, val: string) {
    onChange({ ...value, [field]: val, source: "manual" });
  }

  const isComplete = value.validationStatus === "complete";
  const isNeedsReview = value.validationStatus === "needs_review";

  return (
    <div className="grid gap-4">
      {/* Name + Phone */}
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Nombre"
          value={value.name ?? ""}
          onChange={(v) => set("name", v)}
          placeholder={`Ej. Juan García`}
          error={errors.name}
        />
        <InputField
          label="Teléfono"
          value={value.phone ?? ""}
          onChange={(v) => set("phone", v)}
          placeholder="+1 555 000 0000"
          error={errors.phone}
        />
      </div>

      {/* Google Places search (only if API key configured) */}
      {HAS_GOOGLE_MAPS && (
        <div className="grid gap-1">
          <label className="text-sm font-bold text-slate-700">
            Buscar dirección
            {isComplete && (
              <CheckCircle2 className="ml-1.5 inline-block h-3.5 w-3.5 text-green-500" />
            )}
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={mapsReady ? "Escribe para buscar dirección..." : "Cargando Google Maps..."}
              disabled={!mapsReady}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60"
            />
          </div>
          {isNeedsReview && (
            <p className="text-xs font-semibold text-amber-600">
              Dirección pendiente de revisión. Completa los campos faltantes.
            </p>
          )}
          <p className="text-xs text-slate-400">
            Los campos se llenan automáticamente al seleccionar. Puedes editarlos.
          </p>
        </div>
      )}

      {/* Street fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <InputField
            label="Dirección / Calle"
            value={value.street1}
            onChange={(v) => set("street1", v)}
            placeholder="Ej. 123 Main St"
            error={errors.street1}
          />
        </div>
        <InputField
          label="Apartamento / Suite (opcional)"
          value={value.street2 ?? ""}
          onChange={(v) => set("street2", v)}
          placeholder="Ej. Apt 4B"
        />
      </div>

      {/* City / State / Postal / Country */}
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Ciudad"
          value={value.city}
          onChange={(v) => set("city", v)}
          placeholder="Ej. New York"
          error={errors.city}
        />
        <InputField
          label="Estado"
          value={value.state}
          onChange={(v) => set("state", v)}
          placeholder="Ej. NY"
          error={errors.state}
        />
        <InputField
          label={requirePostal ? "ZIP / Código postal *" : "ZIP / Código postal"}
          value={value.postalCode}
          onChange={(v) => set("postalCode", v)}
          placeholder="Ej. 10001"
          error={errors.postalCode}
        />
        <InputField
          label="País"
          value={value.country}
          onChange={(v) => set("country", v)}
          placeholder="Ej. US"
          error={errors.country}
        />
      </div>

      {/* Section status hint */}
      {isComplete && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{sectionLabel}: dirección verificada por Google</span>
        </div>
      )}
    </div>
  );
}

// ── Internal field ─────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

// ── Map pin icon (used in section headers of the form) ────────────────────────

export { MapPin };
