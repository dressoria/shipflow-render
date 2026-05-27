import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  History,
  Package,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Zap,
} from "lucide-react";
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

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* ── Hero ── */}
        <section className="relative isolate overflow-hidden bg-[#0F172A] text-white">
          <div className="pointer-events-none absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full bg-[#2563EB]/18 blur-[140px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-40 h-[560px] w-[560px] rounded-full bg-[#F97316]/14 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 md:pt-36 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <MotionReveal>
                <Badge
                  tone="blue"
                  className="border border-[#2563EB]/30 bg-[#2563EB]/14 text-blue-200 ring-blue-500/25 backdrop-blur-xl"
                >
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Secure · Multi-carrier · Pay per label
                </Badge>

                <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[3.75rem]">
                  Ship smarter with{" "}
                  <span className="bg-gradient-to-r from-[#60A5FA] to-[#FB923C] bg-clip-text text-transparent">
                    SendiFlash
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
                  A clean shipping workspace for small businesses, online sellers, and teams that need simple label creation. Compare rates, pay securely, and ship.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href="/registro" className="rounded-2xl sm:min-w-52">
                    Create your first label
                  </Button>
                  <Button
                    href="/login"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white sm:min-w-32"
                  >
                    Sign in
                  </Button>
                </div>

                <div className="mt-8 flex max-w-xl flex-wrap gap-2.5">
                  {trustBadges.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/7 px-3.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" />
                      {item}
                    </span>
                  ))}
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
              description="No carrier accounts, no complexity. Enter your shipment info and ship."
            />
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <MotionCard
                    key={step.title}
                    delay={index * 0.08}
                    className="relative rounded-3xl border border-slate-100 bg-[#F8FAFC] p-8 shadow-sm"
                  >
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#F97316)] text-lg font-black text-white shadow-lg shadow-blue-500/20">
                      {index + 1}
                    </span>
                    <Icon className="mt-6 h-6 w-6 text-[#2563EB]" />
                    <h3 className="mt-4 text-lg font-black text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#334155]">{step.text}</p>
                  </MotionCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing transparency ── */}
        <section id="pricing" className="bg-[#0F172A] py-20 text-white sm:py-28">
          <div className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/30 to-transparent" />
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
                <span className="bg-gradient-to-r from-[#60A5FA] to-[#FB923C] bg-clip-text text-transparent">
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
                  <CheckCircle2 className="h-6 w-6 text-[#FB923C]" />
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* ── Rate comparison visual ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
            <MotionReveal delay={0.1}>
              <QuotePreview />
            </MotionReveal>
            <MotionReveal>
              <Badge tone="blue">
                <Zap className="mr-2 h-3.5 w-3.5" />
                Rate comparison
              </Badge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Compare price, speed, and carrier before creating a label
              </h2>
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
                      <div className="grid h-13 w-13 h-[52px] w-[52px] place-items-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#F97316)] text-white shadow-lg shadow-blue-500/18">
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
          <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#2563EB]/18 blur-[120px]" />
          <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#F97316]/14 blur-[120px]" />
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
                <Button href="/registro" className="min-w-48 rounded-2xl">
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
