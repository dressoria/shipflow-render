import { AdminBalanceView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminBalancePage() {
  return (
    <AdminShell
      title="Balance"
      description="Read-only balance movements, refunds, and beta support activity."
    >
      <AdminBalanceView />
    </AdminShell>
  );
}
