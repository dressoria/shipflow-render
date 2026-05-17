import { AdminUsersView } from "@/components/AdminDataViews";
import { AdminShell } from "@/components/AdminShell";

export default function AdminUsersPage() {
  return (
    <AdminShell
      title="Users"
      description="Registered profiles and assigned roles."
    >
      <AdminUsersView />
    </AdminShell>
  );
}
