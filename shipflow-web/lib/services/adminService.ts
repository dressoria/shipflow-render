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
  apiGetAdminLabelOrders,
  apiGetAdminLabelOrderById,
  apiAdminMarkLabelOrderActionRequired,
  apiAdminMarkLabelOrderRefundNeeded,
  apiAdminMarkLabelOrderExpired,
  apiAdminExpireStaleLabelOrders,
  apiAdminProcessLabelOrder,
  apiAdminRefundLabelOrder,
  apiAdminMarkLabelOrderRefundedManual,
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

// ── Label orders ──────────────────────────────────────────────────────────────

export async function getAdminLabelOrders(params?: Parameters<typeof apiGetAdminLabelOrders>[0]) {
  if (!isSupabaseConfigured) {
    return { orders: [], total: 0, limit: 50, offset: 0 };
  }
  return apiGetAdminLabelOrders(params);
}

export async function getAdminLabelOrderById(id: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Label orders require the secure admin API.");
  }
  return apiGetAdminLabelOrderById(id);
}

export async function markAdminLabelOrderActionRequired(id: string, reason: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Label order mutations require the secure admin API.");
  }
  return apiAdminMarkLabelOrderActionRequired(id, reason);
}

export async function markAdminLabelOrderRefundNeeded(id: string, reason: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Label order mutations require the secure admin API.");
  }
  return apiAdminMarkLabelOrderRefundNeeded(id, reason);
}

export async function markAdminLabelOrderExpired(id: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Label order mutations require the secure admin API.");
  }
  return apiAdminMarkLabelOrderExpired(id);
}

export async function expireStaleAdminLabelOrders() {
  if (!isSupabaseConfigured) {
    throw new Error("Label order expiry requires the secure admin API.");
  }
  return apiAdminExpireStaleLabelOrders();
}

export async function processAdminLabelOrder(
  id: string,
  opts?: { allowTestMode?: boolean },
) {
  if (!isSupabaseConfigured) {
    throw new Error("Label purchase requires the secure admin API.");
  }
  return apiAdminProcessLabelOrder(id, opts);
}

export async function refundAdminLabelOrder(
  id: string,
  body: { reason: string; confirmation: "REFUND" },
) {
  if (!isSupabaseConfigured) {
    throw new Error("Label payment refunds require the secure admin API.");
  }
  return apiAdminRefundLabelOrder(id, body);
}

export async function markAdminLabelOrderRefundedManual(id: string, reason: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Manual refund recording requires the secure admin API.");
  }
  return apiAdminMarkLabelOrderRefundedManual(id, reason);
}
