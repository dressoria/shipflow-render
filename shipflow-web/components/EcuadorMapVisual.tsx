"use client";

import { ArrowRight, MapPinned, Package, Truck } from "lucide-react";
import Image from "next/image";

const cityNodes = [
  { name: "Quito", top: "12%", left: "58%" },
  { name: "Manta", top: "38%", left: "18%" },
  { name: "Guayaquil", top: "58%", left: "34%" },
  { name: "Ambato", top: "42%", left: "52%" },
  { name: "Cuenca", top: "70%", left: "50%" },
  { name: "Loja", top: "86%", left: "42%" },
];

export function EcuadorMapVisual() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-2xl shadow-sky-950/10">
        <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
          <span className="mx-3 flex-1 truncate rounded-full border border-sky-100 bg-white px-3 py-1 text-xs text-slate-400">
            sendiflash.app/ecuador
          </span>
        </div>

        <div className="grid gap-4 bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_58%),linear-gradient(180deg,#f8fdff_0%,#f8fafc_100%)] p-5">
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Multicourier Ecuador</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Cobertura local y nacional</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Solicitudes beta, cotizaciones en preparación y una sola vista para organizar tus envíos.
                </p>
              </div>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                En preparación
              </span>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)]">
              <div className="relative aspect-[16/11]">
                <Image
                  src="/images/ecuador/maps/ecuador-map-coverage.webp"
                  alt="Cobertura multicourier en Ecuador con rutas entre ciudades principales"
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.14)_100%)]" />
                {cityNodes.map((city) => (
                  <div key={city.name} className="absolute" style={{ top: city.top, left: city.left }}>
                    <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-sky-600 shadow-md shadow-sky-600/20" />
                    <span className="ml-4 inline-flex rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                      {city.name}
                    </span>
                  </div>
                ))}

                <div className="absolute right-[5%] top-[8%] rounded-2xl border border-sky-100 bg-white/96 px-3 py-2 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-black text-sky-700">
                    <Truck className="h-3.5 w-3.5" />
                    Operadores en preparación
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Servientrega, LaarCourier, Tramaco, Delivereo</p>
                </div>

                <div className="absolute bottom-[10%] left-[6%] rounded-2xl border border-sky-100 bg-white/96 px-3 py-2 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-black text-sky-700">
                    <Package className="h-3.5 w-3.5" />
                    Cotización beta
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Sin cobro y sin orden real</p>
                </div>

                <div className="absolute bottom-[24%] right-[10%] flex items-center gap-2 rounded-full border border-sky-100 bg-white/96 px-3 py-1 text-[11px] font-black text-slate-700 shadow-md backdrop-blur">
                  <MapPinned className="h-3.5 w-3.5 text-sky-700" />
                  Quito
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  Guayaquil
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Solicitudes beta", value: "Organiza rutas y datos" },
              { label: "Cobertura nacional", value: "Ciudades principales" },
              { label: "Operadores aliados", value: "Integraciones en preparación" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
