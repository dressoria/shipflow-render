import Link from "next/link";
import { ArrowRight, ClipboardList, PackageCheck } from "lucide-react";

export function PrepComingSoon() {
  return (
    <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm shadow-slate-950/5">
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_320px] md:p-7">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#EA580C]">
            In preparation
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            SendiFlash Prep is in preparation
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            We&apos;re preparing managed Amazon FBA prep inside SendiFlash. Shipping Labels are available now, and Prep will open soon.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/crear-guia"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F97316] px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
            >
              Create shipping label
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-[#2563EB] transition hover:border-blue-200 hover:bg-blue-100"
            >
              Request early access
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-slate-950">FBA Prep</p>
                <p className="text-xs font-semibold text-slate-500">Early access only</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <PrepReadinessLine label="Shipping Labels" value="Available now" ready />
              <PrepReadinessLine label="FBA Prep" value="Opening soon" />
              <PrepReadinessLine label="Public orders" value="Not enabled yet" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrepReadinessLine({ label, value, ready = false }: { label: string; value: string; ready?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className={`inline-flex items-center gap-1 font-black ${ready ? "text-green-700" : "text-[#EA580C]"}`}>
        {ready ? <PackageCheck className="h-4 w-4" /> : null}
        {value}
      </span>
    </div>
  );
}
