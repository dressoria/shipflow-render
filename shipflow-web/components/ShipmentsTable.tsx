"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/forms";
import { getShipments } from "@/lib/services/shipmentService";
import type { Envio } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

export function ShipmentsTable() {
  const [shipments, setShipments] = useState<Envio[]>([]);

  useEffect(() => {
    window.setTimeout(() => {
      getShipments().then(setShipments);
    }, 0);
  }, []);

  if (shipments.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="Todavía no hay envíos"
        description="Create your first label to fill this table automatically."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[1020px] grid-cols-[1fr_1.2fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Guía</span>
          <span>Destinatario</span>
          <span>Fecha</span>
          <span>Courier</span>
          <span>Destino</span>
          <span>Valor</span>
          <span>Acción</span>
        </div>
        {shipments.map((shipment) => (
          <div key={shipment.id} className="grid min-w-[1020px] grid-cols-[1fr_1.2fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
            <div>
              <p className="font-black text-slate-950">{shipment.id}</p>
              <Badge tone={statusTone[shipment.status]} className="mt-2">
                {shipment.status}
              </Badge>
            </div>
            <span className="text-slate-600">{shipment.recipientName}</span>
            <span className="text-slate-600">{formatDate(shipment.date)}</span>
            <span className="text-slate-600">{shipment.courier}</span>
            <span className="text-slate-600">{shipment.destinationCity}</span>
            <span className="font-bold text-slate-950">{formatCurrency(shipment.value)}</span>
            <span>
              <Link href={`/guia/${shipment.trackingNumber}`} className="rounded-2xl bg-pink-50 px-3 py-2 text-xs font-black text-[#FF1493]">
                View label
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
