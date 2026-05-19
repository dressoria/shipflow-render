"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/forms";
import { getBalanceSummary } from "@/lib/services/balanceService";
import type { BalanceTotals } from "@/lib/services/apiClient";
import type { MovimientoSaldo } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const EMPTY_TOTALS: BalanceTotals = {
  totalRecharged: 0,
  totalSpent: 0,
  totalRefunded: 0,
  totalAdjustments: 0,
  totalFees: 0,
};

function movementTone(movement: MovimientoSaldo) {
  if (movement.type === "refund" || movement.amount > 0) return "text-[#15803d]";
  return "text-slate-700";
}

export function BalancePanel() {
  const [balance, setLocalBalance] = useState(0);
  const [movements, setMovements] = useState<MovimientoSaldo[]>([]);
  const [totals, setTotals] = useState<BalanceTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [showRechargeNotice, setShowRechargeNotice] = useState(false);

  async function refresh() {
    const summary = await getBalanceSummary();
    setLocalBalance(summary.availableBalance);
    setMovements(summary.movements);
    setTotals(summary.totals);
  }

  useEffect(() => {
    window.setTimeout(() => {
      refresh().finally(() => setLoading(false));
    }, 0);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-3xl border border-pink-400/20 bg-slate-950 p-6 text-white shadow-2xl shadow-pink-950/20">
        <div className="flex items-center justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <CreditCard className="h-6 w-6 text-[#22C55E]" />
          </span>
          <Badge tone="green">Operational</Badge>
        </div>
        <p className="mt-8 text-sm text-slate-300">Available balance</p>
        <p className="mt-2 text-5xl font-black">
          {loading ? "—" : formatCurrency(balance)}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use this balance for carrier labels and account activity.
        </p>
        <button
          type="button"
          onClick={() => setShowRechargeNotice(true)}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          Add funds
        </button>
        {showRechargeNotice ? (
          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-slate-200">
            Online balance recharge is not available yet. Please contact support to add funds during beta.
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-center text-xs font-semibold text-slate-300">
            Online recharge is not available yet.
          </p>
        )}
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total recharged</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {loading ? "—" : formatCurrency(totals.totalRecharged)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total spent</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {loading ? "—" : formatCurrency(totals.totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total refunded</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {loading ? "—" : formatCurrency(totals.totalRefunded)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Adjustments</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {loading ? "—" : formatCurrency(totals.totalAdjustments)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-black text-slate-950">Balance activity</h2>
            <Badge tone="blue">{movements.length} movements</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-slate-500">No balance activity yet.</p>
            ) : (
              movements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="font-bold text-slate-950">{movement.concept}</p>
                    <p className="text-sm text-slate-500">{formatDate(movement.date)}</p>
                  </div>
                  <p className={`font-black ${movementTone(movement)}`}>
                    {formatCurrency(movement.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
