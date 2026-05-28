import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = {
  title: "Support Policy | SendiFlash",
  description: "Beta support, refunds, and voids policy placeholder for SendiFlash.",
};

export default function SupportPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Beta support policy"
      title="Refunds, voids, and shipping support"
      description="This beta policy explains how support reviews shipment exceptions. It is a placeholder and should be finalized before broad public launch."
      icon={RotateCcw}
    >
      <div className="grid gap-5">
        {[
          {
            title: "Labels under review",
            text: "If payment succeeds but a label is under review, support will inspect the order. Do not submit duplicate paid shipments for the same package unless support asks you to.",
          },
          {
            title: "Refunds",
            text: "Refunds are manually reviewed during beta. Eligibility depends on payment status, label status, carrier state, and whether the shipment can be safely reconciled.",
          },
          {
            title: "Voids",
            text: "Carrier label voids are manually reviewed and are available only when the connected provider and current label state allow it. Automatic voids are intentionally disabled.",
          },
          {
            title: "Domestic markets",
            text: "Supported-country validation does not guarantee a carrier account has rates in every market. If no rates are returned, checkout is blocked and support can review provider setup.",
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
