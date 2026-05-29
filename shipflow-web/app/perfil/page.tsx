import { DashboardShell } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";

export default function ProfilePage() {
  return (
    <DashboardShell
      title="Profile"
      description="Manage your account, business details, and shipping preferences."
    >
      <ProfileSettings />
    </DashboardShell>
  );
}
