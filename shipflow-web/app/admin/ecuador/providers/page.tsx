import { AdminEcuadorProvidersDiagnostics } from "@/components/AdminEcuadorProvidersDiagnostics";
import { AdminShell } from "@/components/AdminShell";
import { getEcuadorProviderDiagnosticsSnapshots } from "@/lib/server/delivereoAuth";

export default function AdminEcuadorProvidersPage() {
  const snapshots = getEcuadorProviderDiagnosticsSnapshots();

  return (
    <AdminShell
      title="Ecuador Providers"
      description="Provider diagnostics and sandbox-readiness foundation for Ecuador Shipping."
    >
      <AdminEcuadorProvidersDiagnostics initialSnapshots={snapshots} />
    </AdminShell>
  );
}
