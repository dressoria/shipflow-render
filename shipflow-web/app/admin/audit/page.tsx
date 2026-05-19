import { AdminAuditView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminAuditPage() {
  return (
    <AdminShell
      title="Audit"
      description="Read-only reconciliation and operational audit events."
    >
      <AdminAuditView />
    </AdminShell>
  );
}
