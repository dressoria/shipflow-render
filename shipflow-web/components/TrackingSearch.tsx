"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Download, MapPinned, Search } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/forms";
import { getShipments } from "@/lib/services/shipmentService";
import { apiGetTracking, type BasicTrackingData } from "@/lib/services/apiClient";
import type { Envio, TrackingEvent } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

function displayShipmentStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

function displayRecordStatus(status?: string | null) {
  if (!status) return "Not available";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function TrackingSearch() {
  const [guide, setGuide] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("trackingNumber") ?? params.get("tracking_number") ?? "";
  });
  const [shipment, setShipment] = useState<Envio | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [trackingData, setTrackingData] = useState<BasicTrackingData | null>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [searched, setSearched] = useState(false);

  async function loadTracking(trackingNumber: string) {
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    setTrackingData(null);
    setShipment(null);
    setEvents([]);
    setTrackingMessage("");
    setLoadingTracking(true);
    setSearched(true);
    try {
      const data = await apiGetTracking(trimmed);
      setTrackingData(data);
      setShipment(data.shipment);
      setEvents(data.events);
      setTrackingMessage(data.message);
    } catch (error) {
      setTrackingMessage(error instanceof Error ? error.message : "We could not load tracking details right now. Please try again.");
    } finally {
      setLoadingTracking(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialTracking = params.get("trackingNumber") ?? params.get("tracking_number");
    if (!initialTracking) return;
    window.setTimeout(() => { void loadTracking(initialTracking); }, 0);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadTracking(guide);
  }

  async function loadFirstGuide() {
    const first = (await getShipments())[0];
    if (!first) return;
    setGuide(first.trackingNumber);
    await loadTracking(first.trackingNumber);
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
            {loadingTracking ? "Loading tracking..." : "Track shipment"}
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
              <p className="text-sm text-slate-500">Shipment</p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">{shipment.trackingNumber}</h2>
            </div>
            <Badge tone={statusTone[shipment.status]}>
              {displayShipmentStatus(shipment.status)}
            </Badge>
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#06B6D4]">
                {loadingTracking ? "Loading tracking..." : events.length ? "Shipment timeline" : "Pending carrier updates"}
              </p>
              {!loadingTracking && shipment.labelStatus === "purchased" && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">
                  Label purchased
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {trackingMessage || "Tracking updates will appear once the carrier reports movement."}
            </p>
            {!loadingTracking && events.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                This is not realtime carrier tracking yet.
              </p>
            )}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="Route" value={`${shipment.originCity} -> ${shipment.destinationCity}`} />
            <Info label="Carrier" value={trackingData?.carrier ?? shipment.courier} />
            <Info label="Service" value={trackingData?.service ?? shipment.providerServiceCode ?? "Not available"} />
            <Info label="Recipient" value={shipment.recipientName} />
            <Info label="Destination" value={shipment.destinationAddress || shipment.destinationCity} />
            <Info label="Label" value={displayRecordStatus(shipment.labelStatus)} />
            <Info label="Payment" value={displayRecordStatus(shipment.paymentStatus)} />
            <Info label="Total paid" value={formatCurrency(shipment.customerPrice ?? shipment.value)} />
            <Info label="Created" value={formatDate(shipment.date)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {shipment.labelUrl ? (
              <a
                href={shipment.labelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Download carrier label
              </a>
            ) : null}
            <Link
              href={`/guia/${shipment.trackingNumber}`}
              className="inline-flex h-10 items-center rounded-2xl bg-cyan-50 px-4 text-sm font-bold text-[#06B6D4]"
            >
              View shipment
            </Link>
          </div>
          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Timeline</h3>
            {events.length ? events.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <span className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-bold text-slate-950">{event.title}</p>
                    {event.description ? <p className="text-sm text-slate-500">{event.description}</p> : null}
                    <p className="text-sm text-slate-500">{formatDate(event.date)}</p>
                  </div>
                </div>
              )) : (
                <div className="grid gap-3">
                  {shipment.labelStatus === "purchased" ? (
                    <div className="flex gap-4">
                      <span className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                      <div>
                        <p className="font-bold text-slate-950">Label purchased</p>
                        <p className="text-sm text-slate-500">{formatDate(shipment.date)}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">No tracking events yet.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tracking updates will appear once the carrier reports movement.
                  </p>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      ) : searched ? (
        <EmptyState
          icon={MapPinned}
          title="Tracking number not found"
          description="Check the number and try again."
        />
      ) : (
        <EmptyState
          icon={MapPinned}
          title="Track a shipment"
          description="Enter a tracking number to view shipment details and carrier updates."
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
