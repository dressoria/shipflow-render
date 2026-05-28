import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = {
  title: "Terms | SendiFlash",
  description: "Beta terms placeholder for SendiFlash.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Beta terms"
      title="Terms of use"
      description="These beta terms are placeholder operating terms for controlled testing and should be reviewed by counsel before broad public launch."
      icon={FileText}
    >
      <div className="grid gap-5">
        {[
          {
            title: "Beta service",
            text: "SendiFlash is available for controlled beta use. Features, carrier availability, pricing behavior, and supported markets may change as the service is refined.",
          },
          {
            title: "Domestic shipping only",
            text: "The service currently supports domestic shipments within selected countries only. International shipping, customs, duties, taxes, and export documents are not supported yet.",
          },
          {
            title: "Payments and labels",
            text: "Rates and customer prices are calculated server-side. After payment, SendiFlash attempts to purchase the selected label automatically when enabled. Some orders may require support review.",
          },
          {
            title: "Support review",
            text: "Refunds, voids, failed labels, duplicate orders, and carrier exceptions are reviewed manually during beta. Contact support before recreating a paid shipment.",
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
