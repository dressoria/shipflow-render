import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, MapPinned, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { RegionModeSwitcher } from "@/components/RegionModeSwitcher";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Ecuador Shipping | SendiFlash",
  description: "Upcoming Ecuador shipping experience from SendiFlash for local and national deliveries.",
};

const comingSoonItems = [
  "Cotizacion de envios Ecuador",
  "Creacion de ordenes",
  "Tracking de envios",
  "Pagos locales",
  "Soporte para negocios y ecommerce",
];

const highlights = [
  {
    icon: MapPinned,
    title: "Enfocado en Ecuador",
    text: "Estamos preparando una experiencia pensada para negocios que necesitan coordinar envios locales y nacionales desde una sola cuenta.",
  },
  {
    icon: Truck,
    title: "Operaciones en preparacion",
    text: "La estructura operativa y las integraciones necesarias siguen en curso, por lo que esta experiencia aun no esta habilitada publicamente.",
  },
  {
    icon: Wallet,
    title: "Flujo comercial futuro",
    text: "La meta es simplificar cotizacion, gestion y pagos en un solo lugar, sin abrir el servicio antes de tiempo.",
  },
];

export default function EcuadorPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative isolate overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
          <div className="absolute inset-x-0 top-0 h-72 bg-white" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 md:pt-36 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <MotionReveal>
                <Badge
                  tone="blue"
                  className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100"
                >
                  <MapPinned className="mr-2 h-3.5 w-3.5" />
                  Ecuador Shipping · En preparacion
                </Badge>
                <div className="mt-5 max-w-md">
                  <RegionModeSwitcher />
                </div>
                <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.7rem]">
                  Envios locales y nacionales en Ecuador,{" "}
                  <span className="text-sky-700">proximamente en SendiFlash.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#334155]">
                  Estamos preparando una experiencia para cotizar, pagar y gestionar envios locales y nacionales en Ecuador desde una sola cuenta SendiFlash.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href="/ecuador/crear-envio" variant="action" className="rounded-2xl sm:min-w-44">
                    Solicitar acceso beta
                  </Button>
                  <Button
                    href="/shipping-labels"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl sm:min-w-44"
                  >
                    Usar Shipping Labels
                  </Button>
                </div>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500">
                  Estado actual: en desarrollo y acceso temprano. Puedes enviar una solicitud beta, pero no se crea un envío real todavía.
                </p>
              </MotionReveal>

              <MotionReveal delay={0.16}>
                <div className="overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white shadow-2xl shadow-slate-950/10">
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                    <span className="mx-3 flex-1 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
                      sendiflash.app/ecuador
                    </span>
                  </div>
                  <div className="bg-sky-50/45 p-5">
                    <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Proximo servicio</p>
                          <h2 className="mt-2 text-2xl font-black text-slate-950">SendiFlash Ecuador</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Envio local y nacional con seguimiento y gestion desde una sola cuenta.
                          </p>
                        </div>
                        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                          Coming soon
                        </span>
                      </div>
                      <div className="mt-5 grid gap-2 text-sm text-slate-700">
                        {comingSoonItems.slice(0, 4).map((item) => (
                          <div key={item} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3 py-2">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-sky-700" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-4 py-3">
                    {["En desarrollo", "Acceso temprano", "Cobertura por anunciar", "Sin flujo de compra todavia"].map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Lo que viene"
              title="Una base para coordinar envios Ecuador desde una sola cuenta"
              description="Queremos abrir una experiencia simple para negocios y ecommerce, manteniendo una comunicacion prudente mientras el servicio termina de prepararse."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {comingSoonItems.map((item, index) => (
                <MotionCard
                  key={item}
                  delay={index * 0.05}
                  className="rounded-3xl border border-sky-100 bg-sky-50/40 p-5 shadow-sm shadow-slate-950/4"
                >
                  <CheckCircle2 className="h-5 w-5 text-sky-700" />
                  <p className="mt-4 text-sm font-black leading-6 text-slate-950">{item}</p>
                </MotionCard>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-3">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <MotionCard
                    key={item.title}
                    delay={index * 0.06}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h2 className="mt-5 text-xl font-black text-slate-950">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-8 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Estado</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                En desarrollo y acceso temprano
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Ecuador Shipping todavia no esta habilitado como flujo activo dentro de SendiFlash. La cobertura, tiempos y disponibilidad final se comunicaran cuando el servicio este listo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/support"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                >
                  Solicitar acceso beta
                </Link>
                <Link
                  href="/shipping-labels"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  Ver Shipping Labels USA
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
