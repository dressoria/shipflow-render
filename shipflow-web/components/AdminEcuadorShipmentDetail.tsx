"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { getEcuadorStatusLabel, getEcuadorStatusTone } from "@/lib/ecuador/copy";
import { ECUADOR_ADMIN_EDITABLE_STATUSES, ECUADOR_ADMIN_PROVIDERS, type AdminEcuadorShipmentRequest, type EcuadorShipmentVisibility } from "@/lib/ecuador/types";
import { formatDate } from "@/lib/forms";
import { apiGetAdminEcuadorShipment, apiUpdateAdminEcuadorShipment } from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";

type EventDraft = {
  visibility: EcuadorShipmentVisibility;
  title: string;
  message: string;
  status: string;
};

const emptyEvent: EventDraft = {
  visibility: "customer",
  title: "",
  message: "",
  status: "",
};

export function AdminEcuadorShipmentDetail({ id }: { id: string }) {
  const [shipment, setShipment] = useState<AdminEcuadorShipmentRequest | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [eventDraft, setEventDraft] = useState<EventDraft>(emptyEvent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGetAdminEcuadorShipment(id)
      .then((result) => {
        setShipment(result.shipment);
        setForm({
          status: result.shipment.status,
          provider: result.shipment.provider,
          providerStatus: result.shipment.providerStatus ?? "",
          providerOrderId: result.shipment.providerOrderId ?? "",
          providerTrackingId: result.shipment.providerTrackingId ?? "",
          customerPrice: result.shipment.customerPrice?.toString() ?? "",
          providerCost: result.shipment.providerCost?.toString() ?? "",
          margin: result.shipment.margin?.toString() ?? "",
          adminNotes: result.shipment.adminNotes ?? "",
        });
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No pudimos cargar esta solicitud Ecuador admin."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>;
  if (!shipment) return null;

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await apiUpdateAdminEcuadorShipment(id, {
        status: form.status,
        provider: form.provider,
        providerStatus: form.providerStatus,
        providerOrderId: form.providerOrderId,
        providerTrackingId: form.providerTrackingId,
        customerPrice: form.customerPrice === "" ? null : Number(form.customerPrice),
        providerCost: form.providerCost === "" ? null : Number(form.providerCost),
        margin: form.margin === "" ? null : Number(form.margin),
        adminNotes: form.adminNotes,
        statusEventVisibility: "customer",
      });
      if (result.shipment) {
        setShipment(result.shipment);
        setMessage("Solicitud Ecuador actualizada.");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos actualizar esta solicitud Ecuador.");
    } finally {
      setSaving(false);
    }
  }

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await apiUpdateAdminEcuadorShipment(id, {
        newEvent: {
          visibility: eventDraft.visibility,
          title: eventDraft.title,
          message: eventDraft.message,
          status: eventDraft.status || null,
        },
      });
      if (result.shipment) {
        setShipment(result.shipment);
        setEventDraft(emptyEvent);
        setMessage("Evento agregado.");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos agregar el evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Link href="/admin/ecuador-envios" className="inline-flex items-center gap-2 text-sm font-black text-[#FF1493]">
        <ArrowLeft className="h-4 w-4" /> Volver a Ecuador Shipping admin
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Badge tone={getEcuadorStatusTone(shipment.status)}>{getEcuadorStatusLabel(shipment.status)}</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {shipment.originCity || "Origen"} → {shipment.destinationCity || "Destino"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Beta request. This page still does not create real Delivereo orders, does not charge the customer, and does not process payments from admin.
            </p>
            <p className="mt-2 text-sm font-bold text-amber-700">
              Delivereo quote calculation can be tested from the customer beta flow, but no real provider operations are available yet.
            </p>
          </div>
          <div className="rounded-3xl bg-pink-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[#FF1493]">Resumen operativo</p>
            <p className="mt-2 text-sm font-bold text-slate-700">Cliente: {shipment.userId}</p>
            <p className="mt-2 text-sm font-bold text-slate-700">Creado: {formatDate(shipment.createdAt)}</p>
            <p className="mt-2 text-sm font-bold text-slate-700">Actualizado: {formatDate(shipment.updatedAt)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <form onSubmit={saveDetails} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Actualizar solicitud</h3>
            <p className="mt-2 text-sm text-slate-500">Internal review only. Editing this record does not call any provider or payment flow.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SelectField label="Estado" value={form.status ?? ""} onChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                {ECUADOR_ADMIN_EDITABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>{getEcuadorStatusLabel(status)}</option>
                ))}
              </SelectField>
              <SelectField label="Proveedor" value={form.provider ?? ""} onChange={(value) => setForm((current) => ({ ...current, provider: value }))}>
                {ECUADOR_ADMIN_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </SelectField>
              <Field label="Provider status" value={form.providerStatus ?? ""} onChange={(value) => setForm((current) => ({ ...current, providerStatus: value }))} />
              <Field label="Provider order id" value={form.providerOrderId ?? ""} onChange={(value) => setForm((current) => ({ ...current, providerOrderId: value }))} />
              <Field label="Tracking id" value={form.providerTrackingId ?? ""} onChange={(value) => setForm((current) => ({ ...current, providerTrackingId: value }))} />
              <Field label="Precio cliente (USD)" value={form.customerPrice ?? ""} type="number" onChange={(value) => setForm((current) => ({ ...current, customerPrice: value }))} />
              <Field label="Costo proveedor (USD)" value={form.providerCost ?? ""} type="number" onChange={(value) => setForm((current) => ({ ...current, providerCost: value }))} />
              <Field label="Margen (USD)" value={form.margin ?? ""} type="number" onChange={(value) => setForm((current) => ({ ...current, margin: value }))} />
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Notas internas</span>
              <textarea
                value={form.adminNotes ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, adminNotes: event.target.value }))}
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
              />
            </label>
            <button type="submit" disabled={saving} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white disabled:opacity-60">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Detalle completo</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Summary label="Origen" value={`${shipment.originName || "Pendiente"} · ${shipment.originCity || "Sin ciudad"}`} />
              <Summary label="Destino" value={`${shipment.destinationName || "Pendiente"} · ${shipment.destinationCity || "Sin ciudad"}`} />
              <Summary label="Dirección origen" value={shipment.originAddress || "Pendiente"} />
              <Summary label="Dirección destino" value={shipment.destinationAddress || "Pendiente"} />
              <Summary label="Paquete" value={shipment.packageDescription || "Pendiente"} />
              <Summary label="Peso" value={shipment.packageWeight != null ? `${shipment.packageWeight} kg` : "Pendiente"} />
              <Summary label="Valor declarado" value={shipment.declaredValue != null ? formatCurrency(shipment.declaredValue) : "No indicado"} />
              <Summary label="Pago" value={shipment.paymentStatus} />
            </div>
            {shipment.customerNotes ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notas cliente</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{shipment.customerNotes}</p>
              </div>
            ) : null}
          </section>

          <form onSubmit={addEvent} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Agregar evento</h3>
            <p className="mt-2 text-sm text-slate-500">Customer events stay customer-visible. Internal events never appear in the customer flow.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SelectField label="Visibilidad" value={eventDraft.visibility} onChange={(value) => setEventDraft((current) => ({ ...current, visibility: value as EcuadorShipmentVisibility }))}>
                <option value="customer">customer</option>
                <option value="internal">internal</option>
              </SelectField>
              <SelectField label="Estado opcional" value={eventDraft.status} onChange={(value) => setEventDraft((current) => ({ ...current, status: value }))}>
                <option value="">Sin estado</option>
                {ECUADOR_ADMIN_EDITABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>{getEcuadorStatusLabel(status)}</option>
                ))}
              </SelectField>
              <Field label="Título" value={eventDraft.title} required onChange={(value) => setEventDraft((current) => ({ ...current, title: value }))} />
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Mensaje</span>
              <textarea
                value={eventDraft.message}
                onChange={(event) => setEventDraft((current) => ({ ...current, message: event.target.value }))}
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
              />
            </label>
            <button type="submit" disabled={saving} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 px-5 text-sm font-bold text-[#FF1493] disabled:opacity-60">
              Agregar evento
            </button>
          </form>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Timeline completo</h3>
            <div className="mt-4 grid gap-3">
              {(shipment.events ?? []).length > 0 ? (
                (shipment.events ?? []).map((event) => (
                  <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={event.visibility === "internal" ? "slate" : "blue"}>{event.visibility}</Badge>
                      {event.status ? <Badge tone={getEcuadorStatusTone(event.status)}>{getEcuadorStatusLabel(event.status)}</Badge> : null}
                    </div>
                    <p className="mt-3 font-black text-slate-950">{event.title}</p>
                    {event.message ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p> : null}
                    <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(event.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No hay eventos todavía.</div>
              )}
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Valores internos</h3>
            <div className="mt-4 grid gap-3">
              <Summary label="Precio cliente" value={shipment.customerPrice != null ? formatCurrency(shipment.customerPrice) : "Pendiente"} />
              <Summary label="Costo proveedor" value={shipment.providerCost != null ? formatCurrency(shipment.providerCost) : "Pendiente"} />
              <Summary label="Margen" value={shipment.margin != null ? formatCurrency(shipment.margin) : "Pendiente"} />
            </div>
          </section>
          {message ? <div className="rounded-3xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">{message}</div> : null}
          {error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100"
      >
        {children}
      </select>
    </label>
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
