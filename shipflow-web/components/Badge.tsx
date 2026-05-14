import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "slate";
  className?: string;
};

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  const tones = {
    blue: "bg-pink-50 text-[#FF1493] ring-[#FF73C6]/40",
    green: "bg-green-50 text-[#15803d] ring-green-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    slate: "bg-slate-100 text-[#6B7280] ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 backdrop-blur",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
