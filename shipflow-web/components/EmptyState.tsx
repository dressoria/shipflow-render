import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-[#FF1493]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
