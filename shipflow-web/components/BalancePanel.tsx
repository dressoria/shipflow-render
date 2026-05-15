"use client";

import { useEffect, useState } from "react";
import { CreditCard, PlusCircle } from "lucide-react";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/forms";
import { addBalance, getAvailableBalance, getBalanceMovements } from "@/lib/services/balanceService";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { MovimientoSaldo } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function BalancePanel() {
  const [balance, setLocalBalance] = useState(0);
  const [movements, setMovements] = useState<MovimientoSaldo[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [nextBalance, nextMovements] = await Promise.all([
      getAvailableBalance(),
      getBalanceMovements(),
    ]);
    setLocalBalance(nextBalance);
    setMovements(nextMovements);
  }

  useEffect(() => {
    window.setTimeout(() => {
      refresh().finally(() => setLoading(false));
    }, 0);
  }, []);

  async function recharge() {
    await addBalance(25);
    await refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-3xl border border-pink-400/20 bg-slate-950 p-6 text-white shadow-2xl shadow-pink-950/20">
        <div className="flex items-center justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <CreditCard className="h-6 w-6 text-[#22C55E]" />
          </span>
          <Badge tone="green">{isSupabaseConfigured ? "Backend activo" : "Demo local"}</Badge>
        </div>
        <p className="mt-8 text-sm text-slate-300">Saldo disponible</p>
        <p className="mt-2 text-5xl font-black">
          {loading ? "—" : formatCurrency(balance)}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use this balance to pay for generated labels, shipment activity, and account movements.
        </p>
        {isSupabaseConfigured ? (
          <p className="mt-7 rounded-2xl bg-white/10 px-4 py-3 text-center text-xs font-semibold text-slate-300">
            Recharges must be done through the admin panel or payment flow.
          </p>
        ) : (
          <button
            type="button"
            onClick={recharge}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Recargar saldo (demo)
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-black text-slate-950">Historial de movimientos</h2>
          <Badge tone="blue">{movements.length} movimientos</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-slate-500">No hay movimientos registrados.</p>
          ) : (
            movements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-slate-950">{movement.concept}</p>
                  <p className="text-sm text-slate-500">{formatDate(movement.date)}</p>
                </div>
                <p className={movement.amount > 0 ? "font-black text-[#15803d]" : "font-black text-slate-700"}>
                  {formatCurrency(movement.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
