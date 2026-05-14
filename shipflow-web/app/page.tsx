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
    title: "Multi-carrier rate shopping",
    text: "Compare USPS, UPS, FedEx, and DHL before buying each label.",
  },
  {
    icon: Printer,
    title: "Printable shipping labels",
    text: "Generate clean labels with sender, recipient, carrier, barcode, and package details.",
  },
  {
    icon: MapPinned,
    title: "Package tracking",
    text: "Give customers one place to follow package movement and delivery status.",
  },
  {
    icon: HandCoins,
    title: "Competitive rates",
    text: "Choose the best service by zone, package weight, speed, and carrier.",
  },
  {
    icon: Wallet,
    title: "Prepaid shipping balance",
    text: "Pay labels from available balance without manual workflows on every shipment.",
  },
  {
    icon: LayoutDashboard,
    title: "Operations dashboard",
    text: "Manage labels, tracking, balance, and admin controls from one workspace.",
  },
];

const workflow: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: UserPlus, title: "Create your account", text: "Start with a simple seller workspace for your team." },
  { icon: Wallet, title: "Add balance", text: "Fund labels and keep shipping spend visible." },
  { icon: PackageCheck, title: "Create a label", text: "Enter package details and compare available carrier rates." },
  { icon: Truck, title: "Pickup or drop-off", text: "Hand off packages through pickup, warehouse, or carrier locations." },
  { icon: Bell, title: "Track delivery", text: "Follow status from your dashboard and share updates with buyers." },
];

const simpleRates = [
  "No monthly commitment",
  "No carrier portal switching",
  "Pay per generated label",
  "Rates depend on zones, weight, and carrier service",
];

const heroBenefits = [
  "USPS, UPS, FedEx, DHL",
  "Shipping labels",
  "Package tracking",
  "Built for U.S. ecommerce",
];

const benefitBand: Array<{ title: string; text: string }> = [
  {
    title: "Multi-carrier rates",
    text: "Compare carrier options before creating a label",
  },
  {
    title: "Ecommerce ready",
    text: "Built for sellers, warehouses, and small businesses",
  },
  {
    title: "Tracking updates",
    text: "Centralize status for support teams and buyers",
  },
  {
    title: "Pickup or drop-off",
    text: "Support warehouse handoff and carrier counter workflows",
  },
  {
    title: "U.S. shipping network",
    text: "Designed around domestic package operations",
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
                  U.S. multi-carrier shipping
                </Badge>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-slate-950/20 backdrop-blur-xl">
                  Ecommerce labels, rates, and tracking
                </span>
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Create shipping labels across the <span className="text-[#06B6D4] drop-shadow-[0_0_24px_rgba(6,182,212,0.32)]">U.S.</span> from one platform
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
                ShipFlow helps ecommerce sellers compare rates, create labels, manage balance, and track packages with USPS, UPS, FedEx, and DHL.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/registro" className="rounded-2xl sm:min-w-48">
                  Create free account
                </Button>
                <Button href="/crear-guia" variant="secondary" icon={<ArrowRight className="h-4 w-4" />} className="rounded-2xl sm:min-w-44">
                  Quote a shipment
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
              eyebrow="Features"
              title="Everything sellers need to ship"
              description="A complete shipping workflow for quoting, label creation, tracking, and customer support."
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
              eyebrow="Carrier network"
              title="Choose the best carrier for each shipment"
              description="Compare USPS, UPS, FedEx, and DHL by cost, service level, and estimated transit time."
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
              eyebrow="How it works"
              title="From rate quote to package tracking"
              description="A practical workflow for small businesses, D2C brands, and warehouse teams."
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
                Simple shipping spend
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Pay per generated label, not per carrier portal
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                Rates depend on origin, destination, package weight, and carrier service. Add balance and use it when shipping orders.
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
                Rate preview
              </Badge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Compare price, speed, and carrier before creating a label
              </h2>
              <div className="mt-6 grid gap-3 text-sm text-slate-600">
                {[
                  "Zone and weight based shipping estimates",
                  "Clear carrier comparison before purchase",
                  "Tracking updates for your buyers",
                  "Pickup, warehouse, or drop-off workflows",
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
              <Badge tone="green">Start free</Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Start creating shipping labels today
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
                Create an account, add balance, compare rates, and ship your first package in minutes.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/registro" variant="dark" className="rounded-2xl">
                  Create free account
                </Button>
                <Button href="/crear-guia" icon={<ArrowRight className="h-4 w-4" />} className="rounded-2xl">
                  Quote a shipment
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
