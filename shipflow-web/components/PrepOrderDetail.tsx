"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, PackageCheck } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { apiGetPrepOrder } from "@/lib/services/apiClient";
import { getPrepNextStep, getPrepStatusLabel, getPrepStatusTone, shouldShowReceivingReference } from "@/lib/prep";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/forms";
import type { PrepOrder } from "@/lib/types";

export function PrepOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<PrepOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetPrepOrder(id)
      .then((result) => setOrder(result.order))
      .catch((err) => setError(err instanceof Error ? err.message : "We could not load this Prep order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>;
  if (!order) return null;

  const nextStep = getPrepNextStep(order.status, order.receivingReference);
  const showReceiving = shouldShowReceivingReference(order.status) && Boolean(order.receivingReference);

  return (
    <div className="grid gap-5">
      <Link href="/prep/orders" className="inline-flex items-center gap-2 text-sm font-black text-[#2563EB]">
        <ArrowLeft className="h-4 w-4" /> Back to Prep orders
      </Link>

      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{order.productSummary}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Managed Amazon FBA prep service by SendiFlash. Services may be performed by SendiFlash or logistics partners.
            </p>
          </div>
          <div className="rounded-3xl bg-orange-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-orange-700">Quote</p>
            <p className="mt-2 text-sm font-bold text-slate-600">Estimated: {formatCurrency(order.estimatedTotal ?? 0)}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {order.finalTotal != null ? formatCurrency(order.finalTotal) : "Final quote pending"}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">Final quote may vary after review. No Prep payment is collected in this MVP.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Summary label="Units" value={String(order.totalUnits)} />
          <Summary label="Cartons" value={String(order.totalCartons)} />
          <Summary label="Created" value={formatDate(order.createdAt)} />
          <Summary label="Contact" value={order.contactName} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <Card title="Next step">
            <p className="text-sm leading-6 text-slate-700">{nextStep}</p>
            {showReceiving ? (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">Receiving reference</p>
                <p className="mt-2 font-black text-slate-950">{order.receivingReference}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use this SendiFlash receiving reference when coordinating inbound inventory. Partner details remain managed by SendiFlash.
                </p>
              </div>
            ) : null}
          </Card>

          <Card title="Items">
            <div className="grid gap-3">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{item.productName}</p>
                      <p className="text-sm text-slate-500">SKU {item.sku || "N/A"} · ASIN {item.asin || "N/A"}</p>
                    </div>
                    <p className="font-black text-slate-950">{item.units} units · {item.cartons} cartons</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.prepServices.map((service) => <Badge key={service} tone="orange">{service}</Badge>)}
                  </div>
                  {item.notes ? <p className="mt-3 text-sm text-slate-600">{item.notes}</p> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Customer-visible timeline">
            <div className="grid gap-3">
              {(order.events ?? []).length > 0 ? (order.events ?? []).map((event) => (
                <div key={event.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                    <PackageCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">{event.title}</p>
                    {event.message ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p> : null}
                    <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Customer-visible updates will appear here.</div>
              )}
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card title="Support">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
              <HelpCircle className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If a Prep order is under review or action is required, SendiFlash support will coordinate the next step.
            </p>
            <Link href="/support" className="mt-4 inline-flex text-sm font-black text-[#2563EB]">Open support guide</Link>
          </Card>
          <Card title="What stays private">
            <p className="text-sm leading-6 text-slate-600">
              Partner names, partner references, partner costs, margin, internal notes, and internal events are kept inside SendiFlash operations.
            </p>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
