import { AdminOverview } from "@/components/AdminOverview";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell
      title="Admin Dashboard"
      description="Support operations, real beta metrics, and read-only reconciliation signals."
    >
      <AdminOverview />
    </AdminShell>
  );
}
