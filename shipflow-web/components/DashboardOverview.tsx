"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CircleDollarSign, HelpCircle, PackageCheck, PlusCircle, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/forms";
import { getAvailableBalance } from "@/lib/services/balanceService";
import { getShipments } from "@/lib/services/shipmentService";
import type { Envio } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

function displayStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

export function DashboardOverview() {
  const [shipments, setShipments] = useState<Envio[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.setTimeout(() => {
      Promise.all([getShipments(), getAvailableBalance()]).then(([nextShipments, nextBalance]) => {
        setShipments(nextShipments);
        setBalance(nextBalance);
        setLoading(false);
      });
    }, 250);
  }, []);

  const total = useMemo(
    () => shipments.reduce((sum, shipment) => sum + shipment.value, 0),
    [shipments],
  );
  const inTransit = shipments.filter((shipment) => shipment.status === "En tránsito").length;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingState />
        <LoadingState />
        <LoadingState />
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <div className="min-w-0">
            <Badge tone="blue">Controlled beta</Badge>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
              Welcome to SendiFlash
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create a domestic shipment, compare available rates, pay with wallet or card, and receive your label automatically after payment is confirmed.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href="/crear-guia" variant="action" icon={<PlusCircle className="h-4 w-4" />}>
                Create your first shipment
              </Button>
              <Button href="/saldo" variant="secondary" icon={<Wallet className="h-4 w-4" />}>
                Add wallet balance
              </Button>
              <Button href="/envios" variant="ghost" icon={<Truck className="h-4 w-4" />}>
                My Shipments
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">How beta shipping works</p>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                "Enter a domestic route in a supported country.",
                "Choose a carrier rate with clear pricing.",
                "Pay securely and let SendiFlash prepare the label.",
                "Download the label from My Shipments.",
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2563EB] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="text-slate-600">{step}</span>
                </div>
              ))}
            </div>
            <Link
              href="/support"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Beta help center
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Shipments created" value={shipments.length.toString()} detail="No comparison" icon={PackageCheck} />
        <StatCard label="Estimated cost" value={formatCurrency(total)} detail="Total" icon={CircleDollarSign} tone="green" />
        <StatCard label="In transit" value={inTransit.toString()} detail="Active shipments" icon={Truck} />
        <StatCard label="Balance" value={formatCurrency(balance)} detail="Available" icon={Activity} tone="green" />
      </div>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-black text-slate-950">Recent shipments</h2>
              <p className="text-sm text-slate-500">Recent shipment activity.</p>
            </div>
            <Badge tone="blue">Updated now</Badge>
          </div>
          {shipments.length > 0 ? (
            <>
            <div className="grid gap-3 p-4 sm:hidden">
              {shipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-slate-950">{shipment.trackingNumber}</p>
                      <p className="mt-1 text-sm text-slate-600">{shipment.recipientName}</p>
                      <p className="text-xs text-slate-400">{formatDate(shipment.date)}</p>
                    </div>
                    <Badge tone={statusTone[shipment.status]}>{displayStatus(shipment.status)}</Badge>
                  </div>
                  <p className="mt-3 font-bold text-slate-950">{formatCurrency(shipment.value)}</p>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <div className="grid min-w-[800px] grid-cols-[1fr_1.3fr_1.1fr_1fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                <span>Shipment</span>
                <span>Customer</span>
                <span>Date</span>
                <span>Status</span>
                <span>Value</span>
              </div>
              {shipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="grid min-w-[800px] grid-cols-[1fr_1.3fr_1.1fr_1fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                  <span className="font-black text-slate-950">{shipment.id}</span>
                  <span className="text-slate-600">{shipment.recipientName}</span>
                  <span className="text-slate-600">{formatDate(shipment.date)}</span>
                  <span>
                    <Badge tone={statusTone[shipment.status]}>{displayStatus(shipment.status)}</Badge>
                  </span>
                  <span className="font-bold text-slate-950">{formatCurrency(shipment.value)}</span>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={Truck}
                title="No shipments yet"
                description="Create your first shipment to see activity here."
              />
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-black text-slate-950">Need help shipping?</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Review beta support notes for labels under review, wallet/card payments, and domestic market availability.
                </p>
                <Link href="/support" className="mt-3 inline-flex text-sm font-black text-[#2563EB] hover:text-[#1D4ED8]">
                  Open support guide
                </Link>
              </div>
            </div>
          </div>
          <EmptyState
            icon={Truck}
            title="No open issues"
            description="Shipment updates and exceptions will appear here."
          />
        </div>
      </div>
    </>
  );
}
