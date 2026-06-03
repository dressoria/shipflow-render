"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { getEcuadorStatusLabel, getEcuadorStatusTone } from "@/lib/ecuador/copy";
import { ECUADOR_ADMIN_EDITABLE_STATUSES, type AdminEcuadorShipmentRequest } from "@/lib/ecuador/types";
import { formatDate } from "@/lib/forms";
import { apiGetAdminEcuadorShipments } from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";

export function AdminEcuadorShipmentsView() {
  const [shipments, setShipments] = useState<AdminEcuadorShipmentRequest[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetAdminEcuadorShipments({ status: status || undefined, search: search || undefined, limit: 100 })
      .then((result) => setShipments(result.shipments))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No pudimos cargar las solicitudes Ecuador admin."))
      .finally(() => setLoading(false));
  }, [search, status]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Solicitudes Ecuador</h2>
            <p className="text-sm text-slate-500">Beta request · No provider call · No payment · Internal review only.</p>
            <p className="mt-1 text-sm text-amber-700">Delivereo is not connected. No real provider operations are available.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/ecuador/providers" className="inline-flex items-center gap-2 rounded-2xl border border-pink-100 bg-pink-50 px-4 py-2 text-sm font-black text-[#FF1493]">
              Diagnóstico providers
            </Link>
            <Link href="/ecuador" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
              <MapPinned className="h-4 w-4" />
              Ver página pública
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
            >
              <option value="">Todos</option>
              {ECUADOR_ADMIN_EDITABLE_STATUSES.map((option) => (
                <option key={option} value={option}>{getEcuadorStatusLabel(option)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Buscar</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ID, ciudad, origen o destinatario"
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
            />
          </label>
        </div>
      </div>

      {loading ? <div className="p-4"><LoadingState /></div> : null}
      {!loading && error ? <div className="m-4 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div> : null}
      {!loading && !error && shipments.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={MapPinned}
            title="No hay solicitudes Ecuador todavía"
            description="Las solicitudes beta de clientes aparecerán aquí para revisión operativa interna, sin provider call ni payment."
          />
        </div>
      ) : null}
      {!loading && !error && shipments.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {shipments.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/admin/ecuador-envios/${shipment.id}`}
              className="grid gap-3 p-4 transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_150px_120px_120px_120px_120px_24px]"
            >
              <div className="min-w-0">
                <p className="font-black text-slate-950">
                  {shipment.originCity || "Origen"} → {shipment.destinationCity || "Destino"}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {shipment.destinationName || "Cliente pendiente"} · {shipment.provider} · {shipment.userId}
                </p>
              </div>
              <Badge tone={getEcuadorStatusTone(shipment.status)}>{getEcuadorStatusLabel(shipment.status)}</Badge>
              <p className="text-sm font-bold text-slate-600">{formatDate(shipment.createdAt)}</p>
              <p className="text-sm text-slate-600">{shipment.customerPrice != null ? formatCurrency(shipment.customerPrice) : "Sin precio"}</p>
              <p className="text-sm text-slate-600">{shipment.providerCost != null ? formatCurrency(shipment.providerCost) : "Sin costo"}</p>
              <p className="text-sm text-slate-600">{shipment.margin != null ? formatCurrency(shipment.margin) : "Sin margen"}</p>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
