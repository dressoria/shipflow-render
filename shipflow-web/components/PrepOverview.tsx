"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, PackageCheck, ShieldCheck, Warehouse } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { apiGetPrepOrders } from "@/lib/services/apiClient";
import { getPrepStatusLabel, getPrepStatusTone } from "@/lib/prep";
import { formatCurrency } from "@/lib/utils";
import type { PrepOrder } from "@/lib/types";

export function PrepOverview() {
  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPrepOrders({ limit: 3 })
      .then((result) => setOrders(result.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-slate-950/5">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <Badge tone="blue">SendiFlash Prep</Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Managed Amazon FBA prep, handled through SendiFlash.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Prep, label, bundle, inspect, and forward your inventory to Amazon FBA with a manual SendiFlash review before final quote.
              Services may be performed by SendiFlash or logistics partners.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/prep/new" variant="action" icon={<ClipboardList className="h-4 w-4" />}>
                Create prep request
              </Button>
              <Button href="/prep/orders" variant="secondary" icon={<Warehouse className="h-4 w-4" />}>
                My prep orders
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Estimated from</p>
            <p className="mt-3 text-4xl font-black text-slate-950">$0.65<span className="text-base text-slate-500">/unit</span></p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Final quote may vary after warehouse review. Optional services such as poly bagging, bubble wrap, bundling, kitting,
              storage, and case forwarding are quoted after review.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Request review", "Submit products, units, cartons, services, and notes."],
          ["SendiFlash coordinates", "Admin reviews your request and tracks operational updates."],
          ["Track status", "Follow customer-visible milestones from review through completion."],
        ].map(([title, copy], index) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
              {index === 0 ? <ClipboardList className="h-5 w-5" /> : index === 1 ? <ShieldCheck className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
            </span>
            <h3 className="mt-4 font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="font-black text-slate-950">Recent Prep orders</h3>
            <p className="text-sm text-slate-500">Manual-managed requests stay visible inside SendiFlash.</p>
          </div>
          <Link href="/prep/orders" className="inline-flex items-center gap-1 text-sm font-black text-[#2563EB]">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="p-5"><LoadingState /></div>
        ) : orders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <Link key={order.id} href={`/prep/orders/${order.id}`} className="grid gap-3 p-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_140px_120px]">
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{order.productSummary}</p>
                  <p className="text-sm text-slate-500">{order.totalUnits} units · {order.totalCartons} cartons</p>
                </div>
                <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
                <p className="font-black text-slate-950 md:text-right">{formatCurrency(order.estimatedTotal ?? 0)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-600">No Prep requests yet. Create your first request to start a managed review.</div>
        )}
      </section>
    </div>
  );
}
