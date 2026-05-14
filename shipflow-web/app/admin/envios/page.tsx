import { AdminShipmentsView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminShipmentsPage() {
  return (
    <AdminShell
      title="Envíos"
      description="All shipping labels created inside the platform."
    >
      <AdminShipmentsView />
    </AdminShell>
  );
}
