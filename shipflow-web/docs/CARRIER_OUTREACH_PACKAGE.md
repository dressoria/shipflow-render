# SendiFlash — carrier onboarding package (prepared, NOT SENT)

Company / brand: **SendiFlash** — https://sendiflash.com/
Product: US domestic multi-carrier rate comparison and postage-label purchasing for independent online sellers / small businesses.
Technical platform: Next.js + TypeScript server endpoints; secure OAuth credential storage; sandbox-first integration; production purchase guards initially disabled.

> Fill legal entity name, US business address, business website owner/contact, expected monthly volume, projected carrier mix, billing method and business registration details accurately before sending. Never invent volume, discounts, account numbers, or legal status.

## UPS — platform distribution inquiry

**Subject:** SendiFlash — direct UPS API access and third-party shipping platform eligibility

Hello UPS API/Business Development team,

We operate SendiFlash (https://sendiflash.com/), an online shipping software platform serving customers who need to compare shipping rates, buy postage labels, and track domestic US shipments.

We would like a direct integration with UPS (OAuth, Rating, Shipping, Tracking and Void where eligible), without an intermediary shipping-label aggregator.

Could you confirm:
1. Which integration/partner agreement authorizes SendiFlash to buy and resell UPS shipment labels to customers who do not have their own UPS accounts?
2. Whether a UPS billing/shipper account, approved third-party billing arrangement, or UPS Digital Access Program / UPS Ready relationship is required.
3. How negotiated pricing, rate displays, transaction fees, charge adjustments, and invoice reconciliation are handled.
4. Sandbox access, certification/production approval steps, production API scope and webhooks.
5. The appropriate account manager or partner onboarding contact.

We can share business registration, projected shipment volume, and technical specifications during onboarding.

Kind regards,
SendiFlash Team
[Authorized contact information]

Official portal: https://developer.ups.com/

## FedEx — compatible/integrator provider onboarding

**Subject:** SendiFlash — FedEx Integrator/Compatible provider enrollment and direct API commercial access

Hello FedEx Developer / Compatible team,

SendiFlash (https://sendiflash.com/) is a US domestic multi-carrier shipping application for small businesses. We are preparing direct FedEx OAuth, Rates and Transit Times, Ship, Tracking, and Cancellation API integration.

We need to confirm the commercial arrangement that would permit our customers to purchase labels via SendiFlash, including customers without their own FedEx accounts.

Please advise on:
1. Provider/Integrator enrollment and software certification requirements.
2. Parent/child credentials or CSP authorization flow if relevant.
3. Direct account billing vs customer-carrier-account billing and whether third-party postage resale is permitted.
4. Rate negotiation/discount visibility, reconciliation, adjustments and invoice settlement.
5. Sandbox credentials, developer tests, API approval, and production activation.

Please direct us to the appropriate partnership or integration onboarding representative.

Kind regards,
SendiFlash Team
[Authorized contact information]

Official portal: https://developer.fedex.com/

## USPS — platform integrator and USPS Ship

**Subject:** SendiFlash — USPS API platform integration, label resale eligibility, USPS Ship and EPS enrollment

Hello USPS API Platform team,

SendiFlash (https://sendiflash.com/) is building a domestic shipping platform allowing small-business customers to compare USPS rates, purchase shipping labels and track shipments directly within our website.

We would like direct USPS API access including OAuth 3, Domestic Prices, Addresses, Shipping Options, Domestic Labels, Tracking, Refund/Void functionality as available.

Please confirm:
1. Requirements to qualify as a third-party postage-platform integrator and to offer USPS labels to customers without their own USPS accounts.
2. USPS Ship enrollment, CRID/MID and Enterprise Payment Account (EPS/EPA) requirements.
3. API product entitlements, TEM testing, label certification/approval, production launch steps and usage limits.
4. Applicable commercial pricing, rate-display obligations, payment settlement, refunds and reconciliation.
5. Whether USPS Connect eCommerce or another platform commercial program is appropriate.

We can provide business registration and forecast volumes upon request.

Kind regards,
SendiFlash Team
[Authorized contact information]

Official portal: https://developers.usps.com/

## Credentials and approval checklist

- [ ] Legal entity/authorized signatory confirmed.
- [ ] UPS account and commercial platform/reseller permissions granted.
- [ ] FedEx Compatible / Integrator status and billing arrangements approved.
- [ ] USPS Ship enrollment and EPS payment account configured.
- [ ] Sandbox OAuth client credentials saved ONLY as secret environment variables.
- [ ] Approved API products for quote, label, tracking, cancel/refund.
- [ ] Sandbox quotes match carrier portal/service conditions and rate currency.
- [ ] End-to-end label tests: idempotency, actual charge, generated PDF, tracking, invoice, void/refund.
- [ ] No production labels until live rates and shipping charges are legally and technically approved.
- [ ] PR checks green, peer review, staging validation, then explicit deployment authorization.

This package prepares communication. **No external company has been contacted** and no accounts have been enrolled yet.
