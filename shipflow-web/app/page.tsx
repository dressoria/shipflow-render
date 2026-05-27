import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  History,
  MapPinned,
  Package,
  Printer,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { faqs } from "@/data/site";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { QuotePreview } from "@/components/QuotePreview";
import { SectionHeading } from "@/components/SectionHeading";

const trustBadges = [
  "Secure payments",
  "Rate comparison",
  "Label history",
  "Clear pricing",
  "Support-ready workflow",
];

const carrierLogos = [
  { name: "USPS", src: "/carriers/usps.svg" },
  { name: "UPS", src: "/carriers/ups.svg" },
  { name: "FedEx", src: "/carriers/fedex.svg" },
  { name: "DHL", src: "/carriers/dhl.svg" },
];

const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Zap,
    title: "Compare shipping rates",
    text: "See live rates across carriers before committing to a label. Pick the best price and service for each shipment.",
  },
  {
    icon: Printer,
    title: "Create labels faster",
    text: "Generate print-ready labels with full shipment details, barcodes, and carrier info in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Pay securely",
    text: "All payments use industry-standard security. Fees are shown upfront before you confirm.",
  },
  {
    icon: Tag,
    title: "Track label status",
    text: "Follow every shipment from creation to delivery. Share tracking links with your customers.",
  },
  {
    icon: History,
    title: "Keep shipment history",
    text: "All your labels and shipments are saved and searchable. Never lose a tracking number again.",
  },
  {
    icon: Building2,
    title: "Built for small businesses",
    text: "No carrier contracts or complex setup. Create an account and start shipping right away.",
  },
];

const steps: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Package,
    title: "Enter shipment details",
    text: "Add your From and To addresses, package weight, and dimensions.",
  },
  {
    icon: CreditCard,
    title: "Compare rates and pay",
    text: "See available rates across carriers and confirm your label purchase securely.",
  },
  {
    icon: Download,
    title: "Download your label",
    text: "Get a print-ready label instantly and track shipment status from your dashboard.",
  },
];

const pricingItems: Array<{ label: string; description: string; icon: LucideIcon; colorClass: string }> = [
  {
    label: "Shipping rate",
    description: "Carrier rate based on route, weight, and service level",
    icon: Truck,
    colorClass: "bg-blue-50 text-[#2563EB]",
  },
  {
    label: "Service fee",
    description: "Small platform fee included in the displayed rate",
    icon: Zap,
    colorClass: "bg-orange-50 text-[#F97316]",
  },
  {
    label: "Payment fee",
    description: "Standard card processing fee applied at checkout",
    icon: CreditCard,
    colorClass: "bg-slate-100 text-[#64748B]",
  },
];

const useCases: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ShoppingBag,
    title: "Online sellers",
    text: "Create labels for every order without switching carrier portals or memorizing account logins.",
  },
  {
    icon: Building2,
    title: "Small businesses",
    text: "Manage all your shipping from a single workspace. Balance, labels, and tracking in one place.",
  },
  {
    icon: Truck,
    title: "Local fulfillment",
    text: "Coordinate carrier pickups or dropoffs with a clear label and tracking workflow.",
  },
  {
    icon: Users,
    title: "Teams managing shipments",
    text: "Give your team a shared shipping workspace with full history and status visibility.",
  },
];

function CarrierLogoStrip() {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {carrierLogos.map((carrier) => (
          <div
            key={carrier.name}
            className="group grid h-24 place-items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/4 transition hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-lg hover:shadow-orange-950/8"
          >
            <Image
              src={carrier.src}
              alt={`${carrier.name} logo`}
              width={160}
              height={56}
              className="max-h-12 w-full object-contain transition duration-300 group-hover:scale-[1.04]"
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Carrier names and logos are trademarks of their respective owners. Availability may vary by account, route, and provider integration.
      </p>
    </div>
  );
}

function LogisticsHeroVisual() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-white/55 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/12">
        <div className="rounded-[1.5rem] bg-[#F8FAFC] p-5">
          <div className="grid gap-4 sm:grid-cols-[0.86fr_1.14fr]">
            <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-100 text-[#F97316]">
                  <Store className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#2563EB]">
                  Ready
                </span>
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-3 w-28 rounded-full bg-slate-200" />
                <div className="h-3 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2563EB] text-white">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black text-[#0F172A]">Packing station</p>
                  <p className="text-xs text-slate-500">Order ready to ship</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="aspect-square rounded-2xl bg-[#F97316]/16 p-3">
                  <Package className="h-6 w-6 text-[#F97316]" />
                </div>
                <div className="aspect-square rounded-2xl bg-[#2563EB]/12 p-3">
                  <ScanLine className="h-6 w-6 text-[#2563EB]" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Label preview
                  </p>
                  <p className="mt-1 text-lg font-black text-[#0F172A]">NYC to Austin</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#F97316]">
                  Paid
                </span>
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <Boxes className="h-7 w-7 text-[#2563EB]" />
                  <span className="text-xs font-black text-slate-400">4 lb</span>
                </div>
                <div className="mt-4 grid gap-1.5">
                  <div className="h-2.5 w-full rounded-full bg-slate-300" />
                  <div className="h-2.5 w-5/6 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-200" />
                </div>
                <div className="mt-5 flex h-12 items-end gap-1">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <span
                      key={index}
                      className="w-full rounded-t-sm bg-[#0F172A]"
                      style={{ height: `${index % 3 === 0 ? 42 : index % 2 === 0 ? 30 : 22}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black text-[#0F172A]">Courier pickup</p>
                  <p className="text-sm text-slate-500">Window confirmed</p>
                </div>
              </div>
              <div className="mt-5 h-20 rounded-2xl bg-[#0F172A] p-3">
                <div className="flex h-full items-end">
                  <div className="h-10 w-28 rounded-lg bg-white" />
                  <div className="h-8 w-14 rounded-r-lg bg-[#F97316]" />
                  <span className="ml-4 h-5 w-5 rounded-full bg-slate-500" />
                  <span className="ml-16 h-5 w-5 rounded-full bg-slate-500" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-orange-100 bg-[#FFF7ED] p-4 shadow-sm">
              <MapPinned className="h-6 w-6 text-[#F97316]" />
              <p className="mt-4 text-sm font-black text-[#0F172A]">Tracking live</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Label, status, and shipment history stay together.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowVisual() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/7">
      <div className="rounded-[1.5rem] bg-[#F8FAFC] p-5">
        <div className="grid gap-3">
          {[
            { icon: ClipboardCheck, title: "Shipment details", detail: "Addresses, parcel, dimensions", color: "blue" },
            { icon: BarChart3, title: "Rate comparison", detail: "Cost, service, delivery estimate", color: "orange" },
            { icon: Download, title: "Label and tracking", detail: "Download PDF and monitor status", color: "blue" },
          ].map(({ icon: Icon, title, detail, color }, index) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200"
            >
              <span
                className={
                  color === "orange"
                    ? "grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-[#F97316]"
                    : "grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-[#2563EB]"
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#0F172A]">{title}</p>
                <p className="text-sm text-slate-500">{detail}</p>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* ── Hero ── */}
        <section className="relative isolate overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
          <div className="absolute inset-x-0 top-0 h-72 bg-white" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-22 pt-32 sm:px-6 md:pt-36 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <MotionReveal>
                <Badge
                  tone="blue"
                  className="border border-blue-100 bg-blue-50 text-[#2563EB] ring-blue-100"
                >
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Secure · Multi-carrier · Pay per label
                </Badge>

                <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.75rem]">
                  Ship smarter with <span className="text-[#2563EB]">Sendi</span><span className="text-[#F97316]">Flash</span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-[#334155]">
                  A clean shipping workspace for small businesses, online sellers, and teams that need simple label creation.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    href="/registro"
                    variant="action"
                    className="rounded-2xl sm:min-w-44"
                  >
                    Start shipping
                  </Button>
                  <Button
                    href="/login"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl border-blue-100 bg-white text-[#0F172A] hover:border-[#2563EB]/30 hover:bg-blue-50 hover:text-[#2563EB] sm:min-w-32"
                  >
                    Sign in
                  </Button>
                </div>

                <div className="mt-8 flex max-w-xl flex-wrap gap-2.5">
                  {trustBadges.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#F97316]" />
                      {item}
                    </span>
                  ))}
                </div>
              </MotionReveal>

              <MotionReveal delay={0.2} className="hidden lg:block">
                <LogisticsHeroVisual />
              </MotionReveal>
            </div>

            <MotionReveal delay={0.24} className="mt-14 lg:hidden">
              <LogisticsHeroVisual />
            </MotionReveal>
          </div>
        </section>

        {/* ── Trust / Benefits strip ── */}
        <section className="-mt-10 bg-[#F8FAFC] px-4 pb-14 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-3 rounded-[2rem] border border-white/90 bg-white/95 p-4 shadow-2xl shadow-slate-950/8 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title: "Secure payments", text: "PCI-compliant checkout" },
              { title: "Multi-carrier rates", text: "Compare before you buy" },
              { title: "Label history", text: "Full audit trail" },
              { title: "Clear pricing", text: "No hidden charges" },
              { title: "Workflow-ready", text: "Built for operations teams" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-blue-50 bg-white p-5 shadow-sm shadow-slate-950/4 transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-950/6"
              >
                <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
                <p className="mt-3 text-sm font-black leading-5 text-[#0F172A]">{item.title}</p>
                <p className="mt-1.5 text-xs font-medium leading-5 text-[#64748B]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to ship"
              description="A complete flow to compare rates, create labels, track packages, and keep your shipment history organized."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <MotionCard
                    key={feature.title}
                    delay={index * 0.05}
                    className="rounded-3xl border border-blue-100/80 bg-white p-6 shadow-sm shadow-slate-950/4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/6"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-black text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#334155]">{feature.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="From details to delivery in three steps"
              description="No messy carrier portals. Enter your shipment info, compare rates, and create a label."
            />
            <div className="mt-14 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <MotionReveal>
                <WorkflowVisual />
              </MotionReveal>
              <div className="grid gap-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <MotionCard
                      key={step.title}
                      delay={index * 0.08}
                      className="relative rounded-3xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-950/6"
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F97316] text-lg font-black text-white shadow-lg shadow-orange-500/20">
                          {index + 1}
                        </span>
                        <div>
                          <Icon className="h-6 w-6 text-[#2563EB]" />
                          <h3 className="mt-3 text-lg font-black text-slate-950">{step.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-[#334155]">{step.text}</p>
                        </div>
                      </div>
                    </MotionCard>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing transparency ── */}
        <section id="pricing" className="bg-[#0F172A] py-20 text-white sm:py-28">
          <div className="pointer-events-none absolute left-0 right-0 h-px bg-[#2563EB]/25" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
            <MotionReveal>
              <Badge
                tone="blue"
                className="border border-[#2563EB]/40 bg-[#2563EB]/15 text-blue-200 ring-blue-400/25"
              >
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Transparent pricing
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                No hidden fees.{" "}
                <span className="text-[#FB923C]">
                  See everything before you pay.
                </span>
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                Your total is shown before you confirm. Shipping cost, service fee, and payment fee — all visible upfront. No surprises at checkout.
              </p>
              <ul className="mt-6 grid gap-2.5 text-sm text-slate-400">
                {[
                  "No monthly subscription required",
                  "No switching between carrier portals",
                  "Pay per label created",
                  "Rates depend on zone, weight, and service",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#FB923C]" />
                    {item}
                  </li>
                ))}
              </ul>
            </MotionReveal>

            <MotionReveal delay={0.14}>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="border-b border-white/10 px-6 py-4">
                  <p className="font-bold text-white">Fee breakdown</p>
                  <p className="text-xs text-slate-400">Shown before confirming your purchase</p>
                </div>
                <div className="divide-y divide-white/8 px-6 py-1">
                  {pricingItems.map(({ label, description, icon: Icon, colorClass }) => (
                    <div key={label} className="flex items-center gap-4 py-4">
                      <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-white">{label}</p>
                        <p className="text-sm text-slate-400">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-white/12 bg-white/5 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total at checkout</p>
                    <p className="font-black text-white">Shipping + fees, clearly itemized</p>
                  </div>
                  <span className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white">
                    Total
                  </span>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* ── Carrier comparison ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
            <MotionReveal delay={0.1}>
              <QuotePreview />
            </MotionReveal>
            <MotionReveal>
              <Badge tone="blue">
                <Zap className="mr-2 h-3.5 w-3.5" />
                Carrier comparison
              </Badge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Choose the best carrier for each shipment
              </h2>
              <p className="mt-5 text-base leading-7 text-[#334155]">
                Compare USPS, UPS, FedEx, and DHL by cost, service, and estimated delivery time.
              </p>
              <CarrierLogoStrip />
              <div className="mt-7 grid gap-3 text-sm text-[#334155]">
                {[
                  "Live rates by zone and weight",
                  "Clear comparison before purchase",
                  "Tracking updates for your buyers",
                  "Pickup, warehouse handoff, or dropoff",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB] shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="font-semibold">{text}</span>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* ── Use cases ── */}
        <section id="use-cases" className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Use cases"
              title="Built for teams that ship"
              description="Whether you're a solo seller or a growing operations team, SendiFlash adapts to your workflow."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon;
                return (
                  <MotionCard
                    key={useCase.title}
                    delay={index * 0.07}
                    className="flex gap-5 rounded-3xl border border-blue-100/80 bg-white p-7 shadow-sm shadow-slate-950/4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/6"
                  >
                    <div className="flex-shrink-0">
                      <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-500/18">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{useCase.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#334155]">{useCase.text}</p>
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
            <div className="mt-12 grid gap-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm transition open:border-blue-200 open:bg-white open:shadow-md open:shadow-blue-950/4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-950">
                    {faq.question}
                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-blue-50 text-[#2563EB] transition group-open:bg-orange-50 group-open:text-[#F97316]">
                      <ArrowRight className="h-3.5 w-3.5 rotate-90 transition-transform group-open:rotate-[270deg]" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[#334155]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden bg-[#0F172A] py-20 text-white sm:py-28">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F97316]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <MotionReveal>
              <Badge
                tone="blue"
                className="border border-[#2563EB]/40 bg-[#2563EB]/15 text-blue-200 ring-blue-400/25"
              >
                <Zap className="mr-2 h-3.5 w-3.5" />
                Get started today
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Start shipping with SendiFlash
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
                Create an account, compare rates, and ship your first package in minutes. No carrier contracts required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/registro" variant="action" className="min-w-48 rounded-2xl">
                  Create your account
                </Button>
                <Button
                  href="/login"
                  variant="secondary"
                  icon={<ArrowRight className="h-4 w-4" />}
                  className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white"
                >
                  Sign in
                </Button>
              </div>
            </MotionReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
