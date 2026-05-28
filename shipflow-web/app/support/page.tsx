import type { Metadata } from "next";
import { CreditCard, HelpCircle, PackageCheck, Truck, Wallet } from "lucide-react";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = {
  title: "Support | SendiFlash",
  description: "Beta support and FAQ for SendiFlash shipping, payments, labels, and domestic markets.",
};

const faqs = [
  {
    title: "How do I create a shipment?",
    text: "Open Get rates, enter origin and destination addresses, add package dimensions, compare available rates, then choose a rate and pay with wallet or card.",
    icon: PackageCheck,
  },
  {
    title: "What happens after I pay?",
    text: "For enabled accounts, SendiFlash automatically starts label purchase after payment is confirmed. When the carrier returns a label, it appears in My Shipments.",
    icon: Truck,
  },
  {
    title: "Wallet or card payment?",
    text: "Wallet uses your SendiFlash balance. Card payment redirects to Stripe Checkout when enabled for your account. Both paths use server-calculated pricing.",
    icon: Wallet,
  },
  {
    title: "Where do I download my label?",
    text: "Go to My Shipments or open the shipment detail page. If the carrier returned a label URL, the label action appears there.",
    icon: CreditCard,
  },
];

export default function SupportPage() {
  return (
    <PublicInfoPage
      eyebrow="Beta support"
      title="Help for shipping with SendiFlash"
      description="Simple answers for creating labels, paying securely, tracking shipments, and understanding beta limitations."
      icon={HelpCircle}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {faqs.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
          <h2 className="text-lg font-black text-slate-950">Domestic markets in beta</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            SendiFlash currently supports domestic shipments within selected countries: US, CA, ES, DE, FR, and GB. UK input is normalized to GB.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            International shipping, customs forms, duties, taxes, and export documents are not available yet.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">When a label needs review</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            If payment is confirmed but the label needs support review, do not create the same shipment again. Check My Shipments and contact support with the order or tracking reference.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Refunds and voids are reviewed manually by support/admin during beta. They are not automatic.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
