"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileText, RefreshCw, Truck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/forms";
import { getShipments } from "@/lib/services/shipmentService";
import { apiGetConfigStatus, apiVoidLabel, type ConfigStatus } from "@/lib/services/apiClient";
import type { Envio } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

const labelStatusTone: Record<string, "green" | "blue" | "amber" | "slate"> = {
  purchased: "green",
  internal: "blue",
  pending: "amber",
  processing: "amber",
  voided: "slate",
  refunded: "slate",
  failed: "amber",
};

const labelStatusLabel: Record<string, string> = {
  purchased: "Purchased",
  internal: "Processed",
  pending: "Pending",
  processing: "Processing",
  voided: "Voided",
  refunded: "Refunded",
  failed: "Failed",
};

function displayShipmentStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

function displayPaymentStatus(status?: string | null) {
  if (!status) return null;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function displayProvider(shipment: Envio) {
  return shipment.provider || shipment.courier || "Carrier";
}

function displayService(shipment: Envio) {
  return shipment.providerServiceCode || "Service selected";
}

export function ShipmentsTable() {
  const [shipments, setShipments] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voidSuccess, setVoidSuccess] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await getShipments();
      setShipments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not load shipments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.setTimeout(() => { load(); }, 0);
    apiGetConfigStatus().then(setConfigStatus);
  }, []);

  function startVoid(id: string) {
    if (configStatus?.labelVoidEnabled !== true) {
      setVoidError("Void is not enabled yet.");
      setVoidSuccess(null);
      setVoidingId(null);
      return;
    }
    setVoidingId(id);
    setVoidError(null);
    setVoidSuccess(null);
  }

  function cancelVoid() {
    setVoidingId(null);
    setVoidError(null);
  }

  async function confirmVoid(shipmentId: string) {
    try {
      setVoidError(null);
      const result = await apiVoidLabel(shipmentId);
      setVoidSuccess(result.message || "Label voided.");
      setVoidingId(null);
      await load();
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "We could not void this label.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Loading your shipment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No shipments yet"
        description="Paid labels appear here automatically with tracking, carrier details, and label downloads."
      />
    );
  }

  const canVoid = (s: Envio) =>
    configStatus?.labelVoidEnabled === true &&
    s.provider === "shipstation" &&
    s.labelStatus === "purchased";
  const renderActions = (shipment: Envio) => (
    <div className="flex flex-wrap items-start gap-2">
      <Link
        href={`/guia/${shipment.trackingNumber}`}
        className="inline-flex items-center rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
      >
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        Details
      </Link>
      <Link
        href={`/tracking?trackingNumber=${encodeURIComponent(shipment.trackingNumber)}`}
        className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
      >
        Track
      </Link>

      {shipment.labelStatus === "purchased" && shipment.labelUrl ? (
        <a
          href={shipment.labelUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-2xl bg-[#F97316] px-3 py-1.5 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition hover:bg-[#EA580C]"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Open label
        </a>
      ) : shipment.labelStatus === "voided" ? (
        <span className="rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
          Voided label - do not use
        </span>
      ) : shipment.labelStatus === "purchased" ? (
        <span className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
          Carrier label unavailable
        </span>
      ) : null}

      {canVoid(shipment) ? (
        voidingId === shipment.id ? (
          <div className="grid gap-1">
            <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-3 py-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">Void?</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => confirmVoid(shipment.id)}
                className="rounded-xl bg-red-100 px-2 py-1 text-xs font-black text-red-700 hover:bg-red-200"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={cancelVoid}
                className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-200"
              >
                No
              </button>
            </div>
            {voidError ? (
              <p className="text-xs font-semibold text-red-600">{voidError}</p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startVoid(shipment.id)}
            className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-700"
          >
            Void label
          </button>
        )
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm shadow-blue-950/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-blue-950">Automatic label workspace</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-blue-800">
              Paid labels appear here after checkout with the tracking number, carrier service,
              PDF label when available, and shipment details for handoff.
            </p>
          </div>
          <Link
            href="/crear-guia"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#F97316] px-4 text-sm font-black text-white shadow-sm shadow-orange-500/20"
          >
            Create shipment
          </Link>
        </div>
      </div>
      {voidSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {voidSuccess}
        </div>
      )}
      {voidError && !voidingId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {voidError}
        </div>
      )}
      <div className="grid gap-3 md:hidden">
        {shipments.map((shipment) => (
          <article
            key={shipment.id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-black text-slate-950 tabular-nums">
                  {shipment.trackingNumber}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {shipment.recipientName}
                </p>
                <p className="text-xs text-slate-400">{shipment.destinationCity}</p>
              </div>
              <Badge tone={statusTone[shipment.status] ?? "amber"}>
                {displayShipmentStatus(shipment.status)}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Carrier</span>
                <span className="break-words text-right font-bold text-slate-950">
                  {displayProvider(shipment)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Service</span>
                <span className="break-words text-right font-bold text-slate-950">
                  {displayService(shipment)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Label</span>
                <span>
                  {shipment.labelStatus ? (
                    <Badge tone={labelStatusTone[shipment.labelStatus] ?? "slate"}>
                      {labelStatusLabel[shipment.labelStatus] ?? shipment.labelStatus}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </span>
              </div>
              {shipment.paymentStatus ? (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-bold text-slate-950">
                    {displayPaymentStatus(shipment.paymentStatus)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Price</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(shipment.customerPrice ?? shipment.value)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Date</span>
                <span className="font-bold text-slate-950">{formatDate(shipment.date)}</span>
              </div>
            </div>

            <div className="mt-4">{renderActions(shipment)}</div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 md:block">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1160px] grid-cols-[1.25fr_1.1fr_1.05fr_0.8fr_0.75fr_0.9fr_1.1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>Shipment / Status</span>
            <span>Recipient</span>
            <span>Carrier / Service</span>
            <span>Label</span>
            <span>Price</span>
            <span>Date</span>
            <span>Actions</span>
          </div>
          {shipments.map((shipment) => (
            <div key={shipment.id} className="grid min-w-[1160px] grid-cols-[1.25fr_1.1fr_1.05fr_0.8fr_0.75fr_0.9fr_1.1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm transition hover:bg-slate-50 last:border-0">
              {/* Shipment / Status */}
              <div>
                <p className="font-black text-slate-950 tabular-nums">{shipment.trackingNumber}</p>
                <Badge tone={statusTone[shipment.status] ?? "amber"} className="mt-1">
                  {displayShipmentStatus(shipment.status)}
                </Badge>
              </div>

              {/* Recipient */}
              <div>
                <span className="text-slate-700">{shipment.recipientName}</span>
                <p className="text-xs text-slate-400">{shipment.destinationCity}</p>
              </div>

              {/* Carrier */}
              <div>
                <span className="font-bold text-slate-700">{displayProvider(shipment)}</span>
                <p className="mt-1 text-xs text-slate-400">{displayService(shipment)}</p>
              </div>

              {/* Label status */}
              <div>
                {shipment.labelStatus ? (
                  <Badge tone={labelStatusTone[shipment.labelStatus] ?? "slate"}>
                    {labelStatusLabel[shipment.labelStatus] ?? shipment.labelStatus}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
                {shipment.paymentStatus ? (
                  <p className="mt-1 text-xs text-slate-400">Payment: {displayPaymentStatus(shipment.paymentStatus)}</p>
                ) : null}
              </div>

              {/* Price */}
              <span className="font-bold text-slate-950">
                {formatCurrency(shipment.customerPrice ?? shipment.value)}
              </span>

              {/* Date */}
              <span className="text-slate-600">{formatDate(shipment.date)}</span>

              {/* Actions */}
              {renderActions(shipment)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
