import { AdminCouriersManager } from "@/components/AdminCouriersManager";
import { AdminShell } from "@/components/AdminShell";

export default function AdminCouriersPage() {
  return (
    <AdminShell
      title="Couriers"
      description="Proveedores logísticos conectados o próximos."
    >
      <AdminCouriersManager />
    </AdminShell>
  );
}
