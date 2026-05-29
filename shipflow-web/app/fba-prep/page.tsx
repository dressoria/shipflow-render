import {
  ArrowRight,
  CheckCircle2,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionCard, MotionReveal } from "@/components/Motion";
import { SectionHeading } from "@/components/SectionHeading";

const prepServices: Array<{ title: string; text: string }> = [
  {
    title: "FNSKU Labeling",
    text: "Apply Amazon-required FNSKU barcodes to each unit for FBA inventory identification.",
  },
  {
    title: "Poly Bag Packaging",
    text: "Individually bag units in poly bags with appropriate suffocation warnings per Amazon guidelines.",
  },
  {
    title: "Bubble Wrap",
    text: "Protect fragile items with bubble wrap as required for Amazon FBA prep.",
  },
  {
    title: "Bundling",
    text: "Group multiple units into multi-packs or bundles according to your ASIN requirements.",
  },
  {
    title: "Kitting",
    text: "Assemble multi-component product sets from individual SKUs into single ready-to-ship units.",
  },
  {
    title: "Inspection",
    text: "Visual inspection of units for damage or defects before labeling and packaging.",
  },
  {
    title: "Case Forwarding",
    text: "Palletize and forward inventory to Amazon FBA fulfillment centers based on your shipment plan.",
  },
  {
    title: "Temporary Storage",
    text: "Short-term inventory storage while prep orders are being processed. Subject to availability.",
  },
];

const whatIsIncluded: Array<{ title: string; text: string }> = [
  {
    title: "No automatic charges",
    text: "You always review the final quote before any payment is taken.",
  },
  {
    title: "Quote before work begins",
    text: "Our team reviews your request and sends a final quote based on actual unit count and services.",
  },
  {
    title: "Pay by wallet or card",
    text: "Use your SendiFlash wallet balance or a card to pay after accepting the quote.",
  },
  {
    title: "Track prep status",
    text: "Follow your order progress from submission to FBA forwarding inside your SendiFlash account.",
  },
];

const workflow: Array<{ number: string; title: string; text: string }> = [
  {
    number: "1",
    title: "Submit a prep request",
    text: "Log in to SendiFlash, go to Prep, and create a new request. Describe your units, quantities, and required services.",
  },
  {
    number: "2",
    title: "Receive a quote",
    text: "Our team reviews your request and sends a final quote. The quote reflects actual unit counts and services required.",
  },
  {
    number: "3",
    title: "Accept and pay",
    text: "Review the quote in your account. Accept it and pay with your wallet balance or a card. No automatic charge before acceptance.",
  },
  {
    number: "4",
    title: "Ship inventory to us",
    text: "After payment, you receive receiving instructions. Ship your inventory to the designated address.",
  },
  {
    number: "5",
    title: "Track prep progress",
    text: "Follow your prep order status in your SendiFlash account. Once complete, your inventory is forwarded to Amazon FBA.",
  },
];

export default function FbaPrepPage() {
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
                  className="border border-orange-100 bg-orange-50 text-[#F97316] ring-orange-100"
                >
                  <Package className="mr-2 h-3.5 w-3.5" />
                  SendiFlash Prep
                </Badge>
                <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.75rem]">
                  Amazon FBA prep managed from your{" "}
                  <span className="text-[#F97316]">SendiFlash account.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-[#334155]">
                  Submit a prep request, review the quote, accept and pay, then track your inventory — all from one place. No warehouse contracts required.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    href="/registro?service=prep"
                    variant="action"
                    className="rounded-2xl sm:min-w-44"
                  >
                    Request FBA prep
                  </Button>
                  <Button
                    href="/login"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl sm:min-w-44"
                  >
                    Sign in
                  </Button>
                </div>
                <p className="mt-5 text-xs leading-5 text-slate-400">
                  Prep services are manually managed and may be performed by SendiFlash or logistics partners. Final quote may vary after review.
                </p>
              </MotionReveal>

              <MotionReveal delay={0.2}>
                {/* Prep request preview */}
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/12">
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                    <span className="mx-3 flex-1 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
                      sendiflash.app/prep
                    </span>
                  </div>
                  <div className="bg-slate-50/80 p-5">
                    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F97316] text-white">
                          <Package className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <p className="font-black text-slate-900">Prep Request #PR-1024</p>
                          <p className="text-xs text-slate-400">Amazon FBA · 2,000 units</p>
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-700">
                        {["FNSKU labeling", "Poly bag packaging", "Case forwarding"].map((svc) => (
                          <div key={svc} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#F97316]" />
                            {svc}
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs text-slate-400">Status</p>
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            Quote ready
                          </span>
                        </div>
                        <span className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-black text-white">
                          Accept &amp; pay
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-4 py-3">
                    {["Submitted", "Quote sent", "Payment accepted", "Prep in progress", "FBA forwarded"].map((chip) => (
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

        {/* ── What is SendiFlash Prep ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-14 lg:grid-cols-2">
              <MotionReveal>
                <Badge tone="blue">
                  <Package className="mr-2 h-3.5 w-3.5" />
                  Managed service
                </Badge>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                  What is SendiFlash Prep?
                </h2>
                <p className="mt-5 text-base leading-7 text-[#334155]">
                  SendiFlash Prep is a managed Amazon FBA prep service. You submit a request with unit counts and services required. Our team reviews it, sends a final quote, and you accept and pay before any work begins.
                </p>
                <p className="mt-4 text-base leading-7 text-[#334155]">
                  There is no automatic charge. You always review the quote first.
                </p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {whatIsIncluded.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                      <CheckCircle2 className="h-5 w-5 text-[#F97316]" />
                      <h3 className="mt-3 font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[#334155]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </MotionReveal>

              <MotionReveal delay={0.1}>
                <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-white p-8 shadow-sm">
                  <p className="text-sm font-black uppercase tracking-widest text-[#F97316]">
                    Services available
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {prepServices.slice(0, 6).map((svc) => (
                      <div key={svc.title} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F97316]" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{svc.title}</p>
                          <p className="text-xs leading-5 text-slate-500">{svc.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-slate-400">
                    Additional services available on request. All services subject to quote and availability.
                  </p>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>

        {/* ── All prep services ── */}
        <section className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Prep services"
              title="What we can prep for Amazon FBA"
              description="Each service is quoted and confirmed before work begins. Services may be performed by SendiFlash or logistics partners."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {prepServices.map((svc, index) => (
                <MotionCard
                  key={svc.title}
                  delay={index * 0.05}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/4 transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-950/6"
                >
                  <CheckCircle2 className="h-6 w-6 text-[#F97316]" />
                  <h3 className="mt-4 font-black text-slate-950">{svc.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#334155]">{svc.text}</p>
                </MotionCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="From request to Amazon FBA in five steps"
              description="The entire prep workflow is managed through your SendiFlash account."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {workflow.map((step, index) => (
                <MotionCard
                  key={step.number}
                  delay={index * 0.07}
                  className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/40 to-white p-6 shadow-sm"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F97316] text-lg font-black text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-4 font-black text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#334155]">{step.text}</p>
                </MotionCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Transparency notice ── */}
        <section className="bg-[#F8FAFC] py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="h-7 w-7 text-[#2563EB]" />
              <h3 className="mt-4 text-xl font-black text-slate-950">Transparency first</h3>
              <ul className="mt-5 grid gap-3 text-sm text-[#334155]">
                {[
                  "Final prep quote may vary after review based on actual unit count and service requirements.",
                  "Prep services are manually managed and may be performed by SendiFlash or logistics partners.",
                  "No automatic charges are made before you accept the quoted price.",
                  "Service availability may vary. Contact support if you have special requirements.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2563EB]" />
                    {item}
                  </li>
                ))}
              </ul>
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
                className="border border-[#F97316]/40 bg-[#F97316]/15 text-orange-200 ring-orange-400/25"
              >
                <Package className="mr-2 h-3.5 w-3.5" />
                SendiFlash Prep
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Ready to simplify your FBA prep?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
                Create a free SendiFlash account and submit your first prep request. Our team reviews it and sends a quote before any work begins.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  href="/registro?service=prep"
                  variant="action"
                  className="min-w-48 rounded-2xl"
                >
                  Request FBA prep
                </Button>
                <Button
                  href="/login"
                  variant="secondary"
                  icon={<ArrowRight className="h-4 w-4" />}
                  className="min-w-48 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white"
                >
                  Sign in
                </Button>
              </div>
              <p className="mt-5 text-xs text-slate-500">
                Services may be performed by SendiFlash or logistics partners. Final quote may vary after review.
              </p>
            </MotionReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
