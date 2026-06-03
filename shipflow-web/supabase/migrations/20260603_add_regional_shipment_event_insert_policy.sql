-- FASE 5.77 — Ecuador beta request safety hardening
-- Purpose: allow customers to create the initial customer-visible event for their own Ecuador beta request.
-- Additive only. No data loss. No provider or payment changes.

create policy "regional_shipment_events: user create own customer-visible"
  on regional_shipment_events for insert
  with check (
    visibility = 'customer'
    and exists (
      select 1 from regional_shipments
      where regional_shipments.id = regional_shipment_events.regional_shipment_id
        and regional_shipments.user_id = auth.uid()
    )
  );
