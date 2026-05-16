import {
  ArrowRight,
  Bell,
  Calculator,
  CheckCircle2,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  MapPinned,
  PackageCheck,
  Printer,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { couriers, faqs } from "@/data/site";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CourierCard } from "@/components/CourierCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { QuotePreview } from "@/components/QuotePreview";
import { SectionHeading } from "@/components/SectionHeading";

const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Calculator,
    title: "Cotización con varios transportistas",
    text: "Compara USPS, UPS, FedEx y DHL antes de crear cada guía.",
  },
  {
    icon: Printer,
    title: "Guías listas para imprimir",
    text: "Genera guías limpias con remitente, destinatario, transportista, código y paquete.",
  },
  {
    icon: MapPinned,
    title: "Tracking de paquetes",
    text: "Da a tus clientes un lugar para consultar movimiento y estado de entrega.",
  },
  {
    icon: HandCoins,
    title: "Tarifas competitivas",
    text: "Elige el mejor servicio por zona, peso, velocidad y transportista.",
  },
  {
    icon: Wallet,
    title: "Saldo prepago",
    text: "Paga guías con saldo disponible sin procesos manuales por envío.",
  },
  {
    icon: LayoutDashboard,
    title: "Panel operativo",
    text: "Gestiona guías, tracking, saldo y operación desde un solo espacio.",
  },
];

const workflow: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: UserPlus, title: "Crea tu cuenta", text: "Empieza con un espacio simple para tu equipo." },
  { icon: Wallet, title: "Agrega saldo", text: "Mantén visible el gasto de envíos." },
  { icon: PackageCheck, title: "Crea una guía", text: "Ingresa el paquete y compara tarifas disponibles." },
  { icon: Truck, title: "Entrega o recolección", text: "Entrega paquetes en almacén, punto de transportista o recolección." },
  { icon: Bell, title: "Consulta tracking", text: "Sigue estados desde el panel y comparte novedades." },
];

const simpleRates = [
  "Sin compromiso mensual",
  "Sin cambiar entre portales",
  "Paga por guía generada",
  "Las tarifas dependen de zona, peso y servicio",
];

const heroBenefits = [
  "USPS, UPS, FedEx, DHL",
  "Guías de envío",
  "Tracking de paquetes",
  "Hecho para ecommerce en EE. UU.",
];

const benefitBand: Array<{ title: string; text: string }> = [
  {
    title: "Tarifas con varios transportistas",
    text: "Compara opciones antes de crear una guía",
  },
  {
    title: "Listo para ecommerce",
    text: "Pensado para vendedores, almacenes y pequeños negocios",
  },
  {
    title: "Actualizaciones de tracking",
    text: "Centraliza estados para soporte y compradores",
  },
  {
    title: "Recolección o entrega",
    text: "Soporta entrega en almacén o puntos de transportista",
  },
  {
    title: "Red de envíos en EE. UU.",
    text: "Diseñado para operación doméstica de paquetes",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="relative isolate overflow-hidden bg-[#0F172A] text-white">
          <div className="absolute inset-0 -z-30 bg-[linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.72)_42%,rgba(8,145,178,0.42)),url('/images/shipflow-usa-logistics.svg')] bg-cover bg-center" />
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(15,23,42,0.95)_0%,rgba(15,23,42,0.76)_42%,rgba(15,23,42,0.26)_100%)]" />
          <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-4 pb-24 pt-32 sm:px-6 md:min-h-[820px] md:pt-36 lg:px-8">
            <MotionReveal>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="blue" className="border border-white/20 bg-white/12 text-cyan-200 ring-cyan-300/30 backdrop-blur-xl">
                  <PackageCheck className="mr-2 h-3.5 w-3.5" />
                  Envíos con varios transportistas en EE. UU.
                </Badge>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-slate-950/20 backdrop-blur-xl">
                  Guías, tarifas y tracking para ecommerce
                </span>
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Crea guías de envío en <span className="text-[#06B6D4] drop-shadow-[0_0_24px_rgba(6,182,212,0.32)]">EE. UU.</span> desde una sola plataforma
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
                ShipFlow ayuda a vendedores ecommerce a comparar tarifas, crear guías, manejar saldo y consultar paquetes con USPS, UPS, FedEx y DHL.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/registro" className="rounded-2xl sm:min-w-48">
                  Crear cuenta gratis
                </Button>
                <Button href="/crear-guia" variant="secondary" icon={<ArrowRight className="h-4 w-4" />} className="rounded-2xl sm:min-w-44">
                  Cotizar envío
                </Button>
              </div>
              <div className="mt-8 flex max-w-2xl flex-wrap gap-3">
                {heroBenefits.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-950/20 backdrop-blur-xl">
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    {item}
                  </span>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        <section className="-mt-14 bg-[#F8FAFC] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-5">
            {benefitBand.map((item) => (
              <div key={item.title} className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/10">
                <CheckCircle2 className="h-5 w-5 text-[#06B6D4]" />
                <p className="mt-3 text-sm font-black leading-6 text-[#12182B]">{item.title}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="beneficios" className="bg-[#F8F9FC] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Beneficios"
              title="Todo lo que necesitas para enviar"
              description="Un flujo completo para cotizar, crear guías, consultar tracking y atender clientes."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <MotionCard
                    key={feature.title}
                    delay={index * 0.05}
                    className="rounded-3xl border border-cyan-100 bg-white/85 p-6 shadow-sm shadow-slate-950/5 backdrop-blur"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-[#06B6D4]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-black text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        <section id="couriers" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Red de transportistas"
              title="Elige el mejor transportista para cada envío"
              description="Compara USPS, UPS, FedEx y DHL por costo, servicio y tiempo estimado."
            />
            <div className="mt-10 rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-2xl shadow-slate-950/10 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {couriers.map((courier, index) => (
                  <MotionCard key={courier.name} delay={index * 0.05}>
                    <CourierCard {...courier} />
                  </MotionCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Cómo funciona"
              title="De cotización a tracking"
              description="Un flujo práctico para pequeños negocios, marcas D2C y equipos de almacén."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-5">
              {workflow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <MotionCard key={step.title} delay={index * 0.05} className="rounded-3xl border border-cyan-100 bg-white/85 p-5 shadow-sm shadow-slate-950/5 backdrop-blur">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#06B6D4,#22C55E)] font-black text-white">
                      {index + 1}
                    </span>
                    <Icon className="mt-6 h-6 w-6 text-[#06B6D4]" />
                    <h3 className="mt-4 font-black text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pagos" className="bg-[#0F172A] py-16 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <MotionReveal>
              <Badge tone="green" className="bg-[#22C55E] text-slate-950 ring-green-200">
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Gasto de envíos claro
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Paga por guía generada, sin saltar entre portales
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                Las tarifas dependen de origen, destino, peso del paquete y servicio. Agrega saldo y úsalo al enviar pedidos.
              </p>
            </MotionReveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {simpleRates.map((item, index) => (
                <MotionCard key={item} delay={index * 0.05} className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl shadow-cyan-500/5 backdrop-blur">
                  <CheckCircle2 className="h-6 w-6 text-[#22C55E]" />
                  <p className="mt-4 font-black text-white">{item}</p>
                </MotionCard>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
            <MotionReveal>
              <Badge tone="blue">
                <Calculator className="mr-2 h-3.5 w-3.5" />
                Vista de tarifas
              </Badge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Compara precio, velocidad y transportista antes de crear una guía
              </h2>
              <div className="mt-6 grid gap-3 text-sm text-slate-600">
                {[
                  "Estimaciones por zona y peso",
                  "Comparación clara antes de comprar",
                  "Actualizaciones de tracking para tus compradores",
                  "Recolección, almacén o entrega en punto",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-[#06B6D4] shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="font-semibold">{text}</span>
                  </div>
                ))}
              </div>
            </MotionReveal>
            <MotionReveal delay={0.12}>
              <QuotePreview />
            </MotionReveal>
          </div>
        </section>

        <section className="bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_28%),linear-gradient(135deg,#F8F9FC,#ffffff)] py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <MotionReveal>
              <Badge tone="green">Empieza gratis</Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Empieza a crear guías de envío hoy
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
                Crea una cuenta, agrega saldo, compara tarifas y envía tu primer paquete en minutos.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/registro" variant="dark" className="rounded-2xl">
                  Crear cuenta gratis
                </Button>
                <Button href="/crear-guia" icon={<ArrowRight className="h-4 w-4" />} className="rounded-2xl">
                  Cotizar envío
                </Button>
              </div>
            </MotionReveal>
          </div>
        </section>

        <section id="faq" className="bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
            <div className="mt-10 grid gap-4">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
                  <summary className="cursor-pointer font-bold text-slate-950">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
