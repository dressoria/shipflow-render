import { AdminShipmentsView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminShipmentsPage() {
  return (
    <AdminShell
      title="Shipments"
      description="All labels created inside the platform."
    >
      <AdminShipmentsView />
    </AdminShell>
  );
}
