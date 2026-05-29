import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  History,
  MapPinned,
  Printer,
  ScanLine,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { QuotePreview } from "@/components/QuotePreview";
import { SectionHeading } from "@/components/SectionHeading";
import { NationwideRoute } from "@/components/landing/NationwideRoute";

const benefits: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ScanLine,
    title: "Compare carrier rates",
    text: "See USPS, UPS, FedEx, and DHL prices side by side before committing to a carrier.",
  },
  {
    icon: CreditCard,
    title: "Pay with wallet or card",
    text: "Top up your balance for fast label checkout, or pay by card anytime. No carrier accounts needed.",
  },
  {
    icon: Printer,
    title: "Generate print-ready labels",
    text: "Download PDF labels with full shipment details, barcodes, and carrier information instantly.",
  },
  {
    icon: Tag,
    title: "Track every shipment",
    text: "Follow package status from label creation to delivery. Share tracking links with your customers.",
  },
  {
    icon: History,
    title: "Keep your label history",
    text: "All labels and shipments are saved to your account. Search by order, carrier, or date.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    text: "PCI-compliant payments. All fees — shipping rate, service fee, and payment fee — shown before you confirm.",
  },
];

const steps = [
  {
    number: "1",
    title: "Enter route and package details",
    text: "Enter origin, destination, package weight, and dimensions. No carrier account or contract required.",
  },
  {
    number: "2",
    title: "Compare carrier rates",
    text: "See available rates from USPS, UPS, FedEx, and DHL. Choose by price, speed, or carrier preference.",
  },
  {
    number: "3",
    title: "Pay with wallet or card",
    text: "Checkout shows the full cost breakdown — shipping rate, service fee, and payment fee — before you confirm.",
  },
  {
    number: "4",
    title: "Download label and track",
    text: "Your label is ready instantly. Download, print, and track your shipment from your account dashboard.",
  },
];

export default function ShippingLabelsPage() {
  return (
    <>
      <Header />
      <main>
        {/* ── Hero ── */}
        <section className="relative isolate overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
          <div className="absolute inset-x-0 top-0 h-72 bg-white" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 md:pt-36 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <MotionReveal>
                <Badge
                  tone="blue"
                  className="border border-blue-100 bg-blue-50 text-[#2563EB] ring-blue-100"
                >
                  <Truck className="mr-2 h-3.5 w-3.5" />
                  SendiFlash Shipping
                </Badge>
                <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.75rem]">
                  Compare rates, create labels,{" "}
                  <span className="text-[#2563EB]">ship from</span>{" "}
                  <span className="text-[#F97316]">one workspace.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-[#334155]">
                  USPS, UPS, FedEx, and DHL rates side by side. Pay with wallet or card. Download your label in seconds. Domestic shipping in selected markets.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href="/crear-guia" variant="action" className="rounded-2xl sm:min-w-44">
                    Create a label
                  </Button>
                  <Button
                    href="/registro"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl sm:min-w-44"
                  >
                    Create free account
                  </Button>
                </div>
              </MotionReveal>

              <MotionReveal delay={0.2} className="hidden lg:block">
                <QuotePreview />
              </MotionReveal>
            </div>

            <MotionReveal delay={0.24} className="mt-14 lg:hidden">
              <QuotePreview />
            </MotionReveal>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to ship"
              description="A complete workflow to compare rates, create labels, track packages, and manage your shipment history."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <MotionCard
                    key={benefit.title}
                    delay={index * 0.05}
                    className="rounded-3xl border border-blue-100/80 bg-white p-6 shadow-sm shadow-slate-950/4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/6"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-black text-slate-950">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#334155]">{benefit.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="From address to label in minutes"
              description="No carrier setup. No contracts. Create an account and ship your first package right away."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <MotionCard
                  key={step.number}
                  delay={index * 0.07}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/4"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F172A] text-xl font-black text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-5 font-black text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#334155]">{step.text}</p>
                </MotionCard>
              ))}
            </div>
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
                Compare USPS, UPS, FedEx, and DHL by cost, service level, and estimated delivery time.
              </p>
              <div className="mt-7 grid gap-3 text-sm text-[#334155]">
                {[
                  "Rates by zone and package weight",
                  "Clear comparison before you pay",
                  "Tracking updates after label creation",
                  "Wallet or card payment at checkout",
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

        {/* ── Tracking visual ── */}
        <section className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <MotionReveal>
                <Badge tone="blue">
                  <MapPinned className="mr-2 h-3.5 w-3.5" />
                  Live tracking
                </Badge>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                  Follow every shipment from label to delivery.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#334155]">
                  Tracking status updates automatically after your carrier scans the package. All shipments are saved to your account history.
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

        {/* ── Honest scope ── */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-blue-100 bg-[#F8FAFC] p-8 text-center shadow-sm">
              <MapPinned className="mx-auto h-8 w-8 text-[#2563EB]" />
              <h3 className="mt-4 text-xl font-black text-slate-950">Domestic shipping in selected markets</h3>
              <p className="mt-3 text-sm leading-6 text-[#334155]">
                SendiFlash Shipping currently supports domestic U.S. shipments. International shipping and customs workflows are not available. Carrier availability may vary by route, account, and provider integration.
              </p>
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
                <Printer className="mr-2 h-3.5 w-3.5" />
                Start shipping today
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Your first label is one account away
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
                Create a free SendiFlash account, compare rates, and ship your first package. No carrier contracts or monthly fees required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/registro" variant="action" className="min-w-48 rounded-2xl">
                  Create free account
                </Button>
                <Button
                  href="/crear-guia"
                  variant="secondary"
                  icon={<ArrowRight className="h-4 w-4" />}
                  className="min-w-48 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white"
                >
                  Create a label
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
