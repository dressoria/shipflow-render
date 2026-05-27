import { ArrowRight, CheckCircle2, Clock3, MapPin, Package, ShieldCheck, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/Badge";

const quoteOptions: Array<{
  name: string;
  time: string;
  price: string;
  tag: string;
  icon: LucideIcon;
  barWidth: string;
}> = [
  { name: "USPS", time: "2–5 days", price: "By route", tag: "Best economy", icon: CheckCircle2, barWidth: "90%" },
  { name: "UPS", time: "1–5 days", price: "By route", tag: "Ground network", icon: ShieldCheck, barWidth: "72%" },
  { name: "FedEx", time: "1–4 days", price: "By route", tag: "Fast option", icon: Clock3, barWidth: "56%" },
];

export function QuotePreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-[#2563EB]/20 via-[#F97316]/12 to-[#0F172A]/12 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl shadow-slate-950/12">
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F172A] px-5 py-4 text-white">
          <div>
            <p className="text-sm font-bold">Shipping desk</p>
            <p className="text-xs text-slate-400">Compare rates before you pay</p>
          </div>
          <Badge tone="blue" className="border border-[#2563EB]/40 bg-[#2563EB]/20 text-blue-200 ring-blue-400/30">
            <Zap className="mr-1 h-3 w-3" />
            Live rates
          </Badge>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-[#2563EB]">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">From</p>
                <p className="font-bold text-slate-950">New York, NY</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-[#F97316]">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">To</p>
                <p className="font-bold text-slate-950">Chicago, IL</p>
              </div>
            </div>
          </div>

          {quoteOptions.map(({ name, time, price, tag, icon: Icon, barWidth }) => (
            <div
              key={name}
              className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/8"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#2563EB]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">{name}</p>
                  <p className="text-sm text-slate-500">{time} · {tag}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-950">{price}</p>
                <div className="mt-2 h-1.5 w-20 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#F97316] transition-all"
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563EB,#3B82F6)] text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/35"
          >
            Compare rates
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
