import { AdminShell } from "@/components/AdminShell";
import { AdminEcuadorShipmentDetail } from "@/components/AdminEcuadorShipmentDetail";

export default async function AdminEcuadorShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell
      title="Ecuador Shipment Detail"
      description="Detalle interno de una solicitud Ecuador beta, sin llamadas reales a proveedor."
    >
      <AdminEcuadorShipmentDetail id={id} />
    </AdminShell>
  );
}
