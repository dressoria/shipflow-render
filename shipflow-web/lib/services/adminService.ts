import { couriers } from "@/data/site";
import { getUsers } from "@/lib/services/authService";
import { getBalanceMovements } from "@/lib/services/balanceService";
import { getShipments } from "@/lib/services/shipmentService";

export async function getAdminStats() {
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
  };
}
