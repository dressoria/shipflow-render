import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "green";
};

export function StatCard({ label, value, detail, icon: Icon, tone = "blue" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-950/10">
      <div className="flex items-center justify-between gap-4">
        <div
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl",
            tone === "green" ? "bg-green-50 text-[#16a34a]" : "bg-pink-50 text-[#FF1493]",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-[#16a34a]">{detail}</span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
