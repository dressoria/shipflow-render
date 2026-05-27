import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "dark";
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
      "bg-[linear-gradient(135deg,#2563EB,#3B82F6)] text-white shadow-lg shadow-[#2563EB]/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#2563EB]/35",
    secondary:
      "border border-slate-200 bg-white text-[#0F172A] shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]",
    ghost: "text-[#64748B] hover:bg-blue-50 hover:text-[#2563EB]",
    dark:
      "bg-[#0F172A] text-white shadow-lg shadow-[#0F172A]/30 hover:-translate-y-0.5 hover:bg-[#1E293B] hover:shadow-xl hover:shadow-[#2563EB]/20",
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
