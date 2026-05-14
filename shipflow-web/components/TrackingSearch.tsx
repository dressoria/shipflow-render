"use client";

import { FormEvent, useState } from "react";
import { MapPinned, Search } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/forms";
import { getShipmentByTrackingNumber, getShipments } from "@/lib/services/shipmentService";
import { getTrackingEvents, saveRealTrackingEvents } from "@/lib/services/trackingService";
import type { Envio, StandardTrackingStatus, TrackingEvent, TrackingStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

const realStatusTone: Record<StandardTrackingStatus, "blue" | "green" | "amber" | "slate"> = {
  pendiente: "amber",
  recolectado: "blue",
  en_transito: "blue",
  en_reparto: "blue",
  entregado: "green",
  novedad: "amber",
  devuelto: "slate",
  cancelado: "slate",
};

type TrackingApiResponse = {
  success: boolean;
  data: TrackingStatus | null;
  error: string | null;
};

export function TrackingSearch() {
  const [guide, setGuide] = useState("");
  const [shipment, setShipment] = useState<Envio | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [realTracking, setRealTracking] = useState<TrackingStatus | null>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [loadingRealTracking, setLoadingRealTracking] = useState(false);
  const [searched, setSearched] = useState(false);

  async function loadTracking(foundShipment: Envio) {
    setRealTracking(null);
    setTrackingMessage("Checking live carrier status...");
    setLoadingRealTracking(true);

    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: foundShipment.trackingNumber,
          courier: foundShipment.courier,
        }),
      });
      const data = (await response.json()) as TrackingApiResponse;

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "We could not check this carrier right now");
      }

      await saveRealTrackingEvents(foundShipment.id, data.data);
      setEvents(await getTrackingEvents(foundShipment.trackingNumber));
      setRealTracking(data.data);
      setTrackingMessage(data.data.isReal ? "Information retrieved from the logistics carrier" : "Temporary simulated information");
    } catch (error) {
      setTrackingMessage(error instanceof Error ? error.message : "We could not check this carrier right now");
    } finally {
      setLoadingRealTracking(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const foundShipment = await getShipmentByTrackingNumber(guide);
    setShipment(foundShipment);
    setEvents(foundShipment ? await getTrackingEvents(foundShipment.trackingNumber) : []);
    if (foundShipment) {
      await loadTracking(foundShipment);
    } else {
      setRealTracking(null);
      setTrackingMessage("");
    }
    setSearched(true);
  }

  async function loadFirstGuide() {
    const first = (await getShipments())[0];
    if (!first) return;
    setGuide(first.trackingNumber);
    setShipment(first);
    setEvents(await getTrackingEvents(first.trackingNumber));
    await loadTracking(first);
    setSearched(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Tracking number
            <input
              value={guide}
              onChange={(event) => setGuide(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              placeholder="SF-24018"
            />
          </label>
          <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:bg-[#0891B2]">
            <Search className="mr-2 h-4 w-4" />
            Search shipment
          </button>
          <button type="button" onClick={loadFirstGuide} className="text-sm font-bold text-[#06B6D4]">
            Use first saved shipment
          </button>
        </form>
      </div>

      {shipment ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Label</p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">{shipment.trackingNumber}</h2>
            </div>
            <Badge tone={realTracking ? realStatusTone[realTracking.status] : statusTone[shipment.status]}>
              {realTracking?.statusLabel ?? shipment.status}
            </Badge>
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#06B6D4]">
              {loadingRealTracking ? "Checking live carrier status..." : realTracking?.isReal ? "Live tracking" : "Fallback status"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {trackingMessage || "We could not check this carrier right now"}
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="Route" value={`${shipment.originCity} -> ${shipment.destinationCity}`} />
            <Info label="Carrier" value={realTracking?.courier ?? shipment.courier} />
            <Info label="Recipient" value={shipment.recipientName} />
            <Info label="Value" value={formatCurrency(shipment.value)} />
            <Info label="Current city" value={realTracking?.currentLocation ?? shipment.destinationCity} />
            <Info label="Last update" value={realTracking?.lastUpdate ? formatDate(realTracking.lastUpdate) : formatDate(shipment.date)} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5">
            {realTracking?.events.length ? (
              realTracking.events.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[#06B6D4]" />
                  <div>
                    <p className="font-bold text-slate-950">{event.title}</p>
                    {event.location ? <p className="text-sm font-semibold text-slate-600">{event.location}</p> : null}
                    {event.description ? <p className="text-sm text-slate-500">{event.description}</p> : null}
                    <p className="text-sm text-slate-500">{event.date ? formatDate(event.date) : event.statusLabel}</p>
                  </div>
                </div>
              ))
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <span className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-bold text-slate-950">{event.title}</p>
                    <p className="text-sm text-slate-500">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : searched ? (
        <EmptyState
          icon={MapPinned}
          title="Shipment not found"
          description="Check the tracking number or create a new label to test simulated tracking."
        />
      ) : (
        <EmptyState
          icon={MapPinned}
          title="Search a shipment"
          description="Enter a tracking number created in the platform to view its status."
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
