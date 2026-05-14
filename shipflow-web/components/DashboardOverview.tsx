"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CircleDollarSign, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/forms";
import { getAvailableBalance } from "@/lib/services/balanceService";
import { getShipments } from "@/lib/services/shipmentService";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Envio } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

export function DashboardOverview() {
  const [shipments, setShipments] = useState<Envio[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.setTimeout(() => {
      Promise.all([getShipments(), getAvailableBalance()]).then(([nextShipments, nextBalance]) => {
        setShipments(nextShipments);
        setBalance(nextBalance);
        setLoading(false);
      });
    }, 250);
  }, []);

  const total = useMemo(
    () => shipments.reduce((sum, shipment) => sum + shipment.value, 0),
    [shipments],
  );
  const inTransit = shipments.filter((shipment) => shipment.status === "En tránsito").length;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingState />
        <LoadingState />
        <LoadingState />
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Guías creadas" value={shipments.length.toString()} detail="+18% semana" icon={PackageCheck} />
        <StatCard label="Costo estimado" value={formatCurrency(total)} detail={isSupabaseConfigured ? "Supabase" : "fallback"} icon={CircleDollarSign} tone="green" />
        <StatCard label="En tránsito" value={inTransit.toString()} detail="activo" icon={Truck} />
        <StatCard label="Saldo" value={formatCurrency(balance)} detail={isSupabaseConfigured ? "conectado" : "fallback"} icon={Activity} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-black text-slate-950">Envíos recientes</h2>
              <p className="text-sm text-slate-500">
                {isSupabaseConfigured ? "Datos sincronizados con Supabase." : "Datos del modo fallback."}
              </p>
            </div>
            <Badge tone="blue">Actualizado ahora</Badge>
          </div>
          {shipments.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[800px] grid-cols-[1fr_1.3fr_1.1fr_1fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                <span>Guía</span>
                <span>Cliente</span>
                <span>Fecha</span>
                <span>Estado</span>
                <span>Valor</span>
              </div>
              {shipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="grid min-w-[800px] grid-cols-[1fr_1.3fr_1.1fr_1fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                  <span className="font-black text-slate-950">{shipment.id}</span>
                  <span className="text-slate-600">{shipment.recipientName}</span>
                  <span className="text-slate-600">{formatDate(shipment.date)}</span>
                  <span>
                    <Badge tone={statusTone[shipment.status]}>{shipment.status}</Badge>
                  </span>
                  <span className="font-bold text-slate-950">{formatCurrency(shipment.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={Truck}
                title="No labels yet"
                description="Create a label to see activity in the dashboard."
              />
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <LoadingState />
          <EmptyState
            icon={Truck}
            title="Sin incidencias abiertas"
            description="Cuando un envío tenga novedades, aparecerá aquí con prioridad y acciones rápidas."
          />
        </div>
      </div>
    </>
  );
}
