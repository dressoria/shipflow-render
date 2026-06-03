import { DashboardShell } from "@/components/DashboardShell";
import { EcuadorShipmentDetail } from "@/components/EcuadorShipmentDetail";

export default async function EcuadorShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      title="Detalle de envío Ecuador"
      description="Detalle seguro para cliente de una solicitud Ecuador en preparación beta."
    >
      <EcuadorShipmentDetail id={id} />
    </DashboardShell>
  );
}
