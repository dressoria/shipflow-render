import { BalancePanel } from "@/components/BalancePanel";
import { DashboardShell } from "@/components/DashboardShell";

export default function BalancePage() {
  return (
    <DashboardShell
      title="Balance"
      description="Review available balance and account activity."
    >
      <BalancePanel />
    </DashboardShell>
  );
}
