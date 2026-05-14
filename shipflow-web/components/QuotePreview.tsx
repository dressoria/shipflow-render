import { ArrowRight, CheckCircle2, Clock3, MapPin, Package, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/Badge";

const quoteOptions: Array<{
  name: string;
  time: string;
  price: string;
  tag: string;
  icon: LucideIcon;
}> = [
  { name: "USPS", time: "2-5 days", price: "$7.80", tag: "Best economy", icon: CheckCircle2 },
  { name: "UPS", time: "1-5 days", price: "$8.90", tag: "Ground network", icon: ShieldCheck },
  { name: "FedEx", time: "1-4 days", price: "$10.40", tag: "Fast option", icon: Clock3 },
];

export function QuotePreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-[#06B6D4]/25 via-[#22C55E]/18 to-[#0F172A]/18 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/15">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-sm font-bold">Shipping desk</p>
            <p className="text-xs text-slate-300">Smart rate comparison</p>
          </div>
          <Badge tone="green">Rates</Badge>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-[#06B6D4]">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">Origin</p>
                <p className="font-bold text-slate-950">New York, NY</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-100 text-[#16a34a]">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">Destination</p>
                <p className="font-bold text-slate-950">Chicago, IL</p>
              </div>
            </div>
          </div>

          {quoteOptions.map(({ name, time, price, tag, icon: Icon }, index) => (
            <div
              key={name}
              className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-950/10"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-cyan-50 group-hover:text-[#06B6D4]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">{name}</p>
                  <p className="text-sm text-slate-500">{time} · {tag}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-950">{price}</p>
                <div className="mt-2 h-2 w-20 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#22C55E]"
                    style={{ width: `${94 - index * 18}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#06B6D4] text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:bg-[#0891B2]">
            Generate label
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
