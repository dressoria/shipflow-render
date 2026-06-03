# Ecuador Beta QA Checklist

Last updated: 2026-06-03 (FASE 5.77)

Purpose: manual QA for the Ecuador beta request flow before any Delivereo or Ecuador payment work begins.

## Customer flow

1. Open `/ecuador/crear-envio` while signed out.
2. Confirm the app redirects to login or the normal authenticated guard flow.
3. Sign in as a verified normal user.
4. Open `/ecuador/crear-envio`.
5. Confirm the page says:
   - Envíos Ecuador está en preparación
   - Esta solicitud no crea un envío real todavía
   - No se realizará ningún cobro desde esta pantalla
6. Submit a beta request.
7. Confirm redirect to `/ecuador/envios/[id]`.
8. Open `/ecuador/envios`.
9. Confirm only that user's requests are listed.
10. Open the detail page and confirm customer-safe data only:
   - status
   - origin/destination
   - package info
   - customer notes
   - customer-visible events
11. Confirm the customer detail does not show:
   - provider order id
   - provider tracking id
   - provider status
   - provider cost
   - margin
   - admin notes
   - internal events

## Access isolation

1. Create a request as normal user A.
2. Sign in as normal user B.
3. Call `GET /api/ecuador/shipments/[id]` for user A's request.
4. Confirm user B gets `404` or equivalent non-access response.
5. Confirm user B cannot access `/admin/ecuador-envios`.

## Admin flow

1. Sign in as admin.
2. Open `/admin/ecuador-envios`.
3. Confirm the page clearly says:
   - Beta request
   - No provider call
   - No payment
   - Internal review only
4. Open one request detail page.
5. Confirm admin can see internal-only fields.
6. Update status and internal notes.
7. Add one customer event and one internal event.
8. Confirm no provider order is created and no payment is triggered.

## API safety

1. Try `POST /api/ecuador/shipments` with customer payload fields such as:
   - `provider_order_id`
   - `provider_cost`
   - `margin`
   - `admin_notes`
2. Confirm the API rejects the request with a friendly validation error.
3. Try setting `provider=delivereo` as customer.
4. Confirm the API rejects it.
5. Try setting arbitrary customer status such as `delivered`.
6. Confirm the API rejects it.

## RLS check

1. Confirm `regional_shipments` RLS is enabled.
2. Confirm `regional_shipment_events` RLS is enabled.
3. Confirm customer users can insert their own request row.
4. Confirm customer users can insert the initial customer-visible event for their own request.
5. Confirm customer users cannot read internal events.

## Non-goals that must remain true

- No Delivereo network calls
- No Ecuador payment flow
- No real provider order creation
- No Shipping Labels logic changes
- No wallet logic changes
- No Prep payment logic changes
