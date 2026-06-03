"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPinned, PackageSearch } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { getEcuadorStatusLabel, getEcuadorStatusTone } from "@/lib/ecuador/copy";
import type { EcuadorShipmentRequest } from "@/lib/ecuador/types";
import { formatDate } from "@/lib/forms";
import { apiGetEcuadorShipmentRequests } from "@/lib/services/apiClient";

export function EcuadorShipmentsView() {
  const [shipments, setShipments] = useState<EcuadorShipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetEcuadorShipmentRequests({ limit: 100 })
      .then((result) => setShipments(result.shipments))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No pudimos cargar tus solicitudes Ecuador."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-black text-slate-950">Mis solicitudes Ecuador</h2>
          <p className="text-sm text-slate-500">Envíos Ecuador está en preparación. Tus solicitudes aquí son solo para revisión beta.</p>
        </div>
        <Link href="/ecuador/crear-envio" className="rounded-2xl bg-[#F97316] px-4 py-2 text-sm font-black text-white">
          Solicitar revisión beta
        </Link>
      </div>

      {shipments.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={PackageSearch}
            title="No tienes solicitudes Ecuador todavía"
            description="Cuando envíes una solicitud beta, aparecerá aquí con su estado y detalle."
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {shipments.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/ecuador/envios/${shipment.id}`}
              className="grid gap-3 p-4 transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_170px_140px_180px_28px]"
            >
              <div className="min-w-0">
                <p className="font-black text-slate-950">
                  {shipment.originCity || "Origen pendiente"} → {shipment.destinationCity || "Destino pendiente"}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {shipment.packageDescription || "Solicitud beta"} · {shipment.destinationName || "Destinatario pendiente"}
                </p>
              </div>
              <Badge tone={getEcuadorStatusTone(shipment.status)}>{getEcuadorStatusLabel(shipment.status)}</Badge>
              <p className="text-sm font-bold text-slate-600">{formatDate(shipment.createdAt)}</p>
              <p className="text-sm text-slate-500">Revisión interna beta</p>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <MapPinned className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-black text-slate-950">Preparación beta</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Estas solicitudes no crean órdenes reales todavía. SendiFlash las revisa internamente mientras Ecuador Shipping termina su preparación y no se realiza ningún cobro desde aquí.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
