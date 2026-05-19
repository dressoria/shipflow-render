import { couriers } from "@/data/site";
import { getUsers } from "@/lib/services/authService";
import { getBalanceMovements } from "@/lib/services/balanceService";
import { getShipments } from "@/lib/services/shipmentService";
import {
  apiCreateAdminBalanceAdjustment,
  apiGetAdminBalanceMovements,
  apiGetAdminAuditEvents,
  apiGetAdminOverview,
  apiGetAdminShipments,
  type AdminBalanceAdjustmentBody,
} from "@/lib/services/apiClient";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function getAdminStats() {
  if (isSupabaseConfigured) {
    const overview = await apiGetAdminOverview();
    return {
      ...overview,
      couriers,
      totalUsers: overview.totals.totalUsers,
      totalShipments: overview.totals.totalShipments,
      pendingShipments: overview.shipments.filter((shipment) => shipment.status === "Pendiente").length,
      totalRecharged: overview.totals.totalRecharged,
    };
  }

  const [users, shipments, movements] = await Promise.all([
    getUsers(),
    getShipments(),
    getBalanceMovements(),
  ]);

  return {
    users,
    shipments,
    movements,
    couriers,
    totalUsers: users.length,
    totalShipments: shipments.length,
    pendingShipments: shipments.filter((shipment) => shipment.status === "Pendiente").length,
    totalRecharged: movements
      .filter((movement) => movement.amount > 0)
      .reduce((sum, movement) => sum + movement.amount, 0),
    totals: {
      totalUsers: users.length,
      totalShipments: shipments.length,
      labelsPurchased: shipments.filter((shipment) => shipment.labelStatus === "purchased").length,
      labelsVoided: shipments.filter((shipment) => shipment.labelStatus === "voided").length,
      totalRecharged: movements
        .filter((movement) => movement.type === "recharge" || (movement.amount > 0 && movement.type !== "refund"))
        .reduce((sum, movement) => sum + movement.amount, 0),
      totalLabelSpend: movements
        .filter((movement) => movement.amount < 0)
        .reduce((sum, movement) => sum + Math.abs(movement.amount), 0),
      totalRefunded: movements
        .filter((movement) => movement.type === "refund")
        .reduce((sum, movement) => sum + movement.amount, 0),
    },
    reconciliation: {
      pendingCount: 0,
      notes: ["Reconciliation queue is not implemented yet."],
    },
    auditEvents: [],
  };
}

export async function getAdminShipments() {
  if (isSupabaseConfigured) {
    const data = await apiGetAdminShipments({ limit: 100 });
    return data.shipments;
  }

  return getShipments();
}

export async function getAdminBalanceMovements() {
  if (isSupabaseConfigured) {
    const data = await apiGetAdminBalanceMovements({ limit: 100 });
    return data.movements;
  }

  return getBalanceMovements();
}

export async function getAdminAuditEvents() {
  if (isSupabaseConfigured) {
    const data = await apiGetAdminAuditEvents({ limit: 100 });
    return data.events;
  }

  return [];
}

export async function createAdminBalanceAdjustment(body: AdminBalanceAdjustmentBody) {
  if (!isSupabaseConfigured) {
    throw new Error("Manual adjustments require the secure admin API.");
  }

  return apiCreateAdminBalanceAdjustment(body);
}
