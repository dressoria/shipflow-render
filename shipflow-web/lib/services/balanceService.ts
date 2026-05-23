import { isSupabaseConfigured } from "@/lib/supabase";
import {
  addBalanceMovement,
  getBalance,
  getBalanceMovements as getLocalBalanceMovements,
  setBalance,
} from "@/lib/storage";
import { apiGetBalance, type BalanceData, type BalanceMovement } from "@/lib/services/apiClient";
import { isDemoAuthEnabled } from "@/lib/services/legacyAuthCleanup";
import type { MovimientoSaldo } from "@/lib/types";

function fromApiMovement(m: BalanceMovement): MovimientoSaldo {
  let concept = m.concept;

  if (m.type === "debit" || (m.amount < 0 && /shipping|label|shipment/i.test(m.concept))) {
    concept = "Carrier label purchase";
  } else if (m.type === "refund" || (m.amount > 0 && /void|refund/i.test(m.concept))) {
    concept = "Carrier label void refund";
  } else if (m.type === "recharge") {
    concept = /test|manual/i.test(m.concept) ? "Test balance top-up" : "Payment recharge";
  } else if (m.type === "adjustment") {
    concept = "Manual adjustment";
  } else if (m.type === "fee") {
    concept = "Service fee";
  }

  return {
    id: m.id,
    userId: m.userId,
    concept,
    amount: m.amount,
    date: m.date,
    type: m.type,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    shipmentId: m.shipmentId,
  };
}

function fromApiBalanceData(data: BalanceData): BalanceData {
  return {
    ...data,
    balance: data.balance ?? data.availableBalance ?? 0,
    availableBalance: data.availableBalance ?? data.balance ?? 0,
    movements: (data.movements ?? data.recentMovements ?? []).map(fromApiMovement),
    recentMovements: (data.recentMovements ?? data.movements ?? []).map(fromApiMovement),
    totals: data.totals ?? {
      totalRecharged: 0,
      totalSpent: 0,
      totalRefunded: 0,
      totalAdjustments: 0,
      totalFees: 0,
    },
  };
}

const EMPTY_BALANCE_DATA: BalanceData = {
  balance: 0,
  availableBalance: 0,
  currency: "USD",
  totals: { totalRecharged: 0, totalSpent: 0, totalRefunded: 0, totalAdjustments: 0, totalFees: 0 },
  movements: [],
  recentMovements: [],
};

export async function getAvailableBalance(): Promise<number> {
  if (isSupabaseConfigured) {
    const data = await apiGetBalance();
    return data.availableBalance ?? data.balance;
  }

  if (!isDemoAuthEnabled()) return 0;
  return getBalance();
}

export async function getBalanceSummary(): Promise<BalanceData> {
  if (isSupabaseConfigured) {
    const data = await apiGetBalance();
    return fromApiBalanceData(data);
  }

  if (!isDemoAuthEnabled()) return EMPTY_BALANCE_DATA;

  const movements = getLocalBalanceMovements();
  const balance = getBalance();
  return {
    balance,
    availableBalance: balance,
    currency: "USD",
    totals: {
      totalRecharged: movements.reduce((sum, movement) => sum + (movement.amount > 0 ? movement.amount : 0), 0),
      totalSpent: movements.reduce((sum, movement) => sum + (movement.amount < 0 ? Math.abs(movement.amount) : 0), 0),
      totalRefunded: 0,
      totalAdjustments: 0,
      totalFees: 0,
    },
    movements,
    recentMovements: movements,
  };
}

export async function getBalanceMovements(): Promise<MovimientoSaldo[]> {
  if (isSupabaseConfigured) {
    const data = await apiGetBalance();
    return data.recentMovements.map(fromApiMovement);
  }

  if (!isDemoAuthEnabled()) return [];
  return getLocalBalanceMovements();
}

export async function addBalance(amount: number, concept = "Test balance top-up"): Promise<MovimientoSaldo> {
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
