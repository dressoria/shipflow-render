# Ecuador Provider Roadmap

Last updated: 2026-06-04 (FASE 5.85B)

Purpose: staged roadmap for connecting Delivereo safely after credentials arrive, without prematurely activating Ecuador Shipping.

## UX checkpoint before provider activation

- Keep Ecuador customer experience Spanish-first and multicourier in presentation.
- Keep `Sin cobro`, `No crea orden real`, and `Cotización referencial` visible until real operations are explicitly enabled.
- Shared address-book persistence now lives in Supabase via `user_addresses`, but it remains operational support data only.
- Keep address-book UX focused on reuse/prefill; do not imply Ecuador shipping is live because addresses are account-synced.
- If autocomplete is not configured, prefer honest manual address UX over decorative non-interactive maps in the Ecuador quote flow.
- Do not expose provider-internal wording like `solo Delivereo` in customer-facing quote UI.

## Phase A

- Receive Delivereo credentials
- Confirm sandbox vs production base URL
- Validate auth shape
- Confirm timeout, retry, and header format
- Use admin-only auth test endpoint before any quote/create attempt
- Do not create bookings during auth validation

## Phase B

- Connect quote endpoint only
- Normalize quote response
- Keep create-shipment disabled
- Keep payments disabled
- Use customer-facing beta quote UI with explicit no-charge / no-order messaging

## Phase C

- Connect create-shipment endpoint
- Store provider order references
- Keep customer messaging in beta mode
- Do not launch publicly yet

## Phase D

- Connect tracking sync
- Normalize Delivereo tracking states
- Expose only safe customer-visible statuses/events

## Phase E

- Add Ecuador payment integration
- Define payment authorization and reconciliation model
- Keep provider order creation gated until payment and support flow are aligned

## Phase F

- Controlled beta launch
- Internal operator QA
- Support playbooks
- Incident/rollback checks

## Phase G

- Public launch
- Final provider monitoring
- Production credentials validation
- Public messaging and support readiness
