import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { BrandName } from "@/components/BrandName";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0F172A] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#06B6D4,#22C55E)] text-white">
              <PackageCheck className="h-5 w-5" />
            </span>
            <BrandName className="text-white" />
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Multi-carrier shipping for U.S. ecommerce sellers, small businesses, and operations teams.
          </p>
        </div>
        <div>
          <p className="font-bold">Product</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <Link href="/crear-guia" className="hover:text-white">Create label</Link>
            <Link href="/envios" className="hover:text-white">Shipments</Link>
            <Link href="/tracking" className="hover:text-white">Tracking</Link>
          </div>
        </div>
        <div>
          <p className="font-bold">Contact</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <a href="mailto:support@shipflow.local" className="hover:text-white">
              support@shipflow.local
            </a>
            <Link href="/registro" className="hover:text-white">Create free account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
