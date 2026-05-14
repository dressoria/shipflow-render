import { AdminBalanceView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminBalancePage() {
  return (
    <AdminShell
      title="Saldo"
      description="Movimientos de recarga y consumo registrados."
    >
      <AdminBalanceView />
    </AdminShell>
  );
}
