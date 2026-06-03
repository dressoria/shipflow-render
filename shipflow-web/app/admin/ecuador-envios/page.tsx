import { AdminShell } from "@/components/AdminShell";
import { AdminEcuadorShipmentsView } from "@/components/AdminEcuadorShipmentsView";

export default function AdminEcuadorShipmentsPage() {
  return (
    <AdminShell
      title="Ecuador Shipping"
      description="Panel interno para revisar solicitudes Ecuador beta sin crear órdenes reales."
    >
      <AdminEcuadorShipmentsView />
    </AdminShell>
  );
}
