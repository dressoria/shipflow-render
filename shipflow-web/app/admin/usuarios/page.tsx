import { AdminUsersView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminUsersPage() {
  return (
    <AdminShell
      title="Usuarios"
      description="Perfiles registrados y rol asignado."
    >
      <AdminUsersView />
    </AdminShell>
  );
}
