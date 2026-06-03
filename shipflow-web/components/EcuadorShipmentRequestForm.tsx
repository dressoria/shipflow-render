"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, MapPinned } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ECUADOR_COPY } from "@/lib/ecuador/copy";
import { apiCreateEcuadorShipmentRequest, type CreateEcuadorShipmentRequestBody } from "@/lib/services/apiClient";

type FormState = CreateEcuadorShipmentRequestBody;

const initialState: FormState = {
  originName: "",
  originPhone: "",
  originAddress: "",
  originCity: "",
  originReference: "",
  destinationName: "",
  destinationPhone: "",
  destinationAddress: "",
  destinationCity: "",
  destinationReference: "",
  packageDescription: "",
  packageWeight: 1,
  packageLength: 1,
  packageWidth: 1,
  packageHeight: 1,
  declaredValue: undefined,
  customerNotes: "",
};

export function EcuadorShipmentRequestForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await apiCreateEcuadorShipmentRequest({
        ...form,
        status: "quote_requested",
        provider: "manual",
      });
      router.push(`/ecuador/envios/${result.shipment.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar tu solicitud Ecuador.");
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm shadow-slate-950/5">
        <Badge tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
          <MapPinned className="mr-2 h-3.5 w-3.5" />
          Ecuador Shipping beta request
        </Badge>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Solicitar revisión beta</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <p>Envíos Ecuador está en preparación.</p>
          <p>{ECUADOR_COPY.betaFormNote}</p>
          <p>{ECUADOR_COPY.betaReviewNote}</p>
          <p>{ECUADOR_COPY.noProviderYet}</p>
          <p>Servientrega, LaarCourier, Delivereo y más operadores siguen en preparación.</p>
          <p>No se realizará ningún cobro desde esta pantalla.</p>
        </div>
      </section>

      <Section title="Origen">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" value={form.originName} required onChange={(value) => update("originName", value)} />
          <Field label="Teléfono" value={form.originPhone} required onChange={(value) => update("originPhone", value)} />
          <Field label="Dirección" value={form.originAddress} required onChange={(value) => update("originAddress", value)} />
          <Field label="Ciudad" value={form.originCity} required onChange={(value) => update("originCity", value)} />
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Referencia</span>
          <textarea
            value={form.originReference ?? ""}
            onChange={(event) => update("originReference", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            placeholder="Referencia de retiro, edificio, barrio o instrucciones."
          />
        </label>
      </Section>

      <Section title="Destino">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" value={form.destinationName} required onChange={(value) => update("destinationName", value)} />
          <Field label="Teléfono" value={form.destinationPhone} required onChange={(value) => update("destinationPhone", value)} />
          <Field label="Dirección" value={form.destinationAddress} required onChange={(value) => update("destinationAddress", value)} />
          <Field label="Ciudad" value={form.destinationCity} required onChange={(value) => update("destinationCity", value)} />
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Referencia</span>
          <textarea
            value={form.destinationReference ?? ""}
            onChange={(event) => update("destinationReference", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            placeholder="Piso, sector, puntos de referencia o detalles de entrega."
          />
        </label>
      </Section>

      <Section title="Paquete">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Descripción" value={form.packageDescription} required onChange={(value) => update("packageDescription", value)} />
          <Field label="Peso aproximado (kg)" value={String(form.packageWeight ?? "")} required type="number" onChange={(value) => update("packageWeight", Number(value))} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Largo (cm)" value={String(form.packageLength ?? "")} type="number" onChange={(value) => update("packageLength", value ? Number(value) : undefined)} />
          <Field label="Ancho (cm)" value={String(form.packageWidth ?? "")} type="number" onChange={(value) => update("packageWidth", value ? Number(value) : undefined)} />
          <Field label="Alto (cm)" value={String(form.packageHeight ?? "")} type="number" onChange={(value) => update("packageHeight", value ? Number(value) : undefined)} />
          <Field label="Valor declarado (USD)" value={form.declaredValue == null ? "" : String(form.declaredValue)} type="number" onChange={(value) => update("declaredValue", value ? Number(value) : undefined)} />
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Notas</span>
          <textarea
            value={form.customerNotes ?? ""}
            onChange={(event) => update("customerNotes", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            placeholder="Contenido, horarios, fragilidad o cualquier detalle útil para la revisión beta."
          />
        </label>
      </Section>

      <section className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/60 p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Antes de enviar</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta pantalla guarda una solicitud interna para revisión beta. No se crea orden real, no se llama a Delivereo ni a otros operadores en preparación y no se procesa ningún pago.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Enviando solicitud..." : "Solicitar revisión beta"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
        {error ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      </section>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
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
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
