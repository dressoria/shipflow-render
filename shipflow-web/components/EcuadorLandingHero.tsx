"use client";

import { ArrowRight, Building2, CheckCircle2, MapPinned, Package, ShoppingBag, Store, Truck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EcuadorOperatorsLogos } from "@/components/EcuadorOperatorsLogos";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { useRegionMode } from "@/contexts/RegionModeContext";

export function EcuadorLandingHero({ compact = false }: { compact?: boolean }) {
  const { setMode } = useRegionMode();

  useEffect(() => {
    setMode("ec");
  }, [setMode]);

  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#eef8ff_0%,#f8fbff_35%,#ffffff_100%)] text-[#0F172A]">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,#dbeafe,transparent_70%)]" />
      <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${compact ? "pb-16 pt-32" : "pb-22 pt-32 md:pt-36"}`}>
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
          <MotionReveal>
            <div className="flex flex-wrap gap-2">
              {["Modo Ecuador", "En preparación", "Sin cobro", "Sin orden real"].map((item) => (
                <Badge key={item} tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
                  {item}
                </Badge>
              ))}
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.9rem]">
              Envía en Ecuador con múltiples operadores desde una sola plataforma
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#334155]">
              Estamos preparando una experiencia para cotizar, organizar y gestionar entregas locales y nacionales con operadores como Servientrega, LaarCourier, Tramaco, Delivereo y más.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/support" variant="action" className="rounded-2xl sm:min-w-52">
                Solicitar acceso temprano
              </Button>
              <Button
                href="/ecuador/crear-envio"
                variant="secondary"
                icon={<ArrowRight className="h-4 w-4" />}
                className="rounded-2xl border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50 sm:min-w-52"
              >
                Cotizar envío beta
              </Button>
              <Link
                href="#operadores"
                className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black text-slate-600 transition hover:bg-white/70 hover:text-sky-700"
              >
                Ver operadores en preparación
              </Link>
            </div>

            <div className="mt-8 flex max-w-3xl flex-wrap gap-2.5">
              {[
                "Cobertura local y nacional",
                "Pensado para ecommerce y WhatsApp",
                "Solicitudes beta desde una sola cuenta",
                "También puedes usar Shipping Labels USA",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-700" />
                  {item}
                </span>
              ))}
            </div>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <div className="relative mx-auto max-w-2xl">
              <div className="absolute -left-10 top-14 hidden h-32 w-32 rounded-full bg-sky-200/40 blur-3xl lg:block" />
              <div className="absolute -right-8 bottom-10 hidden h-36 w-36 rounded-full bg-blue-200/40 blur-3xl lg:block" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-sky-100 bg-white p-3 shadow-[0_28px_90px_rgba(2,32,71,0.14)]">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.8rem] bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)]">
                  <Image
                    src="/images/ecuador/hero/ecuador-hero-main.webp"
                    alt="Visual multicourier de Ecuador con cobertura entre ciudades y estados beta"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 640px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(15,23,42,0.08)_100%)]" />

                  <div className="absolute left-4 top-4 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">Multicourier Ecuador</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">Cotización beta, cobertura nacional y operadores en preparación</p>
                  </div>

                  <div className="absolute bottom-4 right-4 rounded-2xl border border-sky-100 bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
                    <div className="flex items-center gap-2 text-xs font-black text-sky-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sin cobro y sin orden real
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Explora el flujo Ecuador mientras terminamos activación por operador.</p>
                  </div>
                </div>
              </div>
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}

export function EcuadorValueSection() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <MotionReveal>
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Todo tu envío en un solo lugar</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Organiza tus entregas desde una sola vista comercial para Ecuador
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                SendiFlash Ecuador se está construyendo para tiendas online, ventas por WhatsApp y pymes que quieren cotizar, preparar y centralizar envíos sin depender de múltiples portales.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                { icon: Truck, title: "Cotiza con operadores", text: "Recibe estimados beta para rutas locales y nacionales sin abrir portales separados." },
                { icon: Package, title: "Organiza solicitudes", text: "Guarda datos de origen, destino y paquete en una solicitud clara para revisión interna." },
                { icon: MapPinned, title: "Da seguimiento", text: "Prepara una futura vista de seguimiento y estados visibles para el cliente." },
                { icon: Building2, title: "Prepara cobertura nacional", text: "Construye tu operación con foco en Quito, Guayaquil, Cuenca, Manta, Loja y Ambato." },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <MotionCard
                    key={item.title}
                    delay={index * 0.06}
                    className="rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#f8fdff_0%,#ffffff_100%)] p-6 shadow-sm shadow-sky-950/5"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </MotionReveal>

          <MotionReveal delay={0.12}>
            <div className="relative overflow-hidden rounded-[2.25rem] border border-sky-100 bg-white p-3 shadow-[0_20px_70px_rgba(2,32,71,0.1)]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.8rem]">
                <Image
                  src="/images/ecuador/hero/ecuador-logistics-workspace.webp"
                  alt="Espacio de trabajo logístico para negocios ecuatorianos con pedidos, etiquetas y control desde un solo lugar"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(15,23,42,0.1)_100%)]" />
              </div>
              <div className="absolute inset-x-7 bottom-7 rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-lg backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Ventas por WhatsApp, tiendas online y pymes</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Una experiencia pensada para coordinar pedidos, preparar paquetes y visualizar cobertura Ecuador en modo beta.
                </p>
              </div>
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}

export function EcuadorOperatorsSection() {
  return <EcuadorOperatorsLogos />;
}

export function EcuadorAudienceSection() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Pensado para negocios ecuatorianos</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Hecho para vender, coordinar y despachar sin perder tiempo
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { icon: Store, title: "Tiendas online" },
            { icon: ShoppingBag, title: "Ventas por WhatsApp" },
            { icon: Package, title: "Emprendedores" },
            { icon: Building2, title: "Pymes" },
            { icon: Users, title: "Envíos locales y nacionales" },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <MotionCard
                key={item.title}
                delay={index * 0.05}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/4"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-sm font-black text-slate-950">{item.title}</h3>
              </MotionCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EcuadorBetaStatusSection() {
  return (
    <section className="bg-[#07111F] py-20 text-white sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-sky-400/20 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Estado beta</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Ecuador sigue en preparación, pero ya puedes conocer el flujo
          </h2>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-300">
            <p>Puedes solicitar acceso temprano y probar cotización beta si está habilitada para tu cuenta.</p>
            <p>No se generan cobros y no se crean órdenes reales todavía.</p>
            <p>La meta es centralizar envíos con múltiples operadores desde una sola plataforma SendiFlash.</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/support" variant="action" className="rounded-2xl sm:min-w-52">
              Solicitar acceso temprano
            </Button>
            <Button
              href="/ecuador/crear-envio"
              variant="secondary"
              icon={<ArrowRight className="h-4 w-4" />}
              className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:min-w-52"
            >
              Ir a solicitud beta
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
