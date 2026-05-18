"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, PackageCheck, Printer } from "lucide-react";
import { Badge } from "@/components/Badge";
import { BrandName } from "@/components/BrandName";
import { formatDate } from "@/lib/forms";
import { getShipmentByTrackingNumber } from "@/lib/services/shipmentService";
import type { Envio } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function displayShipmentStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

function displayRecordStatus(status?: string | null) {
  if (!status) return "Not available";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function PrintableGuide({ trackingNumber }: { trackingNumber: string }) {
  const [shipment, setShipment] = useState<Envio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.setTimeout(() => {
      getShipmentByTrackingNumber(decodeURIComponent(trackingNumber))
        .then(setShipment)
        .finally(() => setLoading(false));
    }, 0);
  }, [trackingNumber]);

  const codeBlocks = useMemo(() => {
    const source = shipment?.trackingNumber ?? trackingNumber;
    return Array.from({ length: 96 }, (_, index) => {
      const charCode = source.charCodeAt(index % source.length) || index;
      return charCode % 3 === 0 ? "w-1" : charCode % 2 === 0 ? "w-2" : "w-0.5";
    });
  }, [shipment?.trackingNumber, trackingNumber]);

  if (loading) {
    return <GuideFrame><p className="text-center font-bold text-slate-600">Loading shipment summary...</p></GuideFrame>;
  }

  if (!shipment) {
    return (
      <GuideFrame>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-950">Label not found</h1>
          <p className="mt-2 text-slate-500">Review the tracking number or go back to shipments.</p>
          <Link href="/envios" className="print-hidden mt-6 inline-flex h-11 items-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white">
            Back to shipments
          </Link>
        </div>
      </GuideFrame>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="print-hidden mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link href="/envios" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to shipments
        </Link>
        <div className="flex flex-wrap gap-3">
          {shipment.labelStatus === "voided" ? (
            <span className="inline-flex h-11 items-center rounded-2xl bg-amber-50 px-4 text-sm font-bold text-amber-800">
              Voided label - do not use
            </span>
          ) : shipment.labelUrl ? (
            <a
              href={shipment.labelUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-2xl bg-[#FF1493] px-4 text-sm font-bold text-white shadow-xl shadow-pink-500/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Download carrier label
            </a>
          ) : (
            <span className="inline-flex h-11 items-center rounded-2xl bg-amber-50 px-4 text-sm font-bold text-amber-800">
              Carrier label unavailable
            </span>
          )}
          <button onClick={() => window.print()} className="inline-flex h-11 items-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">
            <Printer className="mr-2 h-4 w-4" />
            Print summary
          </button>
          <button onClick={() => window.print()} className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20">
            <Download className="mr-2 h-4 w-4" />
            Download summary PDF
          </button>
          <Link
            href={`/tracking?trackingNumber=${encodeURIComponent(shipment.trackingNumber)}`}
            className="inline-flex h-11 items-center rounded-2xl bg-cyan-50 px-4 text-sm font-bold text-[#06B6D4]"
          >
            Track shipment
          </Link>
        </div>
      </div>

      <GuideFrame>
        <section className="print-label rounded-[28px] border border-slate-300 bg-white shadow-2xl shadow-slate-950/10 print:rounded-none print:border-slate-900 print:shadow-none">
          <header className="grid min-w-0 gap-5 border-b-2 border-slate-900 p-6 md:grid-cols-[minmax(0,1fr)_auto_auto] print:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-w-0 items-center gap-3 text-left">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-[#22C55E] print:border print:border-slate-900 print:bg-white print:text-slate-950">
                <PackageCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="guide-wrap text-xl"><BrandName /></p>
                <p className="guide-wrap mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Shipment summary</p>
              </div>
            </div>
            <div className="min-w-0 text-left md:text-right print:text-right">
              <p className="guide-wrap text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Tracking number</p>
              <h1 className="guide-wrap mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{shipment.trackingNumber}</h1>
              <Badge tone={shipment.status === "Pendiente" ? "amber" : shipment.status === "Entregado" ? "green" : "blue"} className="mt-2">
                {displayShipmentStatus(shipment.status)}
              </Badge>
            </div>
            <StatusPanel shipment={shipment} />
          </header>

          <div className="grid min-w-0 gap-4 p-6">
            <InfoBlock
              title="Sender"
              rows={[
                ["Name", shipment.senderName],
                ["Phone", shipment.senderPhone],
                ["City", shipment.originCity],
              ]}
            />
            <InfoBlock
              title="Recipient"
              rows={[
                ["Name", shipment.recipientName],
                ["Phone", shipment.recipientPhone],
                ["City", shipment.destinationCity],
              ]}
            />
            <InfoBlock title="Delivery address" rows={[["Address", shipment.destinationAddress]]} />
            {shipment.labelStatus === "voided" ? (
              <section className="min-w-0 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-left print:rounded-none print:border-amber-500">
                <h2 className="guide-wrap text-xs font-black uppercase tracking-[0.16em] text-amber-700">Voided label</h2>
                <p className="guide-wrap mt-2 text-sm font-semibold text-amber-800">
                  This label was voided and should not be used.
                </p>
              </section>
            ) : null}
            <InfoBlock
              title="Package and carrier"
              rows={[
                ["Product", shipment.productType],
                ["Weight", `${shipment.weight} kg`],
                ["Carrier", shipment.courier],
                ["Date", formatDate(shipment.date)],
              ]}
            />
            <PricingBlock shipment={shipment} />
            <Barcode codeBlocks={codeBlocks} trackingNumber={shipment.trackingNumber} />
          </div>

          <footer className="border-t-2 border-slate-900 px-6 py-4">
            <h2 className="guide-wrap text-sm font-black uppercase tracking-[0.16em] text-slate-950">Summary notes</h2>
            <ul className="mt-2 grid min-w-0 gap-1 text-left text-xs font-semibold leading-5 text-slate-700 sm:grid-cols-2 print:grid-cols-2">
              <li className="guide-wrap">Use the official carrier label PDF for the package.</li>
              <li className="guide-wrap">Validate recipient details before handoff.</li>
              <li className="guide-wrap">This summary is for ShipFlow records and review.</li>
              <li className="guide-wrap">Tracking updates appear once the carrier reports movement.</li>
            </ul>
          </footer>
        </section>
      </GuideFrame>
    </main>
  );
}

function GuideFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl print:max-w-none">{children}</div>;
}

function StatusPanel({ shipment }: { shipment: Envio }) {
  return (
    <aside className="min-w-0 rounded-2xl border border-slate-900 bg-white p-3 text-left">
      <p className="guide-wrap text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
      <div className="mt-2 grid gap-1.5 text-xs">
        <p className="guide-wrap"><span className="font-bold text-slate-500">Shipment:</span> {displayShipmentStatus(shipment.status)}</p>
        <p className="guide-wrap"><span className="font-bold text-slate-500">Label:</span> {displayRecordStatus(shipment.labelStatus)}</p>
        <p className="guide-wrap"><span className="font-bold text-slate-500">Payment:</span> {displayRecordStatus(shipment.paymentStatus)}</p>
      </div>
    </aside>
  );
}

function Barcode({ codeBlocks, trackingNumber }: { codeBlocks: string[]; trackingNumber: string }) {
  return (
    <section className="barcode-block min-w-0 border-y-2 border-slate-900 bg-white py-5 text-center print:py-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Barcode</p>
      <div className="mx-auto mt-4 flex h-24 w-full max-w-4xl min-w-0 items-end justify-center gap-0.5 bg-white px-3 py-2 print:h-20 print:max-w-none">
        {codeBlocks.map((width, index) => (
          <span key={index} className={`${width} h-full bg-slate-950`} />
        ))}
      </div>
      <p className="mt-3 text-lg font-black tracking-[0.16em] text-slate-950">{trackingNumber}</p>
    </section>
  );
}

function PricingBlock({ shipment }: { shipment: Envio }) {
  const hasPricingBreakdown =
    typeof shipment.paymentFee === "number" &&
    shipment.paymentFee > 0 &&
    typeof shipment.providerCost === "number";

  if (hasPricingBreakdown) {
    const rows: Array<[string, string]> = [
      ["Cash on delivery", shipment.cashOnDelivery ? "Yes" : "No"],
      ["Amount to collect", formatCurrency(shipment.cashAmount)],
      ["Shipping", formatCurrency(shipment.providerCost!)],
      ["ShipFlow service fee", formatCurrency(shipment.platformMarkup ?? 0)],
      ["Payment fee", formatCurrency(shipment.paymentFee!)],
      ["Total paid", formatCurrency(shipment.customerPrice ?? shipment.total ?? shipment.value)],
    ];
    return <InfoBlock title="Amounts" rows={rows} />;
  }

  return (
    <InfoBlock
      title="Amounts"
      rows={[
        ["Cash on delivery", shipment.cashOnDelivery ? "Yes" : "No"],
        ["Amount to collect", formatCurrency(shipment.cashAmount)],
        ["Total paid", formatCurrency(shipment.customerPrice ?? shipment.total ?? shipment.value)],
      ]}
    />
  );
}

function InfoBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left print:rounded-none print:border-slate-500 print:bg-white">
      <h2 className="guide-wrap text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</h2>
      <div className="mt-3 grid min-w-0 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid min-w-0 gap-1 text-left sm:grid-cols-[160px_minmax(0,1fr)] print:grid-cols-[130px_minmax(0,1fr)]">
            <span className="guide-wrap text-sm font-semibold text-slate-500">{label}</span>
            <span className="guide-wrap text-sm font-bold leading-6 text-slate-950">{value || "Not specified"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
