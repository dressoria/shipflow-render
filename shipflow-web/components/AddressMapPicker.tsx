"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMapsScript, parseAddressComponents } from "@/lib/googleMapsUtils";
import type { GoogleAddressComponent } from "@/lib/googleMapsUtils";
import type { StructuredAddress } from "@/lib/types";

// ── Minimal local types for Map / Marker / Geocoder ──────────────────────────

type GLatLng = { lat(): number; lng(): number };
type GLatLngLiteral = { lat: number; lng: number };

type GMap = {
  addListener(event: string, fn: (e: { latLng: GLatLng }) => void): void;
};

type GMarker = {
  setPosition(pos: GLatLngLiteral): void;
  getPosition(): GLatLng | null;
  addListener(event: string, fn: () => void): void;
};

type GGeocoderResult = {
  address_components: GoogleAddressComponent[];
  formatted_address: string;
  place_id?: string;
  geometry: { location: GLatLng };
};

type GGeocoder = {
  geocode(
    req: { location: GLatLngLiteral },
    cb: (results: GGeocoderResult[] | null, status: string) => void,
  ): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGMaps(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google?.maps ?? null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  value: StructuredAddress;
  onSelect: (partial: Partial<StructuredAddress>) => void;
  apiKey: string;
};

const DEFAULT_CENTER: GLatLngLiteral = { lat: 40.7128, lng: -74.006 }; // New York

// ── Component ─────────────────────────────────────────────────────────────────

export function AddressMapPicker({ value, onSelect, apiKey }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markerRef = useRef<GMarker | null>(null);
  const geocoderRef = useRef<GGeocoder | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(
    () =>
      value.latitude && value.longitude
        ? "Mueve el pin o haz clic en el mapa para ajustar la ubicación."
        : "Haz clic en el mapa o arrastra el pin para seleccionar la ubicación.",
  );

  useEffect(() => {
    loadGoogleMapsScript(apiKey, () => setMapsReady(true));
  }, [apiKey]);

  useEffect(() => {
    if (!mapsReady || !mapDivRef.current) return;
    const gmaps = getGMaps();
    if (!gmaps) return;

    const center: GLatLngLiteral =
      value.latitude && value.longitude
        ? { lat: value.latitude, lng: value.longitude }
        : DEFAULT_CENTER;

    const map: GMap = new gmaps.Map(mapDivRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    });

    const marker: GMarker = new gmaps.Marker({
      position: center,
      map,
      draggable: true,
      title: "Arrastra para ubicar",
      animation: gmaps.Animation?.DROP,
    });

    const geocoder: GGeocoder = new gmaps.Geocoder();

    mapRef.current = map;
    markerRef.current = marker;
    geocoderRef.current = geocoder;

    function reverseGeocode(lat: number, lng: number) {
      setGeocoding(true);
      setStatusMsg(null);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === "OK" && results && results.length > 0) {
          const result = results[0];
          const parsed = parseAddressComponents(
            result.address_components,
            { lat, lng },
            result.formatted_address,
            result.place_id,
            "map_pin",
          );
          onSelect(parsed);
          if (parsed.validationStatus === "needs_review") {
            setStatusMsg("Revisa los datos postales. Algunos campos pueden estar incompletos.");
          } else {
            setStatusMsg("Dirección encontrada. Puedes editar los campos si es necesario.");
          }
        } else {
          onSelect({
            latitude: lat,
            longitude: lng,
            source: "map_pin",
            validationStatus: "needs_review",
          });
          setStatusMsg("No se encontró dirección exacta. Completa los campos manualmente.");
        }
      });
    }

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) reverseGeocode(pos.lat(), pos.lng());
    });

    map.addListener("click", (e: { latLng: GLatLng }) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  if (!mapsReady) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Cargando mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div
        ref={mapDivRef}
        className="h-56 w-full overflow-hidden rounded-2xl border border-slate-200"
      />
      {geocoding && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Obteniendo dirección...</span>
        </div>
      )}
      {statusMsg && !geocoding && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF1493]" />
          {statusMsg}
        </p>
      )}
      <p className="text-xs text-slate-400">
        El mapa ayuda a ubicar, pero la guía necesita dirección postal completa. Revisa los campos tras seleccionar.
      </p>
    </div>
  );
}
