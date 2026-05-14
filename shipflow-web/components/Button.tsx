import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "whatsapp" | "ghost" | "dark";
  className?: string;
  icon?: React.ReactNode;
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
  icon,
}: ButtonProps) {
  const styles = {
    primary:
      "bg-[linear-gradient(135deg,#FF1493,#FF4FB3,#FF73C6)] text-white shadow-xl shadow-[#FF1493]/25 hover:-translate-y-0.5 hover:shadow-[#FF1493]/40",
    secondary:
      "border border-[#FF73C6]/35 bg-white/80 text-[#12182B] shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-[#FF1493]/50 hover:bg-pink-50",
    whatsapp:
      "bg-[#22C55E] text-white shadow-xl shadow-[#22C55E]/20 hover:-translate-y-0.5 hover:bg-[#16a34a]",
    ghost: "text-[#6B7280] hover:bg-pink-50 hover:text-[#FF1493]",
    dark:
      "bg-[#12182B] text-white shadow-xl shadow-[#12182B]/25 hover:-translate-y-0.5 hover:bg-[#1b2440] hover:shadow-[#FF1493]/20",
  };

  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-bold transition",
          styles[variant],
          className,
        )}
      >
        {icon ? <span className="mr-2">{icon}</span> : null}
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-bold transition",
        styles[variant],
        className,
      )}
      >
      {icon ? <span className="mr-2">{icon}</span> : null}
      {children}
    </Link>
  );
}
