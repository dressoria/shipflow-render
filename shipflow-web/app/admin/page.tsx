import { AdminOverview } from "@/components/AdminOverview";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell
      title="Admin Dashboard"
      description="General metrics, recent shipments, and registered users."
    >
      <AdminOverview />
    </AdminShell>
  );
}
