# Ecuador Shipping Architecture

Last updated: 2026-06-03 (FASE 5.73)

Purpose: architecture proposal for adding Ecuador Shipping to the existing SendiFlash platform without creating a separate product, login, or codebase.

This document is planning only. It does not create routes, APIs, providers, database tables, or payment integrations.

## Platform position

SendiFlash Ecuador should be part of the same platform:

- same user account
- same login
- same auth session
- same dashboard shell
- same support/admin posture
- same brand and legal pages

But it should remain operationally separated from the current Shipping Labels stack:

- separate Ecuador module
- separate provider adapter layer
- separate payment provider later
- separate status mapping
- separate data model from the current USA/selected-markets labels flow

Recommended principle:

- one platform, multiple logistics modules

## Why not a separate project

Reasons to keep Ecuador inside the same platform:

- avoids fragmented user identities
- avoids duplicate onboarding and support flows
- allows one account to use USA Shipping Labels, Ecuador Shipping, and FBA Prep
- keeps future regional switching consistent
- reduces duplicated admin, analytics, and profile work

## Recommended route plan

Documented-only future routes:

- `/ecuador`
- `/ecuador/crear-envio`
- `/ecuador/envios`
- `/ecuador/envios/[id]`
- `/api/ecuador/rates`
- `/api/ecuador/orders`
- `/api/ecuador/orders/[id]`
- `/api/ecuador/tracking`

Intent of each route:

- `/ecuador`: marketing, onboarding, service explanation, regional selector entry
- `/ecuador/crear-envio`: future Ecuador shipment quote/create experience
- `/ecuador/envios`: signed-in user Ecuador shipment list
- `/ecuador/envios/[id]`: shipment detail and tracking state
- `/api/ecuador/rates`: quote or calculate flow
- `/api/ecuador/orders`: create Ecuador order
- `/api/ecuador/orders/[id]`: detail lookup, safe refresh, possible cancellation hook later
- `/api/ecuador/tracking`: normalized tracking/status endpoint

## Module boundaries

### Existing module

Current Shipping Labels should remain responsible for:

- current label purchase logic
- current ShipEngine/ShipStation provider flow
- Stripe-based label checkout
- existing shipment table behavior

### New Ecuador module

Future Ecuador module should own:

- Ecuador-specific quote payloads
- Ecuador provider auth
- Ecuador city/coverage rules
- Ecuador-specific order lifecycle
- Ecuador status normalization
- Ecuador payment flow later

Recommended directory direction:

- `app/ecuador/*`
- `app/api/ecuador/*`
- `lib/logistics/ecuador/*`
- `lib/ecuador/*` if shared non-provider helpers become necessary

## Adapter design proposal

Suggested provider file:

- `lib/logistics/ecuador/providers/delivereo.ts`

Suggested interface:

```ts
export type EcuadorQuoteInput = {
  market: "EC";
  language: "es" | "en";
  city: string;
  category: "SMALL" | "MEDIUM" | "LARGE";
  origin: {
    name?: string;
    phone?: string;
    addressLine?: string;
    fullAddress?: string;
    reference?: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    phone?: string;
    addressLine?: string;
    fullAddress?: string;
    reference?: string;
    lat: number;
    lng: number;
  };
  itemsValue?: number;
  packageDescription?: string;
};

export type EcuadorCreateInput = EcuadorQuoteInput & {
  idempotencyKey: string;
  paymentMode: "manual" | "wallet" | "ecuador_gateway";
  externalOrderReference: string;
  scheduledAt?: string;
};

export interface EcuadorProviderAdapter {
  quoteEcuadorShipment(input: EcuadorQuoteInput): Promise<NormalizedEcuadorQuoteResult>;
  createEcuadorShipment(input: EcuadorCreateInput): Promise<NormalizedEcuadorCreateResult>;
  getEcuadorTracking(providerOrderId: string): Promise<NormalizedEcuadorTrackingResult>;
  cancelEcuadorShipment(providerOrderId: string): Promise<NormalizedEcuadorCancelResult>;
  normalizeDelivereoStatus(status: string): NormalizedEcuadorShipmentStatus;
  mapDelivereoError(error: unknown): Error;
}
```

Recommended normalized SendiFlash status values:

- `draft`
- `quoted`
- `created`
- `scheduled`
- `awaiting_confirmation`
- `assigned`
- `picked_up`
- `in_transit`
- `delivered`
- `delivery_failed`
- `canceled`
- `exception`

Suggested status normalization from documented Delivereo values:

- `CREATED` -> `created`
- `SCHEDULED` -> `scheduled`
- `SCHEDULE_CONFIRMATION` -> `awaiting_confirmation`
- `AWAITING_CONFIRMATION` -> `awaiting_confirmation`
- `MANUAL_ASSIGN` -> `assigned`
- `GOING_FIRST_POSITION` -> `assigned`
- `ARRIVED_FIRST_POSITION` -> `picked_up`
- `IN_TRANSIT` -> `in_transit`
- `GOING_LAST_POSITION` -> `in_transit`
- `ARRIVED_LAST_POSITION` -> `delivered`
- `FINISHED` -> `delivered`
- `CANCELED` -> `canceled`
- `NO_DRIVER_FOUND` -> `exception`
- all other unknown statuses -> `exception`

Recommended implementation note:

- Keep raw provider status alongside normalized status in storage for auditability.

## Provider-specific payload mapping

### Quote mapping

SendiFlash input should map into Delivereo calculate payload with:

- `cityType` from selected Ecuador city
- `categoryType` from size bucket
- `lang` from user or regional mode
- `points[]` from origin/destination coordinates
- `addresses[]` when street-level address strings are available

### Create mapping

SendiFlash should not expose raw provider payloads to the frontend.

Backend mapping should translate:

- sender/recipient identities
- reference text
- delivery notes
- order value
- payment mode
- coordinates
- scheduling

into one Delivereo booking create shape selected for the approved MVP flow.

### Tracking mapping

Provider response fields to preserve:

- `bookingId`
- `bookingStatus`
- `bookingStatusName`
- `publicGuid`
- `publicUrl`
- `driver*`
- point timestamps
- `fare`
- `totalAmount`
- `itemsPrice`

## Normalized SendiFlash response shapes

Suggested quote result:

```ts
export type NormalizedEcuadorQuoteResult = {
  provider: "delivereo";
  market: "EC";
  serviceType: "ecuador_delivery";
  providerQuoteId?: string | null;
  providerRawStatus?: string | null;
  city: string;
  currency: "USD";
  providerCost: number;
  customerPrice: number;
  estimatedTime?: string | null;
  estimatedDistance?: number | null;
  taxes?: number | null;
  metadata?: Record<string, unknown>;
};
```

Suggested create result:

```ts
export type NormalizedEcuadorCreateResult = {
  provider: "delivereo";
  market: "EC";
  serviceType: "ecuador_delivery";
  providerOrderId: string;
  providerTrackingId?: string | null;
  normalizedStatus: NormalizedEcuadorShipmentStatus;
  providerStatus: string;
  publicTrackingUrl?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};
```

Suggested tracking result:

```ts
export type NormalizedEcuadorTrackingResult = {
  provider: "delivereo";
  market: "EC";
  providerOrderId: string;
  normalizedStatus: NormalizedEcuadorShipmentStatus;
  providerStatus: string;
  providerStatusLabel?: string | null;
  publicTrackingUrl?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  delivered: boolean;
  events: Array<{
    code: string;
    label: string;
    at?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
};
```

## Retry and idempotency approach

The Delivereo Swagger spec does not document idempotency keys.

Recommended SendiFlash approach:

- Generate an internal idempotency key for every create attempt.
- Persist the key with the Ecuador shipment/order record before provider create call.
- Prevent duplicate provider create calls from the UI.
- Treat provider retry as an admin/system action, not an automatic blind retry.
- If Delivereo later confirms native idempotency support, pass the internal key through.

Recommended retry policy:

- Quote requests: safe short retry on transient timeout only
- Create requests: no automatic repeat after uncertain response
- Detail/tracking requests: safe retry with backoff
- Cancel requests: no blind repeat unless provider contract is explicit

## Logging and audit approach

Recommended logging behavior:

- log internal request ID
- log authenticated user ID
- log provider name
- log market `EC`
- log normalized action: `quote`, `create`, `track`, `cancel`
- log provider booking ID if available
- log latency
- log normalized outcome

Do not log:

- API secrets
- raw auth tokens
- full personal data unless already part of protected audit policy

Recommended audit events:

- `ecuador_quote_requested`
- `ecuador_quote_failed`
- `ecuador_order_created`
- `ecuador_order_create_failed`
- `ecuador_tracking_refreshed`
- `ecuador_order_cancel_requested`
- `ecuador_order_canceled`
- `ecuador_provider_exception`

## Safe timeout strategy

Initial proposal:

- login/token calls: 8s timeout
- quote calls: 10s timeout
- create calls: 15s timeout
- tracking/detail calls: 8s timeout
- cancel calls: 10s timeout

Behavior:

- fail closed on auth issues
- return user-safe messages on provider timeouts
- keep raw provider details for admin diagnostics only

## Database architecture options

Do not add migration yet. This is a design proposal only.

### Option A: `ecuador_shipments`

Possible fields:

- `id`
- `user_id`
- `provider`
- `provider_order_id`
- `provider_tracking_id`
- `status`
- `provider_status`
- `origin_name`
- `origin_phone`
- `origin_address`
- `origin_city`
- `destination_name`
- `destination_phone`
- `destination_address`
- `destination_city`
- `package_description`
- `package_weight`
- `package_dimensions`
- `declared_value`
- `provider_cost`
- `customer_price`
- `margin`
- `payment_status`
- `payment_provider`
- `created_at`
- `updated_at`
- `metadata`

Pros:

- simplest mental model for first Ecuador launch
- keeps Ecuador isolated from current shipment logic
- easier to ship without touching current `shipments` assumptions

Cons:

- future expansion to other regional markets may require another table split
- shared cross-market reporting becomes more complex

### Option B: `regional_shipments` with `market='EC'`

Possible fields:

- all of the above
- plus `market`
- plus `service_type`

Pros:

- better long-term fit if SendiFlash expands beyond Ecuador
- one regional data model for non-label localized services
- easier reporting across future markets

Cons:

- slightly heavier naming and abstraction upfront
- more design work before first implementation

### Recommendation

Recommend Option B:

- `regional_shipments`
- `regional_shipment_events`

Reason:

- It preserves separation from the current Shipping Labels shipment model while avoiding an Ecuador-only corner that may be regretted if SendiFlash later adds other regional delivery products.

Important boundary:

- Do not merge the first Ecuador MVP directly into the current `shipments` table that powers current label purchase logic.

### Suggested events table

`regional_shipment_events` fields:

- `id`
- `shipment_id`
- `provider`
- `provider_status`
- `normalized_status`
- `event_type`
- `event_at`
- `message`
- `metadata`
- `created_at`

## Ecuador payment architecture

Payment strategy should remain separate from the current Shipping Labels flow.

Rules:

- Keep Stripe separate for the current Shipping Labels flow.
- Add Ecuador payment provider separately later.
- Do not mix Stripe USA label payments with Ecuador gateway payments.
- Treat Ecuador payment as its own module and reconciliation path.

Future Ecuador order fields should include:

- `market = EC`
- `service_type = ecuador_delivery`
- `payment_provider = ecuador_gateway | wallet | manual`
- `payment_status`

Recommended sequencing:

1. provider login and quote
2. provider order creation MVP
3. tracking/status stabilization
4. Ecuador payment gateway integration

## Geo and regional behavior

Future regional mode should guide, not trap, the user.

Proposed behavior:

- If IP appears Ecuador:
  - public home can suggest Ecuador Shipping first
  - language can default to Spanish
  - dashboard can default to Ecuador mode

Rules:

- never block by IP
- always allow manual switch
- always keep Shipping Labels and FBA Prep reachable

Suggested future manual switches:

- Ecuador Shipping
- USA Shipping Labels
- FBA Prep Early Access

Suggested preference persistence:

- localStorage first
- profile metadata later

## Phased roadmap

### FASE 5.74 — Ecuador regional mode foundation

- region selector
- Ecuador vs USA experience framing
- Spanish-first Ecuador copy
- still coming soon
- no Delivereo real orders

### FASE 5.75 — Delivereo adapter MVP

- auth/login
- quote
- create order
- detail/tracking polling
- sandbox or tightly controlled test mode if available
- no public launch

### FASE 5.76 — Ecuador payment gateway integration

- Ecuador payment provider wiring
- payment status model
- reconciliation events
- no mixing with current Stripe label flow

### FASE 5.77 — Ecuador customer and admin operations

- Ecuador shipment list/detail UI
- support/admin visibility
- retry/exception workflow
- reporting basics

### FASE 5.78 — Controlled beta launch

- allowlisted users only
- monitored rollout
- no public promise beyond confirmed coverage and capabilities

## Recommended architecture conclusion

- Keep Ecuador Shipping inside the same SendiFlash platform.
- Keep it separate from current Shipping Labels logic at the module, adapter, and data-model layers.
- Build around a provider adapter plus normalized regional shipment model.
- Delay payment integration until provider quote/create/tracking behavior is stable.
- Require Delivereo clarification on sandbox, auth header format, booking mode, and webhook support before implementation starts.
