# Ecuador Provider Roadmap

Last updated: 2026-06-03 (FASE 5.78)

Purpose: staged roadmap for connecting Delivereo safely after credentials arrive, without prematurely activating Ecuador Shipping.

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
