import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  addBalanceMovement,
  getBalance,
  getBalanceMovements as getLocalBalanceMovements,
  setBalance,
} from "@/lib/storage";
import type { MovimientoSaldo } from "@/lib/types";

type BalanceMovementRow = {
  id: string;
  user_id?: string;
  concept: string;
  amount: number;
  created_at: string;
};

function fromRow(row: BalanceMovementRow): MovimientoSaldo {
  return {
    id: row.id,
    userId: row.user_id,
    concept: row.concept,
    amount: row.amount,
    date: row.created_at,
  };
}

export async function getAvailableBalance(): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const movements = await getBalanceMovements();
    return Number(movements.reduce((sum, movement) => sum + movement.amount, 0).toFixed(2));
  }

  return getBalance();
}

export async function addBalance(amount: number, concept = "Recarga de saldo"): Promise<MovimientoSaldo> {
  const movement: MovimientoSaldo = {
    id: `MOV-${Date.now()}`,
    concept,
    date: new Date().toISOString(),
    amount,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("balance_movements")
      .insert({
        id: movement.id,
        concept: movement.concept,
        amount: movement.amount,
      })
      .select()
      .single<BalanceMovementRow>();

    if (error) throw error;
    return fromRow(data);
  }

  setBalance(Number((getBalance() + amount).toFixed(2)));
  addBalanceMovement(movement);
  return movement;
}

export async function getBalanceMovements(): Promise<MovimientoSaldo[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("balance_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<BalanceMovementRow[]>();

    if (error) throw error;
    return data.map(fromRow);
  }

  return getLocalBalanceMovements();
}
