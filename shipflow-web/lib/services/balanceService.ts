import { isSupabaseConfigured } from "@/lib/supabase";
import {
  addBalanceMovement,
  getBalance,
  getBalanceMovements as getLocalBalanceMovements,
  setBalance,
} from "@/lib/storage";
import { apiGetBalance, type BalanceMovement } from "@/lib/services/apiClient";
import type { MovimientoSaldo } from "@/lib/types";

function fromApiMovement(m: BalanceMovement): MovimientoSaldo {
  return { id: m.id, concept: m.concept, amount: m.amount, date: m.date };
}

export async function getAvailableBalance(): Promise<number> {
  if (isSupabaseConfigured) {
    const data = await apiGetBalance();
    return data.balance;
  }

  return getBalance();
}

export async function getBalanceMovements(): Promise<MovimientoSaldo[]> {
  if (isSupabaseConfigured) {
    const data = await apiGetBalance();
    return data.recentMovements.map(fromApiMovement);
  }

  return getLocalBalanceMovements();
}

export async function addBalance(amount: number, concept = "Recarga de saldo"): Promise<MovimientoSaldo> {
  // Demo mode only — Supabase RLS blocks positive balance inserts from clients.
  const movement: MovimientoSaldo = {
    id: `MOV-${Date.now()}`,
    concept,
    date: new Date().toISOString(),
    amount,
  };

  setBalance(Number((getBalance() + amount).toFixed(2)));
  addBalanceMovement(movement);
  return movement;
}
