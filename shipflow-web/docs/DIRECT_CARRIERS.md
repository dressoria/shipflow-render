# SendiFlash — direct carrier integration (work in progress)

Branch: `feature/direct-carriers-ups-fedex-usps-20261118`

## What is implemented
- Server-only OAuth helper `lib/logistics/directCarriers/auth.ts` for UPS, FedEx and USPS.
- Sandbox is the default. Even with credentials, requests are disabled unless `ENABLE_DIRECT_CARRIER_API=true`.
- Tokens are cached in process memory until shortly before expiry; errors do not log secrets or provider response bodies.
- This is infrastructure only. **No carrier rating, label purchase, void, or tracking route is connected to this module yet.**
- **No approval to resell postage is implied by OAuth access.** Confirm commercial reseller/platform terms with each carrier.

## Required backend-only secrets

```dotenv
# Keep false until provider credentials have been approved, validated and tested.
ENABLE_DIRECT_CARRIER_API=false
DIRECT_CARRIER_ENV=sandbox

UPS_CLIENT_ID=
UPS_CLIENT_SECRET=
FEDEX_CLIENT_ID=
FEDEX_CLIENT_SECRET=
USPS_CLIENT_ID=
USPS_CLIENT_SECRET=
```

Never commit real values, add `NEXT_PUBLIC_` prefixes, or expose OAuth access tokens to clients.

## Provider onboarding
1. UPS: register an app in the UPS Developer Portal, link the eligible shipper account, request Rating / Shipping / Tracking products and explicit authorization for a shipping platform that sells labels to third-party customers.
2. FedEx: enroll as a compatible/integrator software provider, register the application and associate customer account(s) as instructed. Some integrator flows require child credentials and `csp_credentials` OAuth; the current helper implements only `client_credentials`, and must be extended for the approved setup before use.
3. USPS: register in USPS Developer Portal; obtain credentials, CRID / MID and USPS Ship payment setup as applicable. Confirm pricing/labels scopes and permission to offer commercial postage to others.

## Next implementation and release gates
- Implement and test **separate official carrier** rate adapters based on their current OpenAPI definitions; do not silently substitute intermediaries.
- Wire quote adapters into authenticated `/api/rates` through `RateAggregator` after schema tests.
- Implement label purchase and void only after confirming account billing, negotiated terms, idempotency, revalidation and refunds.
- Add sandbox integration tests with mocked HTTP responses; then test against the actual provider sandbox credentials.
- Never expose rates as live if the carrier is unconfigured; no hardcoded sample prices.
- Preserve `ENABLE_REAL_LABEL_PURCHASE=false` and `ENABLE_REAL_LABEL_VOID=false` in production until explicitly authorized.
- Run typecheck, lint, build and security review before merging. This branch has not been deployed.

## Official references
- UPS: https://developer.ups.com/get-started
- FedEx: https://developer.fedex.com/api/en-us/catalog/authorization/docs.html
- USPS: https://developers.usps.com/getting-started
- USPS samples: https://github.com/USPS/api-examples
