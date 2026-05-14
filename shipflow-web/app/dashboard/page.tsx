import { DashboardOverview } from "@/components/DashboardOverview";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Resumen operativo con KPIs, envíos y saldo conectados a la base principal."
    >
      <DashboardOverview />
    </DashboardShell>
  );
}
