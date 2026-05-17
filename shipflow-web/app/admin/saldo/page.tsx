import { AdminBalanceView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminBalancePage() {
  return (
    <AdminShell
      title="Balance"
      description="Registered top-up and usage activity."
    >
      <AdminBalanceView />
    </AdminShell>
  );
}
