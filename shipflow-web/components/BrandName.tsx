import { cn } from "@/lib/utils";

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-['Sora',_'Plus_Jakarta_Sans',_'Outfit',_'Poppins',_ui-sans-serif,_system-ui,_sans-serif] text-[1.08em] font-bold leading-none tracking-[0.03em] text-[#0F172A]",
        className,
      )}
    >
      <span className="text-current">Sendi</span>
      <span className="ml-0.5 text-[#F97316]">Flash</span>
    </span>
  );
}
