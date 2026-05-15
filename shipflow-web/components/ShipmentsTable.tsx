"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Truck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/forms";
import { getShipments } from "@/lib/services/shipmentService";
import { apiVoidLabel } from "@/lib/services/apiClient";
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
  purchased: "Comprada",
  internal: "Interna",
  pending: "Pendiente",
  processing: "Procesando",
  voided: "Anulada",
  refunded: "Reembolsada",
  failed: "Fallida",
};

export function ShipmentsTable() {
  const [shipments, setShipments] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voidSuccess, setVoidSuccess] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await getShipments();
      setShipments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shipments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.setTimeout(() => { load(); }, 0);
  }, []);

  function startVoid(id: string) {
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
      setVoidError(err instanceof Error ? err.message : "Could not void this label.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Loading shipments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="Todavía no hay envíos"
        description="Create your first label to fill this table automatically."
      />
    );
  }

  const canVoid = (s: Envio) => s.provider === "shipstation" && s.labelStatus === "purchased";

  return (
    <div className="grid gap-3">
      {voidSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {voidSuccess}
        </div>
      )}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1100px] grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>Guía / Estado</span>
            <span>Destinatario</span>
            <span>Carrier / Provider</span>
            <span>Label</span>
            <span>Precio</span>
            <span>Fecha</span>
            <span>Acciones</span>
          </div>
          {shipments.map((shipment) => (
            <div key={shipment.id} className="grid min-w-[1100px] grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
              {/* Guía / Estado */}
              <div>
                <p className="font-black text-slate-950 tabular-nums">{shipment.trackingNumber}</p>
                <Badge tone={statusTone[shipment.status] ?? "amber"} className="mt-1">
                  {shipment.status}
                </Badge>
              </div>

              {/* Destinatario */}
              <div>
                <span className="text-slate-700">{shipment.recipientName}</span>
                <p className="text-xs text-slate-400">{shipment.destinationCity}</p>
              </div>

              {/* Carrier / Provider */}
              <div>
                <span className="text-slate-700">{shipment.courier}</span>
                {shipment.provider ? (
                  <Badge
                    tone={shipment.provider === "shipstation" ? "blue" : "slate"}
                    className="mt-1"
                  >
                    {shipment.provider}
                  </Badge>
                ) : null}
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
                  <p className="mt-1 text-xs text-slate-400">{shipment.paymentStatus}</p>
                ) : null}
              </div>

              {/* Precio */}
              <span className="font-bold text-slate-950">
                {formatCurrency(shipment.customerPrice ?? shipment.value)}
              </span>

              {/* Fecha */}
              <span className="text-slate-600">{formatDate(shipment.date)}</span>

              {/* Acciones */}
              <div className="flex flex-wrap items-start gap-2">
                <Link
                  href={`/guia/${shipment.trackingNumber}`}
                  className="rounded-2xl bg-pink-50 px-3 py-1.5 text-xs font-black text-[#FF1493]"
                >
                  Ver guía
                </Link>

                {canVoid(shipment) ? (
                  voidingId === shipment.id ? (
                    <div className="grid gap-1">
                      <div className="flex items-center gap-1 rounded-2xl bg-amber-50 px-3 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700">¿Anular?</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => confirmVoid(shipment.id)}
                          className="rounded-xl bg-red-100 px-2 py-1 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                          Sí
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
                      Anular
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
