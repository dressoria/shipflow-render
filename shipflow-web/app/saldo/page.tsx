import { BalancePanel } from "@/components/BalancePanel";
import { DashboardShell } from "@/components/DashboardShell";

export default function BalancePage() {
  return (
    <DashboardShell
      title="Balance"
      description="Add balance to pay for generated labels and shipment activity."
    >
      <BalancePanel />
    </DashboardShell>
  );
}
