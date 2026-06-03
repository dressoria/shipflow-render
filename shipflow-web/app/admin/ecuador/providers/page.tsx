import { AdminEcuadorProvidersDiagnostics } from "@/components/AdminEcuadorProvidersDiagnostics";
import { AdminShell } from "@/components/AdminShell";

export default function AdminEcuadorProvidersPage() {
  return (
    <AdminShell
      title="Ecuador Providers"
      description="Provider diagnostics and sandbox-readiness foundation for Ecuador Shipping."
    >
      <AdminEcuadorProvidersDiagnostics />
    </AdminShell>
  );
}
