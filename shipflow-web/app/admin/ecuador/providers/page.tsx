import { AdminEcuadorProvidersDiagnostics } from "@/components/AdminEcuadorProvidersDiagnostics";
import { AdminShell } from "@/components/AdminShell";
import { getDelivereoAuthSnapshot } from "@/lib/server/delivereoAuth";

export default function AdminEcuadorProvidersPage() {
  const snapshot = getDelivereoAuthSnapshot();

  return (
    <AdminShell
      title="Ecuador Providers"
      description="Provider diagnostics and sandbox-readiness foundation for Ecuador Shipping."
    >
      <AdminEcuadorProvidersDiagnostics initialSnapshot={snapshot} />
    </AdminShell>
  );
}
