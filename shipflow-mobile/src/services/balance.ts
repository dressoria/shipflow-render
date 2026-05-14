import type { BalanceMovement } from "../types";
import { supabase } from "./supabase";

type BalanceRow = {
  id: string;
  user_id?: string;
  concept: string;
  amount: number;
  created_at: string;
};

function fromRow(row: BalanceRow): BalanceMovement {
  return {
    id: row.id,
    userId: row.user_id,
    concept: row.concept,
    amount: Number(row.amount),
    date: row.created_at,
  };
}

export async function getBalanceMovements() {
  const { data, error } = await supabase
    .from("balance_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<BalanceRow[]>();

  if (error) throw error;
  return data.map(fromRow);
}

export async function getAvailableBalance() {
  const movements = await getBalanceMovements();
  return Number(movements.reduce((sum, movement) => sum + movement.amount, 0).toFixed(2));
}

export async function addBalance(amount: number, concept = "Recarga de saldo") {
  const { data, error } = await supabase
    .from("balance_movements")
    .insert({ id: `MOV-${Date.now()}`, concept, amount })
    .select()
    .single<BalanceRow>();

  if (error) throw error;
  return fromRow(data);
}
