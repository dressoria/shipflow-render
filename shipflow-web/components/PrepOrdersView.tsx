"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { apiGetPrepOrders } from "@/lib/services/apiClient";
import { canPayPrepOrder, getPrepNextStep, getPrepPaymentStatusLabel, getPrepPaymentTone, getPrepStatusLabel, getPrepStatusTone } from "@/lib/prep";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/forms";
import type { PrepOrder } from "@/lib/types";

export function PrepOrdersView() {
  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetPrepOrders({ limit: 100 })
      .then((result) => setOrders(result.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "We could not load Prep orders."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-black text-slate-950">My Prep orders</h2>
          <p className="text-sm text-slate-500">Track SendiFlash-managed Amazon FBA prep requests.</p>
        </div>
        <Link href="/prep/new" className="rounded-2xl bg-[#F97316] px-4 py-2 text-sm font-black text-white">New request</Link>
      </div>
      {orders.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={ClipboardList} title="No Prep orders yet" description="Create a managed Prep request to start review." />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <Link key={order.id} href={`/prep/orders/${order.id}`} className="grid gap-3 p-4 transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_160px_160px_180px_130px_32px]">
              <div className="min-w-0">
                <p className="font-black text-slate-950">{order.productSummary}</p>
                <p className="text-sm text-slate-500">{order.totalUnits} units · {order.totalCartons} cartons · {order.businessName || "Business pending"}</p>
              </div>
              <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
              <Badge tone={getPrepPaymentTone(order.paymentStatus)}>
                {canPayPrepOrder(order) ? "Pay now" : getPrepPaymentStatusLabel(order.paymentStatus)}
              </Badge>
              <p className="text-sm font-bold text-slate-600">{getPrepNextStep(order.status, order.receivingReference)}</p>
              <div className="text-left xl:text-right">
                <p className="font-black text-slate-950">{formatCurrency(order.finalTotal ?? order.estimatedTotal ?? 0)}</p>
                <p className="text-xs font-bold text-slate-400">{formatDate(order.createdAt)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
