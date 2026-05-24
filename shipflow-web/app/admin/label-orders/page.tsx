import { AdminLabelOrdersView } from "@/components/AdminLabelOrdersView";
import { AdminShell } from "@/components/AdminShell";

export default function AdminLabelOrdersPage() {
  return (
    <AdminShell
      title="Label Orders"
      description="Direct-payment label orders — status tracking, manual triage, and expiry management."
    >
      <AdminLabelOrdersView />
    </AdminShell>
  );
}
