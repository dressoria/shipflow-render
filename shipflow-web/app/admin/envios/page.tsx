import { AdminShipmentsView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminShipmentsPage() {
  return (
    <AdminShell
      title="Envíos"
      description="Todas las guías creadas dentro de la plataforma."
    >
      <AdminShipmentsView />
    </AdminShell>
  );
}
