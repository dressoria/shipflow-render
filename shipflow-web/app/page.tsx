import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  History,
  MapPinned,
  Printer,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
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
import { NationwideRoute } from "@/components/landing/NationwideRoute";
import { ScrollStory } from "@/components/landing/ScrollStory";

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
  { name: "FedEx", src: "/carriers/fedex.png" },
  { name: "DHL", src: "/carriers/dhl.svg" },
];

const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ScanLine,
    title: "Compare shipping rates",
    text: "Review carrier options side by side, then choose the service that fits the shipment.",
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
    icon: Tag,
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
              unoptimized={carrier.src.endsWith(".png")}
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

function ImageSceneCard({
  src,
  title,
  text,
  badge,
  priority = false,
}: {
  src: string;
  title: string;
  text: string;
  badge: string;
  priority?: boolean;
}) {
  return (
    <div className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:border-[#F97316]/35 hover:bg-orange-50/20 hover:shadow-2xl hover:shadow-slate-950/10">
      <div className="relative aspect-[1.48] overflow-hidden bg-[#F8FAFC]">
        <Image
          src={src}
          alt={title}
          fill
          priority={priority}
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute left-4 top-4 rounded-full border border-orange-100 bg-white/90 px-4 py-2 text-xs font-black text-[#F97316] shadow-sm backdrop-blur transition group-hover:border-[#F97316]/35 group-hover:bg-[#F97316] group-hover:text-white">
          {badge}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-black text-[#0F172A] transition group-hover:text-[#2563EB]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#334155]">{text}</p>
      </div>
    </div>
  );
}

function TrustMetricsSection() {
  return (
    <section className="bg-[#0F172A] py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <MotionReveal>
            <Badge
              tone="blue"
              className="border border-[#2563EB]/40 bg-[#2563EB]/15 text-blue-200 ring-blue-400/25"
            >
              <ShieldCheck className="mr-2 h-3.5 w-3.5" />
              One workflow
            </Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Multiple carriers, one calmer shipping desk.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              SendiFlash brings label creation, payment, tracking, and shipment history into a single operational view for domestic sellers.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.12}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "4", label: "carrier logos visible" },
                { value: "1", label: "shipping workflow" },
                { value: "24/7", label: "status visibility" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/7 p-6 shadow-xl shadow-slate-950/15 backdrop-blur transition hover:-translate-y-1 hover:border-orange-300/40"
                >
                  <p className="text-4xl font-black text-[#FB923C]">{metric.value}</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">{metric.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/7 p-5 backdrop-blur">
              <CarrierLogoStrip />
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}

function LogisticsHeroVisual() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/12 transition hover:-translate-y-1 hover:border-[#F97316]/30 hover:shadow-orange-950/10">
        <div className="relative aspect-[1.08] overflow-hidden bg-[#F8FAFC]">
          <Image
            src="/landing/fulfillment-station.svg"
            alt="Seller packing boxes at a SendiFlash shipping station"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-white/0" />
        </div>
        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-slate-200 bg-white/94 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F97316] text-white">
              <ScanLine className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black text-[#0F172A]">Label ready in one workflow</p>
              <p className="text-sm text-slate-500">Compare, pay, download, and track.</p>
            </div>
          </div>
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

        {/* ── Real logistics scenes ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <MotionReveal>
                <Badge tone="blue">
                  <Truck className="mr-2 h-3.5 w-3.5" />
                  Built around real shipping days
                </Badge>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                  From packing table to pickup, every step feels visible.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#334155]">
                  SendiFlash is designed for online sellers and small teams that need a reliable way to move packages without switching between carrier portals.
                </p>
              </MotionReveal>
              <div className="grid gap-5 md:grid-cols-2">
                <MotionReveal delay={0.08}>
                  <ImageSceneCard
                    src="/landing/fulfillment-station.svg"
                    title="Prepare labels where orders happen"
                    text="A shipping desk for addresses, parcels, rates, payment, and label downloads."
                    badge="Fulfillment"
                    priority
                  />
                </MotionReveal>
                <MotionReveal delay={0.16}>
                  <ImageSceneCard
                    src="/landing/courier-pickup.svg"
                    title="Keep pickup and delivery status in view"
                    text="Track the operational handoff from packed order to shipment history."
                    badge="Pickup"
                  />
                </MotionReveal>
              </div>
            </div>
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

        {/* ── Nationwide shipping ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <MotionReveal>
                <Badge tone="blue">
                  <MapPinned className="mr-2 h-3.5 w-3.5" />
                  Nationwide shipping
                </Badge>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                  Ship anywhere in the U.S. with a route that feels alive.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#334155]">
                  Follow a clean coast-to-coast route as each city highlights during transit. It is lightweight, calm, and built for fast scanning.
                </p>
                <div className="mt-8 grid gap-3">
                  {["Label created", "Carrier selected", "Package in transit", "Delivery status visible"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#334155]">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-[#F97316]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </MotionReveal>

              <MotionReveal delay={0.12}>
                <NationwideRoute />
              </MotionReveal>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="bg-[#07111F] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollStory />
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
                <ScanLine className="mr-2 h-3.5 w-3.5" />
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

        <TrustMetricsSection />

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
                <Tag className="mr-2 h-3.5 w-3.5" />
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
