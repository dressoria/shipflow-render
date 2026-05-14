"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { createCourier, deleteCourier, getCouriers, updateCourier } from "@/lib/services/courierService";
import type { CourierConfig } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const emptyCourier: CourierConfig = {
  id: "",
  nombre: "",
  activo: true,
  logoUrl: "",
  cobertura: "",
  precioBase: 0,
  precioPorKg: 0,
  permiteContraEntrega: true,
  comisionContraEntrega: 0,
  tiempoEstimado: "",
  notas: "",
};

export function AdminCouriersManager() {
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);
  const [editing, setEditing] = useState<CourierConfig | null>(null);
  const [form, setForm] = useState<CourierConfig>(emptyCourier);

  async function refresh() {
    setCouriers(await getCouriers());
  }

  useEffect(() => {
    window.setTimeout(() => {
      refresh();
    }, 0);
  }, []);

  function startEdit(courier: CourierConfig) {
    setEditing(courier);
    setForm(courier);
  }

  function update<K extends keyof CourierConfig>(key: K, value: CourierConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...form,
      id: form.id || form.nombre.toLowerCase().replaceAll(" ", "-"),
    };
    if (editing) {
      await updateCourier(editing.id, payload);
    } else {
      await createCourier(payload);
    }
    setEditing(null);
    setForm(emptyCourier);
    await refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-4">
        {couriers.map((courier) => (
          <div key={courier.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-sm font-black text-white">
                    {courier.nombre.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-black text-slate-950">{courier.nombre}</h2>
                    <p className="text-sm text-slate-500">{courier.cobertura} · {courier.tiempoEstimado}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={courier.activo ? "green" : "slate"}>{courier.activo ? "Activo" : "Inactivo"}</Badge>
                  <Badge tone={courier.permiteContraEntrega ? "blue" : "slate"}>{courier.permiteContraEntrega ? "Contra entrega" : "Sin contra entrega"}</Badge>
                  <Badge tone="slate">Base {formatCurrency(courier.precioBase)}</Badge>
                  <Badge tone="slate">Kg {formatCurrency(courier.precioPorKg)}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-500">{courier.notas}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateCourier(courier.id, { activo: !courier.activo }).then(refresh)} className="h-10 rounded-2xl border border-slate-200 px-3 text-sm font-bold text-slate-700">
                  {courier.activo ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => startEdit(courier)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-[#FF1493]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deleteCourier(courier.id).then(refresh)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <h2 className="font-black text-slate-950">{editing ? "Editar courier" : "Crear courier"}</h2>
        <div className="mt-5 grid gap-3">
          <Field label="Nombre" value={form.nombre} onChange={(value) => update("nombre", value)} />
          <Field label="Logo URL" value={form.logoUrl} onChange={(value) => update("logoUrl", value)} />
          <Field label="Cobertura" value={form.cobertura} onChange={(value) => update("cobertura", value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Precio base" type="number" value={String(form.precioBase)} onChange={(value) => update("precioBase", Number(value))} />
            <Field label="Precio por kg" type="number" value={String(form.precioPorKg)} onChange={(value) => update("precioPorKg", Number(value))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Comisión contra entrega" type="number" value={String(form.comisionContraEntrega)} onChange={(value) => update("comisionContraEntrega", Number(value))} />
            <Field label="Tiempo estimado" value={form.tiempoEstimado} onChange={(value) => update("tiempoEstimado", value)} />
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.activo} onChange={(event) => update("activo", event.target.checked)} />
            Activo
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.permiteContraEntrega} onChange={(event) => update("permiteContraEntrega", event.target.checked)} />
            Permite contra entrega
          </label>
          <textarea value={form.notas} onChange={(event) => update("notas", event.target.value)} placeholder="Notas" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-pink-400" />
          <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20">
            <PlusCircle className="mr-2 h-4 w-4" />
            {editing ? "Guardar cambios" : "Crear courier"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input value={value} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} required className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10" />
    </label>
  );
}
