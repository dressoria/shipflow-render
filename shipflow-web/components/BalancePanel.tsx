"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, X } from "lucide-react";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/forms";
import { getBalanceSummary } from "@/lib/services/balanceService";
import { apiCreateCheckoutSession, apiGetConfigStatus, type BalanceTotals } from "@/lib/services/apiClient";
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
  const [stripeRechargeConfigured, setStripeRechargeConfigured] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [checkoutLoadingAmount, setCheckoutLoadingAmount] = useState<number | null>(null);
  const [rechargeMessage, setRechargeMessage] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

    apiGetConfigStatus()
      .then((status) => setStripeRechargeConfigured(Boolean(status.stripeRechargeConfigured)))
      .catch(() => setStripeRechargeConfigured(false));

    const params = new URLSearchParams(window.location.search);
    const recharge = params.get("recharge");
    if (recharge === "success") {
      window.setTimeout(() => setRechargeMessage("Payment received. Your balance will update once confirmed."), 0);
    } else if (recharge === "canceled") {
      window.setTimeout(() => setRechargeMessage("Payment canceled. No funds were added."), 0);
    }
  }, []);

  async function startCheckout(amount: number) {
    setCheckoutError(null);
    setCheckoutLoadingAmount(amount);
    try {
      const { checkoutUrl } = await apiCreateCheckoutSession(amount);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Online recharge is not available yet.");
      setCheckoutLoadingAmount(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-pink-400/20 bg-slate-950 p-5 text-white shadow-2xl shadow-pink-950/20 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <CreditCard className="h-6 w-6 text-[#22C55E]" />
          </span>
          <Badge tone="green">Operational</Badge>
        </div>
        <p className="mt-8 text-sm text-slate-300">Available balance</p>
        <p className="mt-2 break-words text-4xl font-black sm:text-5xl">
          {loading ? "—" : formatCurrency(balance)}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use this balance for carrier labels and account activity.
        </p>
        <button
          type="button"
          onClick={() => {
            setCheckoutError(null);
            setShowRechargeModal(true);
          }}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          Add funds
        </button>
        {rechargeMessage ? (
          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-slate-200">
            {rechargeMessage}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-center text-xs font-semibold text-slate-300">
            Funds are added after payment confirmation from Stripe.
          </p>
        )}
      </div>

      {showRechargeModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/30 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Balance recharge</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Add funds</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                disabled={checkoutLoadingAmount != null}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close add funds modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Funds are added after payment confirmation from Stripe.
            </p>

            {stripeRechargeConfigured ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => startCheckout(amount)}
                    disabled={checkoutLoadingAmount != null}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-950 transition hover:border-[#22C55E] hover:bg-[#ECFDF5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutLoadingAmount === amount ? "Loading..." : formatCurrency(amount)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">
                Online recharge is not available yet.
              </div>
            )}

            {checkoutError ? (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {checkoutError}
              </div>
            ) : null}

            {stripeRechargeConfigured ? (
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Continue to secure checkout by choosing an amount.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6">
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

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
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
                <div key={movement.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{movement.concept}</p>
                    <p className="text-sm text-slate-500">{formatDate(movement.date)}</p>
                  </div>
                  <p className={`shrink-0 font-black ${movementTone(movement)}`}>
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
