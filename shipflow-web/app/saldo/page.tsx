import { BalancePanel } from "@/components/BalancePanel";
import { DashboardShell } from "@/components/DashboardShell";

export default function BalancePage() {
  return (
    <DashboardShell
      title="Balance"
      description="Revisa tu saldo disponible y los movimientos de tu cuenta."
    >
      <BalancePanel />
    </DashboardShell>
  );
}
