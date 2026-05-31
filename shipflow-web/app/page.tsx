import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  History,
  MapPinned,
  Package,
  Printer,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
  "Shipping labels",
  "Amazon FBA Prep",
  "Wallet & card payments",
  "Rate comparison",
  "Shipment tracking",
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
    text: "Create labels for every order without switching carrier portals, and request early access to FBA prep from the same account.",
  },
  {
    icon: Building2,
    title: "Small businesses",
    text: "Manage all your shipping from a single workspace. Balance, labels, and tracking in one place.",
  },
  {
    icon: Package,
    title: "Amazon FBA sellers",
    text: "Join the early-access list for managed FBA prep services — labeling, poly bagging, bundling, and case forwarding.",
  },
  {
    icon: Users,
    title: "Teams managing shipments",
    text: "Give your team a shared shipping workspace with full history and status visibility.",
  },
];

const sellerTools: Array<{ icon: LucideIcon; title: string; text: string; href: string }> = [
  {
    icon: Printer,
    title: "Shipping Label Generator",
    text: "Compare carrier rates and create print-ready labels for any domestic shipment.",
    href: "/crear-guia",
  },
  {
    icon: Truck,
    title: "Shipping Labels Guide",
    text: "Learn how SendiFlash Shipping works — rates, payment, label downloads, and tracking.",
    href: "/shipping-labels",
  },
  {
    icon: Package,
    title: "FBA Prep Early Access",
    text: "Request access to managed Amazon FBA prep while public Prep ordering is being prepared.",
    href: "/registro?service=prep",
  },
  {
    icon: Tag,
    title: "FBA Prep Guide",
    text: "Learn how SendiFlash Prep works — services, workflow, quotes, and payment.",
    href: "/fba-prep",
  },
  {
    icon: CreditCard,
    title: "Wallet & Balance",
    text: "Top up your balance and pay for labels without entering card details every time.",
    href: "/saldo",
  },
  {
    icon: ScanLine,
    title: "Shipment Tracking",
    text: "Follow every shipment from label creation to carrier delivery.",
    href: "/envios",
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
        Carrier names and logos are trademarks of their respective owners. Availability may vary by account, route, and provider integration. Domestic shipping in selected markets.
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

function DashboardHeroVisual() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/12">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
          <span className="mx-3 flex-1 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
            sendiflash.app/dashboard
          </span>
        </div>

        {/* Two-service preview cards */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-4">
          {/* Shipping Labels mini-card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#2563EB] text-white">
                <Truck className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-black text-slate-800">Shipping Labels</span>
            </div>
            <p className="mb-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500">
              New York → Miami · 1 lb
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-slate-700">USPS Ground</span>
                <span className="text-[10px] font-black text-[#2563EB]">$8.42</span>
              </div>
              <div className="flex items-center justify-between rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-semibold text-slate-500">UPS Ground</span>
                <span className="text-[10px] font-semibold text-slate-500">$10.18</span>
              </div>
              <div className="flex items-center justify-between rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-semibold text-slate-500">FedEx 2Day</span>
                <span className="text-[10px] font-semibold text-slate-500">$15.90</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Label ready
              </span>
            </div>
          </div>

          {/* Prep mini-card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F97316] text-white">
                <Package className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-black text-slate-800">FBA Prep</span>
            </div>
            <p className="mb-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500">
              Amazon FBA · 2,000 units
            </p>
            <div className="space-y-1.5 text-[10px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0 text-[#F97316]" />
                FNSKU labeling
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0 text-[#F97316]" />
                Poly bag packaging
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0 text-[#F97316]" />
                Case forwarding
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Quote ready
              </span>
              <span className="rounded-lg bg-[#F97316] px-2 py-0.5 text-[10px] font-black text-white">
                Accept →
              </span>
            </div>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-4 py-3">
          {["Wallet", "Card payment", "Tracking", "FBA Prep", "Seller tools"].map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TwoServicesSection() {
  return (
    <section id="services" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Two services, one account"
          title="Two ways to manage ecommerce logistics"
          description="Shipping labels for every order, and managed Amazon FBA prep — both from one SendiFlash account."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Shipping Labels */}
          <MotionCard
            delay={0}
            className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-8 shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/6"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-500/20">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-950">SendiFlash Shipping</h3>
            <p className="mt-3 text-base leading-7 text-[#334155]">
              Compare domestic carrier rates, pay with wallet or card, generate labels, and track shipments from one workspace.
            </p>
            <ul className="mt-6 grid gap-2.5">
              {["Compare domestic rates", "Pay with wallet or card", "Generate labels instantly", "Track shipments"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[#334155]">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#2563EB]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                href="/shipping-labels"
                variant="secondary"
                icon={<ArrowRight className="h-4 w-4" />}
                className="self-start rounded-2xl border-blue-200 text-[#2563EB] hover:border-[#2563EB] hover:bg-blue-50"
              >
                See Shipping Labels
              </Button>
              <Link
                href="/crear-guia"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition hover:text-[#2563EB]"
              >
                Create a label <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </MotionCard>

          {/* Prep */}
          <MotionCard
            delay={0.08}
            className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-white p-8 shadow-sm transition hover:border-orange-200 hover:shadow-lg hover:shadow-orange-950/6"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F97316] text-white shadow-lg shadow-orange-500/20">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-950">SendiFlash Prep</h3>
            <p className="mt-3 text-base leading-7 text-[#334155]">
              Managed Amazon FBA prep service in controlled early access. Request access for FNSKU labeling, poly bagging, bundling, and case forwarding.
            </p>
            <ul className="mt-6 grid gap-2.5">
              {["Request early access", "FNSKU labeling, poly bag, bundling", "Quote review for approved beta accounts", "Track prep status in beta"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[#334155]">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#F97316]" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Prep is not publicly open yet. Services are manually managed and may be performed by SendiFlash or logistics partners.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                href="/fba-prep"
                variant="action"
                icon={<ArrowRight className="h-4 w-4" />}
                className="self-start rounded-2xl"
              >
                See FBA Prep
              </Button>
              <Link
                href="/registro?service=prep"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition hover:text-[#F97316]"
              >
                Request Prep early access <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </MotionCard>
        </div>
      </div>
    </section>
  );
}

function SellerToolsSection() {
  return (
    <section id="seller-tools" className="bg-[#F8FAFC] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Seller tools"
          title="Everything ecommerce sellers need in one hub"
          description="From shipping labels to FBA prep requests, your entire logistics workflow lives in one SendiFlash workspace."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sellerTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <MotionCard
                key={tool.title}
                delay={index * 0.05}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/4 transition hover:-translate-y-1 hover:border-[#F97316]/30 hover:shadow-lg hover:shadow-slate-950/8"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[#F97316] transition group-hover:bg-[#F97316] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#F97316]" />
                </div>
                <h3 className="mt-5 font-black text-slate-950 transition group-hover:text-[#F97316]">{tool.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#334155]">{tool.text}</p>
                <div className="mt-5">
                  <Link
                    href={tool.href}
                    className="text-sm font-bold text-[#F97316] transition hover:underline"
                  >
                    Open tool
                  </Link>
                </div>
              </MotionCard>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          Sign in or create a free account to access all seller tools.
        </p>
      </div>
    </section>
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
              One workspace
            </Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Shipping and prep managed from one SendiFlash workspace.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              SendiFlash brings shipping labels, FBA prep requests, wallet payments, and shipment tracking into a single operational view for domestic ecommerce sellers.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.12}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "2", label: "services in one account" },
                { value: "4", label: "carrier options" },
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
                  Shipping Labels available now · FBA Prep early access
                </Badge>

                <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-[#0F172A] sm:text-6xl lg:text-[3.75rem]">
                  Ship faster. Prep smarter.{" "}
                  <span className="text-[#2563EB]">Scale your</span>{" "}
                  <span className="text-[#F97316]">logistics.</span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-8 text-[#334155]">
                  Compare rates, create shipping labels, and request early access to Amazon FBA prep from a single SendiFlash account.
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
                    href="/fba-prep"
                    variant="secondary"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="rounded-2xl border-blue-100 bg-white text-[#0F172A] hover:border-[#F97316]/40 hover:bg-orange-50 hover:text-[#F97316] sm:min-w-44"
                  >
                    FBA Prep early access
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
                <DashboardHeroVisual />
              </MotionReveal>
            </div>

            <MotionReveal delay={0.24} className="mt-14 lg:hidden">
              <DashboardHeroVisual />
            </MotionReveal>
          </div>
        </section>

        {/* ── Trust / Benefits strip ── */}
        <section className="-mt-10 bg-[#F8FAFC] px-4 pb-14 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-3 rounded-[2rem] border border-white/90 bg-white/95 p-4 shadow-2xl shadow-slate-950/8 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title: "Secure payments", text: "PCI-compliant checkout" },
              { title: "Multi-carrier rates", text: "Compare before you buy" },
              { title: "Amazon FBA Prep", text: "Managed prep service" },
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

        {/* ── Two services ── */}
        <TwoServicesSection />

        {/* ── Real logistics scenes ── */}
        <section className="bg-[#F8FAFC] py-20 sm:py-28">
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
        <section id="features" className="bg-white py-20 sm:py-28">
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
        <section className="bg-[#F8FAFC] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <MotionReveal>
                <Badge tone="blue">
                  <MapPinned className="mr-2 h-3.5 w-3.5" />
                  Domestic shipping
                </Badge>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                  Ship anywhere in the U.S. with a route that feels alive.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#334155]">
                  Follow a clean coast-to-coast route as each city highlights during transit. Domestic shipping in selected markets.
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
                Your total is shown before you confirm. Shipping cost, service fee, and payment fee — all visible upfront. Prep orders show a final quote before you accept.
              </p>
              <ul className="mt-6 grid gap-2.5 text-sm text-slate-400">
                {[
                  "No monthly subscription required",
                  "No switching between carrier portals",
                  "Pay per label created",
                  "Prep quote shown before acceptance",
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

        {/* ── Seller tools hub ── */}
        <SellerToolsSection />

        {/* ── Use cases ── */}
        <section id="use-cases" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Use cases"
              title="Built for teams that ship and prep"
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
                Start shipping now, request Prep early access
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
                Create an account, compare rates, and ship your first package today. FBA Prep is opening gradually for approved early-access accounts.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/registro" variant="action" className="min-w-48 rounded-2xl">
                  Start shipping
                </Button>
                <Button
                  href="/registro?service=prep"
                  variant="secondary"
                  icon={<ArrowRight className="h-4 w-4" />}
                  className="min-w-48 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white"
                >
                  Request Prep early access
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
