import Link from "next/link";
import { BrandName } from "@/components/BrandName";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0F172A] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-8 w-1.5 rounded-full bg-[#F97316]" aria-hidden="true" />
            <BrandName className="text-white" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Multi-carrier shipping for small businesses, online sellers, and operations teams. Compare rates, pay securely, ship.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold">Product</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/shipping-labels" className="hover:text-white transition">Shipping Labels</Link>
            <Link href="/ecuador" className="hover:text-white transition">Ecuador Shipping</Link>
            <Link href="/fba-prep" className="hover:text-white transition">FBA Prep</Link>
            <Link href="/crear-guia" className="hover:text-white transition">Create a label</Link>
            <Link href="/prep/orders" className="hover:text-white transition">Prep orders</Link>
            <Link href="/envios" className="hover:text-white transition">Shipments</Link>
            <Link href="/support" className="hover:text-white transition">Support</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold">Company</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <a href="mailto:support@sendiflash.app" className="hover:text-white transition">
              support@sendiflash.app
            </a>
            <Link href="/registro" className="hover:text-white transition">Create account</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/support-policy" className="hover:text-white transition">Support policy</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/8 px-4 py-5 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-7xl text-xs text-slate-500">
          © {new Date().getFullYear()} SendiFlash. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
