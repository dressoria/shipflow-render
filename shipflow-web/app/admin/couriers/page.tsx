import { AdminCouriersView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminCouriersPage() {
  return (
    <AdminShell
      title="Couriers"
      description="Read-only courier catalog for support visibility."
    >
      <AdminCouriersView />
    </AdminShell>
  );
}
