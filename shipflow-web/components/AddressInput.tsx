"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Info, Map, Search } from "lucide-react";
import {
  loadGoogleMapsScript,
  parseAddressComponents,
  parsePastedUSAddress,
  US_STATE_CODES,
} from "@/lib/googleMapsUtils";
import { AddressMapPicker } from "@/components/AddressMapPicker";
import type { StructuredAddress } from "@/lib/types";

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
            opts?: {
              types?: string[];
              fields?: string[];
              componentRestrictions?: { country: string | string[] };
            },
          ) => GoogleAutocomplete;
        };
      };
    };
    __gMapsLoaded?: boolean;
    __gMapsCallbacks?: (() => void)[];
  }
}

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

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const HAS_GOOGLE_MAPS = Boolean(GOOGLE_MAPS_KEY);

function toUSAddress(current: StructuredAddress, partial: Partial<StructuredAddress>): StructuredAddress {
  const next = {
    ...current,
    ...partial,
    country: "US",
  };

  return {
    ...next,
    street1: next.street1 ?? "",
    city: next.city ?? "",
    state: next.state ?? "",
    postalCode: next.postalCode ?? "",
  };
}

function isComplete(addr: StructuredAddress) {
  return Boolean(addr.street1?.trim() && addr.city?.trim() && addr.state?.trim() && addr.postalCode?.trim());
}

export function AddressInput({
  sectionLabel,
  value,
  onChange,
  requirePostal = false,
  errors = {},
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [mapsReady, setMapsReady] = useState(false);
  const [searchText, setSearchText] = useState(value.formattedAddress ?? "");
  const [showManual, setShowManual] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!HAS_GOOGLE_MAPS) return;
    loadGoogleMapsScript(GOOGLE_MAPS_KEY, () => setMapsReady(true));
  }, []);

  useEffect(() => {
    if (!mapsReady || !searchRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
      types: ["address"],
      fields: ["address_components", "geometry", "formatted_address", "place_id"],
      componentRestrictions: { country: "us" },
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat() ?? 0;
      const lng = place.geometry?.location?.lng() ?? 0;
      const parsed = parseAddressComponents(
        place.address_components ?? [],
        { lat, lng },
        place.formatted_address,
        place.place_id,
        "google_places",
      );

      if ((parsed.country ?? "US") !== "US") {
        setAddressError("Por ahora solo aceptamos envíos dentro de Estados Unidos.");
        return;
      }

      setAddressError(null);
      setSearchText(place.formatted_address ?? "");
      const current = valueRef.current;
      onChange(
        toUSAddress(current, {
          ...parsed,
          name: current.name,
          phone: current.phone,
          company: current.company,
          street2: current.street2,
        }),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  function set(field: keyof StructuredAddress, val: string) {
    const next = toUSAddress(value, {
      [field]: field === "state" ? val.toUpperCase() : val,
      source: "manual",
    });
    next.validationStatus = isComplete(next) ? "complete" : "needs_review";
    onChange(next);
  }

  function parseSearchText() {
    const parsed = parsePastedUSAddress(searchText);
    const next = toUSAddress(value, {
      ...parsed,
      name: value.name,
      phone: value.phone,
      company: value.company,
      street2: value.street2,
    });
    setAddressError(
      next.validationStatus === "complete" ? null : "Revisa ciudad, estado y ZIP.",
    );
    onChange(next);
    if (next.validationStatus !== "complete") setShowManual(true);
  }

  function handleMapSelect(partial: Partial<StructuredAddress>) {
    if ((partial.country ?? "US") !== "US") {
      setAddressError("Por ahora solo aceptamos envíos dentro de Estados Unidos.");
      return;
    }

    setAddressError(null);
    onChange(
      toUSAddress(value, {
        ...partial,
        name: value.name,
        phone: value.phone,
        company: value.company,
        street2: value.street2,
      }),
    );
  }

  const complete = value.validationStatus === "complete" || isComplete(value);
  const needsReview = value.validationStatus === "needs_review";
  const summary = [value.street1, value.city, value.state, value.postalCode].filter(Boolean).join(", ");

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Nombre"
          value={value.name ?? ""}
          onChange={(v) => set("name", v)}
          placeholder="Ej. Juan García"
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

      <div className="grid gap-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Busca o pega la dirección
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onBlur={() => {
                  if (!HAS_GOOGLE_MAPS && searchText.trim()) parseSearchText();
                }}
                placeholder="700-798 Borello Way, Mountain View, CA 94041, USA"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />
            </div>
            <button
              type="button"
              onClick={parseSearchText}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              Revisar
            </button>
          </div>
        </label>

        {HAS_GOOGLE_MAPS ? (
          <p className="text-xs text-slate-400">
            Puedes seleccionar una sugerencia, pegar una dirección completa o usar el mapa.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Mapa disponible al configurar Google Maps. También puedes pegar una dirección completa.
          </p>
        )}
        {addressError ? <p className="text-xs font-semibold text-amber-700">{addressError}</p> : null}
      </div>

      {summary ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-xs ${
            complete
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
            <span>{sectionLabel}: {summary}</span>
          </div>
          {needsReview ? <p className="mt-1">Revisa ciudad, estado y ZIP.</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowManual((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Editar datos manualmente
        </button>

        {HAS_GOOGLE_MAPS ? (
          <button
            type="button"
            onClick={() => setShowMap((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-[#0891B2] hover:bg-cyan-100"
          >
            <Map className="h-3.5 w-3.5" />
            Seleccionar en mapa
          </button>
        ) : null}
      </div>

      {showMap && HAS_GOOGLE_MAPS ? (
        <AddressMapPicker value={value} onSelect={handleMapSelect} apiKey={GOOGLE_MAPS_KEY} />
      ) : null}

      {showManual ? (
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
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
          <InputField
            label="Ciudad"
            value={value.city}
            onChange={(v) => set("city", v)}
            placeholder="Ej. Mountain View"
            error={errors.city}
          />
          <StateSelect value={value.state} onChange={(v) => set("state", v)} error={errors.state} />
          <InputField
            label={requirePostal ? "ZIP *" : "ZIP"}
            value={value.postalCode}
            onChange={(v) => set("postalCode", v)}
            placeholder="Ej. 94041"
            error={errors.postalCode}
          />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            País
            <input
              value="Estados Unidos"
              disabled
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-500"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function StateSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      Estado
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
      >
        <option value="">Selecciona estado</option>
        {US_STATE_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

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
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}
