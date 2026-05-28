import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
};

export function PublicInfoPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: PublicInfoPageProps) {
  return (
    <>
      <Header />
      <main className="bg-[#F8FAFC] pt-28 text-slate-700">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97316]">{eyebrow}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#2563EB] text-white">
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-black text-slate-950">Need help?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Contact support if a payment, label, or shipment status looks unclear during beta.
              </p>
              <a
                href="mailto:support@sendiflash.app"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#2563EB] hover:text-[#1D4ED8]"
              >
                support@sendiflash.app
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {children}
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-950">Ready to ship?</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/crear-guia"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
              >
                Create shipment
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
