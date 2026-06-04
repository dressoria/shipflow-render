# Delivereo Integration Plan

Last updated: 2026-06-04 (FASE 5.87)

Purpose: technical discovery for a future Ecuador Shipping integration using Delivereo as the first potential provider.

This document is investigatory only. It does not authorize implementation, credential setup, public launch, payment activation, or database changes.

## FASE 5.87 provider-auth note

The codebase now includes:

- Business API login aligned to Swagger (`/api/protected/login/business`)
- business-bookings `calculate` payload mapping
- safe auth/calculate error staging
- multicourier framework support with Delivereo plus placeholder adapters

Current blocker:

- Delivereo still returns `401` for the currently available account/API key combination.
- SendiFlash is now waiting on provider confirmation for API key/email/RUC permissions before continuing Delivereo activation work.

Platform decision:

- Keep Delivereo as a real adapter prepared but pending activation.
- Continue Ecuador Shipping as a multicourier platform layer with placeholder adapters for other providers until real integrations are approved.

## FASE 5.81 quote-calculation note

The codebase now includes:

- server-side Delivereo quote calculation through `POST /api/ecuador/providers/delivereo/quote`
- payload mapping from Ecuador beta-request fields into Delivereo `business-bookings/calculate`
- normalized beta quote response for customer-safe UI display
- Ecuador request-form integration that clearly says no charge and no real order

This phase still does not create bookings, does not create provider orders, does not charge the customer, and does not activate Ecuador Shipping publicly.

## FASE 5.79 auth-validation note

The codebase now includes:

- server-only Delivereo config reader
- login client for `business-user` auth
- documented token-renewal helper
- admin-only endpoint `POST /api/admin/ecuador/providers/delivereo/test-auth`
- diagnostics UI for safe auth validation

This phase validates authentication only. It does not create bookings, does not call quote/create/tracking endpoints, and never exposes tokens or passwords in the UI.

## FASE 5.76 beta-flow note

The codebase now also includes a controlled Ecuador beta request data flow:

- additive regional shipment migration
- customer request APIs and pages
- admin review/update APIs and pages
- customer/internal event separation

This still does not change the Delivereo conclusion: the current Ecuador flow stores internal beta requests only and makes no Delivereo network calls.

## FASE 5.77 hardening note

The Ecuador beta request flow was hardened further with:

- stronger customer/admin validation
- customer-safe field separation polish
- additive RLS correction for initial customer-visible event creation
- manual QA checklist coverage

This still does not introduce Delivereo credentials, Delivereo calls, or any payment behavior.

## FASE 5.75 skeleton note

The codebase now includes a safe Ecuador MVP skeleton around this plan:

- customer placeholder routes
- admin placeholder routes
- isolated Ecuador TypeScript models
- provider interface
- mock/no-op provider with no network calls

This does not change the Delivereo conclusion: real provider integration, credentials, schema, and payment work are still pending future phases.

## API overview

Source reviewed:

- `https://delivereo.com/swagger-ui/`
- `https://delivereo.com/v2/api-docs`
- `https://delivereo.com/`

Observed API shape:

- Spec format: Swagger 2.0
- Document title: `Delivereo REST API`
- Version: `1.0.0`
- Host: `delivereo.com`
- Base path: `/`
- Swagger resource discovery: `https://delivereo.com/swagger-resources`
- API docs endpoint: `https://delivereo.com/v2/api-docs`

Environment observations:

- The public Swagger UI is served from production domain paths.
- The spec does not document a separate sandbox host.
- The spec does not declare `schemes`; `https` is inferred from the live Swagger/UI host.

Inference:

- Until Delivereo confirms a test environment, SendiFlash should assume production-hosted API documentation with unknown sandbox availability.

## Authentication method

Documented security definition:

- Security scheme name: `JWT`
- Type: `apiKey`
- Header name: `Authorization`
- Header location: `header`

Observed auth-related endpoints:

- `POST /api/protected/login/business`
- `POST /api/protected/login/business-user`
- `POST /api/protected/token-renewal/business`
- `POST /api/protected/token-renewal/business-user`

Business login payload requires:

- `apiKey`
- `email`
- `lang`
- `ruc`

Business user login payload requires:

- `email`
- `password`
- `lang`

Observed auth responses include:

- `jwtToken`
- business or business-user identifiers
- status/message/code fields

Suggested integration assumption:

- Prefer the business API login flow for SendiFlash platform-to-platform integration if Delivereo issues an API key plus business identity.
- Use JWT bearer-style header formatting only after Delivereo confirms the exact `Authorization` value format, because the Swagger spec names the header but does not explicitly show whether the token is sent as raw JWT or `Bearer <token>`.

## Endpoint inventory

### Authentication

- `POST /api/protected/login/business`
- `POST /api/protected/login/business-user`
- `POST /api/protected/token-renewal/business`
- `POST /api/protected/token-renewal/business-user`

### Quote / rate discovery

- `POST /api/private/business-bookings/calculate`

### Order / shipment creation

- `POST /api/private/business-bookings/create`
- `POST /api/private/business-bookings/create-domicile`
- `POST /api/private/business-bookings/create-domicile-transfer`
- `POST /api/private/business-bookings/create-domiciles-from-file-json`
- `POST /api/private/business-bookings/create-verifications`
- `POST /api/private/business-bookings/create-verifications-from-file-json`
- `POST /api/private/business-bookings/create-single-verifications-from-file-json`

### Tracking / detail / operational follow-up

- `POST /api/private/business-bookings/detail-full`
- `POST /api/private/business-bookings/detail-order`
- `POST /api/private/business-bookings/retry`
- `POST /api/private/business-bookings/rate-driver`

### Cancellation

- `POST /api/private/business-bookings/cancel`

## Main request and response payloads

### 1. Business login

Endpoint:

- `POST /api/protected/login/business`

Required fields:

- `apiKey`
- `email`
- `lang`
- `ruc`

Observed response fields:

- `jwtToken`
- `id`
- `businessName`
- `email`
- `ruc`
- `countryCode`
- `mobileNumber`
- `walletBalance`
- `status`
- `message`
- `code`

### 2. Quote / calculate

Endpoint:

- `POST /api/private/business-bookings/calculate`

Current SendiFlash usage in FASE 5.81:

- server-side only
- authenticated with existing Delivereo login helper
- address-based payload mapping
- same-city supported-city beta calculation only
- quote result shown as estimate only
- no writeback to provider, no booking side effect

Required fields:

- `categoryType`: `SMALL | MEDIUM | LARGE`
- `cityType`: enum of supported Ecuador cities
- `lang`

Optional/conditional structures:

- `addresses[]`
- `points[]`

Observed address fields for calculate:

- `addressCrossingStreet`
- `addressMainStreet`
- `addressOrder`
- `countryCode`
- `fullAddress`

Observed point fields for calculate:

- `pointLatitude`
- `pointLongitude`
- `pointOrder`
- `bookingPointType`: `PICK_UP | DROP_OFF`
- `chargeMessage`

Observed quote response fields:

- `farePrice`
- `itemsPrice`
- `iva`
- `ivaPercentage`
- `totalAmount`
- `totalDistance`
- `estimatedTime`
- `numberOfTrackingMessages`
- `trackingMessageIndividualPrice`
- `status`
- `message`
- `code`

### 3. Generic booking create

Endpoint:

- `POST /api/private/business-bookings/create`

Required top-level fields:

- `bookingImage`
- `categoryType`
- `cityType`
- `description`
- `extraInstructions`
- `itemsPrice`
- `lang`
- `maxSuggestedTime`
- `order`

Optional top-level fields:

- `addresses[]`
- `points[]`
- `scheduledDate`
- `bookingBusinessInvoiceDataId`
- `bookingBusinessUserEmail`

Observed create-address fields:

- `address`
- `addressCrossingStreet`
- `addressMainStreet`
- `addressOrder`
- `countryCode`
- `fullAddress`
- `phone`
- `reference`
- `senderRecipientName`

Observed create-point fields:

- `address`
- `bookingPointType`
- `phone`
- `pointLatitude`
- `pointLongitude`
- `pointOrder`
- `reference`
- `senderRecipientName`
- `chargeMessage`

Observed nested order fields:

- `paymentMode`
- `orderItems[]`
- `orderIva`
- `orderSubTotal`
- `orderTotal`
- `orderGuid` optional

Observed order item fields:

- `orderItemDescription`
- `orderItemGuid`
- `orderItemName`
- `orderItemPriceTotal`
- `quantity`
- `unitIva`
- `unitSubTotal`
- `unitTotal`

Observed create response:

- `bookingId`
- `status`
- `message`
- `code`

### 4. Domicile / pharmacy-style booking create

Endpoint:

- `POST /api/private/business-bookings/create-domicile`

Required fields include:

- `businessBranchNamesToTransfer`
- `businessFirstBranchName`
- `businessUserEmail`
- `clientAddress`
- `clientFullName`
- `clientPaymentMode`
- `countryCode`
- `lang`
- `orderReference`
- `pointLatitude`
- `pointLongitude`

Observed optional fields include:

- `additionalClients`
- `additionalOrderType`
- `clientExtraDetails`
- `clientMobileNumber`
- `clientPersonalId`
- `clientReference`
- `clientSector`
- `googleAddress`
- `inTransit`
- `needConfirmation`
- `orderExtraDetails`
- `orderTotalPrice`
- `scheduleConfirmation`
- `scheduledDate`
- `vipClient`

Observed payment-related enum values:

- `AGREEMENT`
- `CASH`
- `CHECK`
- `CREDIT_CARD`
- `INSURANCE`
- `MIXED`
- `NONE`
- `POST_PAYMENT`
- `WALLET`
- `WEB_PAYMENT_CREDIT_CARD`

Observation:

- The API exposes payment mode values, but the spec does not document settlement flow, COD remittance, or payment callback/webhook behavior.

### 5. Domicile transfer booking create

Endpoint:

- `POST /api/private/business-bookings/create-domicile-transfer`

Required fields:

- `businessBranchNamesToTransfer`
- `businessUserEmail`
- `countryCode`
- `lang`
- `orderReference`

Optional fields:

- `additionalOrderType`
- `businessBranchesDetails`
- `optimizeHubs`
- `scheduledDate`

### 6. Detail / tracking-style lookups

Endpoints:

- `POST /api/private/business-bookings/detail-full`
- `POST /api/private/business-bookings/detail-order`

Lookup payloads:

- By booking ID: `bookingId`, `lang`
- By order number: `bookingOrderNumber`, `lang`

Observed detail response fields:

- `bookingId`
- `bookingStatus`
- `bookingStatusName`
- `description`
- `fare`
- `itemsPrice`
- `iva`
- `totalAmount`
- `totalDuration`
- `publicGuid`
- `publicUrl`
- `packageHasBeenDelivered`
- `driverEmail`
- `driverFirstName`
- `driverLastName`
- `driverMobileNumber`
- `driverRegistrationNumber`
- `driverTransport`
- `firstPointAddress`
- `lastPointAddress`
- `firstPointArrivalTime`
- `lastPointArrivalTime`
- `extraPoints[]`
- `orderReference[]`

Observed booking statuses:

- `CREATED`
- `AWAITING_CONFIRMATION`
- `SCHEDULED`
- `SCHEDULE_CONFIRMATION`
- `MANUAL_ASSIGN`
- `GROUPING`
- `GOING_FIRST_POSITION`
- `ARRIVED_FIRST_POSITION`
- `GOING_OTHER_POSITION`
- `ARRIVED_OTHER_POSITION`
- `GOING_LAST_POSITION`
- `ARRIVED_LAST_POSITION`
- `IN_TRANSIT`
- `TRANSFERRING_TO`
- `CITY_TRANSFER`
- `ARRIVED_DISTRIBUTION_CENTER`
- `NO_DRIVER_FOUND`
- `CANCELED`
- `FINISHED`
- `RATING`

### 7. Cancellation

Endpoint:

- `POST /api/private/business-bookings/cancel`

Required fields:

- `bookingId`
- `cancelFeedback`
- `cancelReason`
- `lang`

Observed cancel reasons:

- `BETTER_OPTION`
- `LOST`
- `NOT_NEEDED_ANYMORE`
- `OTHER`
- `TOO_MUCH_DELAY`

### 8. Retry

Endpoint:

- `POST /api/private/business-bookings/retry`

Required fields:

- `bookingId`
- `lang`

## Required fields summary for a SendiFlash MVP

For login:

- `apiKey`
- `email`
- `ruc`
- `lang`

For quote:

- `cityType`
- `categoryType`
- `lang`
- either sufficient `addresses[]` and/or `points[]` according to Delivereo booking type rules

For create:

- booking classification fields
- sender/recipient identity
- address and/or geolocation data
- order pricing/payment-mode data
- reference fields

Important observation:

- Delivereo relies heavily on Ecuador-specific city enums and geocoordinates.
- A SendiFlash Ecuador UI should assume latitude/longitude capture is first-class, not optional frosting.

## Optional fields worth preserving in SendiFlash mapping

- `scheduledDate`
- `bookingBusinessUserEmail`
- `bookingBusinessInvoiceDataId`
- `googleAddress`
- `clientExtraDetails`
- `clientReference`
- `clientSector`
- `needConfirmation`
- `scheduleConfirmation`
- `orderGuid`
- `vipClient`
- `inTransit`
- `optimizeHubs`

## Missing or unclear fields

The Swagger spec leaves several integration-critical details unclear:

- Exact `Authorization` header format after login
- Whether there is a sandbox or test environment
- Whether there are published rate limits
- Whether webhooks or callbacks exist
- Whether idempotency keys are supported
- Whether booking updates can be pushed instead of polled
- Whether booking images are mandatory in all practical booking types
- Whether `maxSuggestedTime` is truly optional despite being listed in `required`
- Which create endpoint should be considered the standard last-mile Ecuador ecommerce flow
- Whether `detail-order` expects merchant order reference or Delivereo order number semantics
- Whether `publicUrl` is suitable for customer-facing tracking
- Whether cancellation is allowed after assignment or in-transit status
- How retries behave operationally and whether they can duplicate charges/dispatches
- Whether payment modes imply actual collection/remittance handling or are informational only

## Integration risks

### 1. Ambiguous booking model

The API exposes multiple creation modes:

- generic create
- domicile create
- domicile transfer create
- verification flows

Risk:

- SendiFlash could choose the wrong creation flow for the intended Ecuador ecommerce MVP without Delivereo confirmation.

### 2. No documented sandbox

Risk:

- Early integration testing may require production-like credentials or tightly controlled live calls unless Delivereo provides a separate test environment.

### 3. No documented webhook support

Risk:

- Initial tracking may need polling instead of event-driven updates.

### 4. Status mapping complexity

Risk:

- Delivereo status values are richer than the current SendiFlash shipping-label status model, so naive mapping would lose operational meaning.

### 5. Payment ambiguity

Risk:

- Payment-related fields exist in booking payloads, but settlement responsibilities and reconciliation behavior are undocumented.

### 6. Location specificity

Risk:

- Accurate Ecuador city selection plus lat/lng capture may be required for acceptable quoting and dispatch.

### 7. Required image field

Risk:

- `bookingImage` as a required field in generic create could complicate a clean ecommerce checkout experience unless a blank/default pattern is supported.

## Questions to ask Delivereo before coding

### Environment and auth

1. Do you provide sandbox or staging credentials?
2. Is the production base URL the same as the Swagger host?
3. Should `Authorization` be sent as raw JWT or `Bearer <token>`?
4. Which login flow should a partner platform use: business or business-user?
5. How long do JWTs last, and what is the token renewal policy?

### Booking flow

6. Which create endpoint is recommended for ecommerce last-mile deliveries from a partner platform?
7. Is `bookingImage` truly required in production usage?
8. Is `maxSuggestedTime` really mandatory for standard create requests?
9. For quote requests, what is the minimum valid combination of addresses vs points?
10. Which fields are mandatory for same-day local deliveries versus scheduled deliveries?

### Coverage and operations

11. Is there a city, zone, or coverage endpoint that is not exposed in Swagger?
12. How should SendiFlash keep the supported city list up to date?
13. Are there service-level distinctions beyond `categoryType` and booking type?

### Tracking and lifecycle

14. Do you provide webhooks for booking status changes?
15. If not, what polling frequency is acceptable?
16. Is `publicUrl` intended for end-customer tracking?
17. Can bookings be canceled after driver assignment or in-transit?
18. Does `retry` create a new operational booking or requeue the same one?

### Payments and reconciliation

19. Which payment mode should be used when SendiFlash collects payment separately?
20. Does Delivereo support COD remittance, settlement reports, or collected-cash reconciliation?
21. Are there invoice, payout, or balance endpoints beyond what appears in Swagger?

### Platform safety

22. Are idempotency keys supported?
23. Are there published rate limits?
24. Are there bulk-upload or throughput recommendations for partner systems?
25. What timeout and retry behavior do you recommend on partner requests?

## Suggested first MVP scope

Recommended MVP for SendiFlash Ecuador:

1. Business login and token renewal
2. Quote/calculate flow
3. One creation path only, after Delivereo confirms the correct booking type
4. Polling-based booking detail/tracking
5. Cancellation only if operationally safe and clearly supported

Not recommended for first MVP:

- multi-create from file
- verification flows
- driver rating
- transfer-specific flows
- bulk imports
- wallet/payment reconciliation with Delivereo

## Suggested later phases

### Later phase 1

- Customer-facing tracking page using normalized provider detail
- Admin detail and retry visibility
- Safer status synchronization

### Later phase 2

- Bulk order ingestion
- Scheduled bookings
- Better Ecuador address/geo validation

### Later phase 3

- Payment gateway integration for Ecuador
- Reconciliation and settlement reporting
- Webhook handling, if Delivereo provides it

## Recommended SendiFlash stance before implementation

- Treat Delivereo as the first Ecuador provider candidate, not as a finalized dependency.
- Keep current SendiFlash Shipping Labels architecture isolated from Ecuador logic.
- Do not write production adapter code until sandbox/test and booking-mode questions are answered.
- Expect at least one credential-and-contract clarification round with Delivereo before any real coding phase.
