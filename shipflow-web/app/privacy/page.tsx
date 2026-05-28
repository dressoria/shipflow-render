import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = {
  title: "Privacy | SendiFlash",
  description: "Beta privacy placeholder for SendiFlash.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Beta privacy"
      title="Privacy notice"
      description="This beta privacy notice is a plain-language placeholder and should be reviewed by counsel before broad public launch."
      icon={ShieldCheck}
    >
      <div className="grid gap-5">
        {[
          {
            title: "Information used for shipping",
            text: "SendiFlash uses account, address, package, payment, and shipment information to quote rates, create labels, display tracking, and provide support.",
          },
          {
            title: "Payment handling",
            text: "Card payments are handled through Stripe Checkout. SendiFlash should not receive or store full card numbers in the application.",
          },
          {
            title: "Provider and carrier data",
            text: "Shipment details may be sent to configured shipping providers and carriers so rates, labels, tracking, voids, or support review can be handled.",
          },
          {
            title: "Support access",
            text: "Authorized admins may review order, payment, shipment, and error information to resolve beta exceptions. Secrets and credentials are not shown to normal users.",
          },
        ].map((section) => (
          <section key={section.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.text}</p>
          </section>
        ))}
      </div>
    </PublicInfoPage>
  );
}
