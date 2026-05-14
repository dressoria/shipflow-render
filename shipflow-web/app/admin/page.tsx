import { AdminOverview } from "@/components/AdminOverview";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell
      title="Dashboard Admin"
      description="Métricas generales, últimos envíos y usuarios registrados."
    >
      <AdminOverview />
    </AdminShell>
  );
}
