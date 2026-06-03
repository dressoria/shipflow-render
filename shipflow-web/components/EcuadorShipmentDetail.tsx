"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, PackageCheck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { getEcuadorStatusLabel, getEcuadorStatusTone } from "@/lib/ecuador/copy";
import type { EcuadorShipmentRequest } from "@/lib/ecuador/types";
import { formatDate } from "@/lib/forms";
import { apiGetEcuadorShipmentRequest } from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";

export function EcuadorShipmentDetail({ id }: { id: string }) {
  const [shipment, setShipment] = useState<EcuadorShipmentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetEcuadorShipmentRequest(id)
      .then((result) => setShipment(result.shipment))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No pudimos cargar esta solicitud Ecuador."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>;
  if (!shipment) return null;

  return (
    <div className="grid gap-5">
      <Link href="/ecuador/envios" className="inline-flex items-center gap-2 text-sm font-black text-[#2563EB]">
        <ArrowLeft className="h-4 w-4" /> Volver a solicitudes Ecuador
      </Link>

      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <Badge tone={getEcuadorStatusTone(shipment.status)}>{getEcuadorStatusLabel(shipment.status)}</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {shipment.originCity || "Origen pendiente"} → {shipment.destinationCity || "Destino pendiente"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Envíos Ecuador está en preparación. Esta solicitud no crea un envío real, no dispara llamadas de proveedor y no realiza cobros.
            </p>
          </div>
          <div className="rounded-3xl bg-sky-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-sky-700">Solicitud beta</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Creada {formatDate(shipment.createdAt)}</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Cobro: no disponible todavía</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Proveedor real: pendiente</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <Card title="Ruta">
            <div className="grid gap-3 md:grid-cols-2">
              <LocationCard
                label="Origen"
                name={shipment.originName}
                phone={shipment.originPhone}
                address={shipment.originAddress}
                city={shipment.originCity}
                reference={shipment.originReference}
              />
              <LocationCard
                label="Destino"
                name={shipment.destinationName}
                phone={shipment.destinationPhone}
                address={shipment.destinationAddress}
                city={shipment.destinationCity}
                reference={shipment.destinationReference}
              />
            </div>
          </Card>

          <Card title="Paquete">
            <div className="grid gap-3 md:grid-cols-2">
              <Summary label="Descripción" value={shipment.packageDescription || "Pendiente"} />
              <Summary label="Peso" value={shipment.packageWeight != null ? `${shipment.packageWeight} kg` : "Pendiente"} />
              <Summary
                label="Dimensiones"
                value={
                  shipment.packageLength != null || shipment.packageWidth != null || shipment.packageHeight != null
                    ? `${shipment.packageLength ?? "-"} × ${shipment.packageWidth ?? "-"} × ${shipment.packageHeight ?? "-"} cm`
                    : "Pendiente"
                }
              />
              <Summary label="Valor declarado" value={shipment.declaredValue != null ? formatCurrency(shipment.declaredValue) : "No indicado"} />
            </div>
            {shipment.customerNotes ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notas del cliente</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{shipment.customerNotes}</p>
              </div>
            ) : null}
          </Card>

          <Card title="Timeline visible para cliente">
            <div className="grid gap-3">
              {(shipment.events ?? []).length > 0 ? (
                (shipment.events ?? []).map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <PackageCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-black text-slate-950">{event.title}</p>
                      {event.message ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p> : null}
                      <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(event.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Las actualizaciones visibles para cliente aparecerán aquí.</div>
              )}
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card title="Soporte beta">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
              <HelpCircle className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Si necesitas cambios o información adicional, SendiFlash revisará esta solicitud manualmente antes de cualquier activación operativa.
            </p>
            <Link href="/support" className="mt-4 inline-flex text-sm font-black text-[#2563EB]">
              Abrir soporte
            </Link>
          </Card>
          <Card title="Campos internos">
            <p className="text-sm leading-6 text-slate-600">
              Costos de proveedor, margen, tracking interno, notas internas y referencias operativas permanecen ocultos para el flujo cliente.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function LocationCard({
  label,
  name,
  phone,
  address,
  city,
  reference,
}: {
  label: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  reference?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 font-black text-slate-950">{name || "Pendiente"}</p>
      <p className="mt-1 text-sm text-slate-600">{phone || "Sin teléfono"}</p>
      <p className="mt-2 text-sm text-slate-700">{address || "Sin dirección"}</p>
      <p className="mt-1 text-sm text-slate-700">{city || "Sin ciudad"}</p>
      {reference ? <p className="mt-2 text-sm leading-6 text-slate-500">{reference}</p> : null}
    </div>
  );
}
