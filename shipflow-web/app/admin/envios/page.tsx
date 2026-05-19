import { AdminShipmentsView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminShipmentsPage() {
  return (
    <AdminShell
      title="Shipments"
      description="Read-only shipment, label, carrier, and payment support view."
    >
      <AdminShipmentsView />
    </AdminShell>
  );
}
