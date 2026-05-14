import { cn } from "@/lib/utils";

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-['Sora',_'Plus_Jakarta_Sans',_'Outfit',_'Poppins',_ui-sans-serif,_system-ui,_sans-serif] text-[1.08em] font-bold leading-none tracking-[0.035em] text-[#12182B]",
        className,
      )}
    >
      <span className="text-current">Ship</span>
      <span className="ml-0.5 text-[#06B6D4]">Flow</span>
    </span>
  );
}
