# Staging QA Results

Last updated: 2026-05-31 (FASE 5.70 Prep beta access gate)

---

## FASE 5.70 — FBA Prep Beta Access Gate

Run timestamp: 2026-05-31 America/Guayaquil

Commit tested:

- Pending commit — Gate FBA Prep access for controlled beta launch

### Result

| Area | Result | Evidence / note |
| --- | --- | --- |
| Prep beta access | READY FOR QA | Active Prep access is centralized and limited to `131studio.ec@gmail.com` or admin accounts. |
| Customer Prep routes | READY FOR QA | `/prep`, `/prep/new`, `/prep/orders`, and `/prep/orders/[id]` show the active module only for allowed users; normal users see "SendiFlash Prep is in preparation." |
| Customer Prep APIs | READY FOR QA | Customer Prep APIs return `403` with a safe message for non-allowed users. |
| Public marketing | READY FOR QA | Homepage and `/fba-prep` keep Prep visible as early access / coming soon without implying public availability. |
| Shipping Labels | NOT CHANGED | Shipping label, wallet, automatic label processing, refund, void, and provider logic were not changed. |

### Manual QA checklist

- [ ] Sign in as `131studio.ec@gmail.com` and confirm `/prep/new`, `/prep/orders`, and Prep payment test paths remain available.
- [ ] Sign in as a normal user and confirm `/prep`, `/prep/new`, `/prep/orders`, and `/prep/orders/[id]` show the in-preparation page.
- [ ] Confirm normal user calls to `/api/prep-orders` and Prep payment endpoints return `403`.
- [ ] Confirm `/dashboard` shows Shipping Labels as available and FBA Prep as in preparation for normal users.
- [ ] Confirm `/fba-prep` public copy says early access / coming soon.

Final decision: READY FOR OPERATOR QA.

## FASE 5.55 — Production QA and Controlled Beta Release Checklist

Run timestamp: 2026-05-28 America/Guayaquil

Commit tested:

- `04db119` — Add pricing margin controls for labels

Important commits included in history:

- `c65ea8e` — Enable safe automatic label processing after payment
- `df37081` — Improve shipment and admin operating UX
- `6ab4e4a` — Add safe admin refund and void controls
- `55842bb` — Add wallet balance and ledger foundation
- `04db119` — Add pricing margin controls for labels

### Production config/status

Checked:

```text
https://sendiflash.com/api/config/status
```

Observed result:

| Flag / status | Result | Observed value |
| --- | --- | --- |
| `buildEnvOk` | PASS | `true` |
| `directLabelPaymentEnabled` | PASS | `true` |
| `realLabelPurchaseEnabled` | PASS | `true` |
| `processLabelInWebhookEnabled` | PASS | `true` |
| `labelVoidEnabled` | PASS | `false` |
| `labelPaymentRefundsEnabled` | PASS | `false` |
| `stripeRechargeEnabled` | PASS | `true` |
| `ratesConfigured` | PASS | `true` |
| `activeRateProviders` | PASS | `3` |
| `appUrlHost` | PASS | `sendiflash.com` |

### HTTP smoke checks

Unauthenticated HTTP smoke checks from Codex:

| Route | Result | Note |
| --- | --- | --- |
| `/` | PASS | HTTP 200 |
| `/login` | PASS | HTTP 200 |
| `/registro` | PASS | HTTP 200 |
| `/crear-guia` | PASS | HTTP 200 app shell |
| `/saldo` | PASS | HTTP 200 app shell |
| `/admin/label-orders` | PASS | HTTP 200 app shell; authorization is client/server-session dependent and requires browser QA |

### QA results by area

| Area | Result | Evidence / note |
| --- | --- | --- |
| Public landing and auth | PARTIAL | Public pages load by HTTP smoke. Login/signup/dashboard redirects require interactive browser session and test credentials. |
| Create guide flow | PARTIAL | Code path is present; interactive address/rate selection requires browser/user session. Pricing is server-backed by the current label checkout/rate flow. |
| Direct card payment flow | PARTIAL | Production flags are correct for automatic processing. A fresh Stripe Checkout payment was not run by Codex because it requires interactive browser/Stripe/Supabase access. |
| Wallet recharge flow | PARTIAL | `/saldo` shell loads and Stripe recharge is enabled. New recharge/payment/webhook credit test requires interactive Stripe flow. |
| Wallet label purchase flow | PARTIAL | Wallet foundation and UI are documented in FASE 5.53. Full debit/label purchase test requires authenticated browser and sufficient test balance. |
| My Shipments and shipment detail | PARTIAL | UX implemented and compiled; authenticated ownership, PDF link, and copy tracking need browser QA. |
| Admin exception panel | PARTIAL | UI and safeguards are implemented and compiled; admin/non-admin access and filters need browser QA with admin account. |
| Refund/void gated behavior | PASS BY CONFIG / PARTIAL UI | Config confirms `labelVoidEnabled=false` and `labelPaymentRefundsEnabled=false`; no refund/void executed. Admin disabled-state UI needs browser QA. |
| Pricing and margin controls | READY FOR QA | `04db119` is current HEAD. Full displayed price = charged/debited price validation requires new direct-card and wallet test orders. |
| Config and safety | PASS | Expected flags observed. No env files, secrets, migrations, refunds, or voids touched by this QA pass. |

### Bugs found / fixes applied

- No code blocker was found during local validation and public HTTP/config smoke checks.
- No feature fixes were applied in this phase.
- Documentation was updated to record controlled beta readiness status and remaining manual QA.

### Manual beta QA still required

Run with the allowlisted verified test user and admin account:

1. Create a new guide, get rates, and confirm rate cards show the final customer price.
2. Pay by Stripe test card and confirm automatic `label_purchased` without admin `Process label`.
3. Confirm `pending_label_orders.amount_cents` equals displayed/charged customer price.
4. Confirm shipment has tracking, label URL, provider cost, customer price, and margin fields.
5. Recharge wallet, confirm ledger credit once, and verify duplicate webhook does not double credit.
6. Buy a label with wallet balance, confirm server-computed debit and no negative balance.
7. Confirm `/envios` and `/guia/[tracking]` only show the signed-in user's shipments.
8. Confirm admin quick filters and disabled refund/void reasons in `/admin/label-orders`.

### Decision

**Final decision: PARTIAL / READY FOR CONTROLLED MANUAL BETA QA**

Reason: codebase, build, and production config are aligned for controlled beta; the remaining PASS criteria require live authenticated browser, Stripe Checkout, webhook, Supabase DB, and admin verification steps that were not executed from Codex in this phase. Refunds and voids remain disabled as intended.

---

## FASE 5.53 — Wallet Balance and Basic Ledger for SendiFlash

Run timestamp: 2026-05-28 America/Guayaquil

### Audit — what already existed

| Component | Status | Notes |
|---|---|---|
| `balance_movements` table | ✅ Exists | type enum: recharge, debit, refund, adjustment, fee |
| `payment_recharges` table | ✅ Exists | Stripe checkout session tracking, idempotent |
| `GET /api/balance` | ✅ Exists | Returns balance, movements, totals |
| `POST /api/billing/checkout-session` | ✅ Exists | Stripe Checkout for wallet recharge |
| Stripe webhook — wallet recharge | ✅ Exists | `handleWalletRechargeCompleted`, idempotent |
| `BalancePanel` component + `/saldo` page | ✅ Exists | User-facing wallet UI |
| Wallet label purchase via `/api/labels` | ✅ Exists | `create_label_shipment_transaction` RPC |
| Admin balance movements view | ✅ Exists | `/api/admin/balance-movements` |
| Admin balance adjustments | ✅ Exists | `/api/admin/balance-adjustments` |
| Idempotency on all balance operations | ✅ Exists | DB-level unique constraints |

### What was added in FASE 5.53

**ConfirmModal — explicit payment method selection**
- Now pre-fetches wallet balance when user is authenticated
- Refreshes balance when modal opens (fresh read before every purchase)
- Shows current wallet balance with sufficiency indicator
- "Pay with wallet" button: primary, enabled only when balance >= label price
- "Pay by card" button: secondary, shown when `directCardAvailable` flag is true
- "Add funds to wallet" link: shown when balance insufficient and no card option available
- Payment fee note: currently wallet debits `customerPrice` (includes payment fee); this can be optimized in a future phase

**BalancePanel — SendiFlash color palette**
- Updated from green/pink to blue/orange palette matching SendiFlash branding
- Recharge amount hover: blue (`#2563EB`) instead of green
- Badge: `blue` tone (real blue post Badge.tsx fix)

### Migration

No migration required. Existing `balance_movements` schema and `create_label_shipment_transaction` RPC already support wallet-based label purchases atomically. The `pending_label_orders` table is only used for Stripe-based direct payment; wallet payments go through `/api/labels` directly.

### Idempotency rules

| Operation | Idempotency mechanism |
|---|---|
| Wallet recharge | `stripe_event_id` unique on `payment_recharges`; `idempotency_key` on `balance_movements` |
| Wallet label purchase | `idempotencyKey` passed to `/api/labels`, propagated to `create_label_shipment_transaction` RPC as unique `idempotency_key` on `balance_movements` |
| Stripe checkout expiry/cancel | `stripe_checkout_session_id` unique on `payment_recharges` |
| Admin adjustments | `admin-adjustment:{key}` idempotency_key on `balance_movements` |

### Direct payment still intact

`POST /api/billing/label-checkout` is unchanged. Stripe webhook handlers are unchanged. Feature flags are unchanged. No env files were modified.

### Safety confirmations

- [x] No double debit on wallet label retry (idempotency_key propagated from client)
- [x] No negative balance (RPC validates balance >= amount before inserting debit)
- [x] Direct Stripe label payment still works (unchanged)
- [x] No env files changed
- [x] No secrets printed
- [x] No automatic refunds or voids enabled
- [x] No provider credential changes

### Build results

- lint: 0 errors, 6 pre-existing warnings (unrelated)
- tsc --noEmit: ✅ no errors
- npm run build: ✅ 41 routes compiled
- git diff --check: ✅ no whitespace errors

**Decision: FASE 5.53 READY FOR STAGING QA**

---

## FASE 5.52 — Manual Refunds and Voids for Admin Exception Handling

Run timestamp: 2026-05-28 America/Guayaquil

Scope: tighten manual admin exception controls for label voids and label-payment refunds. This phase does not enable automatic refunds or automatic voids.

### Existing code found

| Area | Existing implementation |
| --- | --- |
| Stripe refund endpoint | `POST /api/admin/label-orders/[id]/refund`, gated by `ENABLE_LABEL_PAYMENT_REFUNDS` and admin allowlist. |
| Manual refund recording | `POST /api/admin/label-orders/[id]/mark-refunded-manual`. |
| Refund helper | `lib/server/labelPaymentRefunds.ts` with Stripe idempotency key `label-refund-{order.id}`. |
| Provider void endpoint | `POST /api/labels/[id]/void`, now restricted to admin users. |
| Provider void helpers | ShipStation/ShipEngine adapter void helpers already exist. |
| Shipment label status | `shipments.label_status` supports `purchased`, `voided`, `refunded`, etc. |
| Pending order refund fields | `stripe_refund_id`, `refund_attempted_at`, `refunded_at`, and `refund_error_message` are already mapped. |

### Changes

- Direct Stripe refund validation now blocks orders that already have `label_id`, `shipment_id`, or `tracking_number`.
- Manual refunded recording now blocks orders that already have `label_id`, `shipment_id`, or `tracking_number`.
- Carrier void endpoint now requires admin access and service role; normal users no longer get a void control in My Shipments.
- Successful carrier voids persist a `metadata.label_void` record on the shipment with admin, provider status/message, timestamp, and refund marker.
- Admin label order detail now shows refund and void readiness panels with clear reasons when disabled by flags or state.
- Admin can only submit app refunds when the refund flag and admin feature gate are available.
- Admin can only submit carrier voids when the void flag and admin feature gate are available, and the order has a completed shipment/label/tracking record.

### Current flags

- `ENABLE_REAL_LABEL_VOID=false`: carrier voids remain disabled.
- `ENABLE_LABEL_PAYMENT_REFUNDS=false`: Stripe refunds remain disabled.
- No refund or void was executed by Codex.

### Safety

- No automatic refund after provider failure.
- No automatic void after provider failure.
- No double refund: refunded/refund_pending statuses are blocked, and Stripe idempotency remains `label-refund-{order.id}`.
- No direct refund when payment is incomplete, missing a payment intent, already refunded, or has label/shipment/tracking data.
- No double void: already-voided labels return idempotently, and existing refund movements block duplicate void/refund persistence.
- Normal users see voided/refunded statuses but do not see admin-only controls.

### Decision

**Final decision: READY FOR FLAGGED ADMIN QA**

Reason: controls are in place and remain inert while `ENABLE_REAL_LABEL_VOID=false` and `ENABLE_LABEL_PAYMENT_REFUNDS=false`. A future QA run can enable either flag in a controlled environment with allowlisted admins only.

---

## FASE 5.51 — Commercial Operating UX for Automatic Label Flow

Run timestamp: 2026-05-28 America/Guayaquil

Scope: user-facing shipment history/detail UX and admin exception operations for the automatic direct-label flow.

### Operating mode

- Automatic label processing is the intended operating mode when `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`.
- Admin `/admin/label-orders` is now treated as an exception panel, not the normal label creation path.
- Normal users see label-ready, preparing, or review states without raw provider errors.
- Refunds, voids, and wallet remain intentionally out of scope and off.

### UX changes documented

| Area | Result | Evidence / note |
| --- | --- | --- |
| My Shipments | READY FOR QA | Shipment list highlights automatic labels, tracking, carrier/service, label status, price, date, detail link, tracking link, and label PDF action when available. |
| Shipment detail | READY FOR QA | Detail page includes tracking copy action, carrier/service, label status, payment status, provider references, and a clear label PDF action. Raw metadata is not shown to normal users. |
| Success flow | READY FOR QA | Existing automatic success banner remains the source of truth: label ready, preparing, or review messaging based on order status. |
| Admin exceptions | READY FOR QA | Admin list adds automatic-mode guidance, quick filters for needs review/waiting/processing/completed, user id visibility, and stronger exception row styling. |
| Access control | PASS | Shipment APIs continue to require verified users and filter by `user_id`. |

### Safety

- Env files changed: no.
- Migrations added: no.
- Refunds enabled or executed: no.
- Voids enabled or executed: no.
- Wallet changes: no.
- Provider credentials changed: no.
- Public landing redesign: no.

### Decision

**Final decision: READY FOR CONTROLLED BETA QA**

Reason: the automatic label flow already has payment/provider support; this phase improves the operating UX around normal shipment visibility and exception-only admin handling without changing payment, provider, auth, schema, refunds, voids, or wallet behavior.

---

## FASE 5.50 — Automatic Label Processing Production Activation QA

Run timestamp: 2026-05-28 12:52 America/Guayaquil

Commit intended for activation:

- `c65ea8e` — Enable safe automatic label processing after payment

### Current production config pre-check

Checked:

```text
https://sendiflash.com/api/config/status
```

| Flag / status | Result | Observed value |
| --- | --- | --- |
| `buildEnvOk` | PASS | `true` |
| `directLabelPaymentEnabled` | PASS | `true` |
| `realLabelPurchaseEnabled` | PASS | `true` |
| `processLabelInWebhookEnabled` | PENDING ACTIVATION | `false` |
| `labelVoidEnabled` | PASS | `false` |
| `labelPaymentRefundsEnabled` | PASS | `false` |
| `appUrlHost` | PASS | `sendiflash.com` |

### Activation status

| Step | Result | Evidence / note | Required action |
| --- | --- | --- | --- |
| Latest code includes automatic processing support | PASS | Local HEAD includes `c65ea8e` | Deploy `c65ea8e` or newer |
| Production env flag enabled | NOT DONE BY CODEX | Public status still shows `processLabelInWebhookEnabled=false` | Operator must set `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` in VM `.env.production` only |
| Rebuild/restart after flag change | NOT DONE BY CODEX | Requires VM access | Operator must rebuild and restart `shipflow-web` |
| Automatic clean order test | NOT RUN | Requires flag enabled plus browser/user/admin/Supabase access | Run after config status confirms `processLabelInWebhookEnabled=true` |

### Operator activation runbook

Run on VM only:

```bash
cd /home/ubuntu/appsolux-apps/shipflow/shipflow
git fetch origin main
git reset --hard origin/main
git log --oneline -8
```

Confirm `c65ea8e` or newer is present. Then update VM `.env.production` only:

```env
ENABLE_PROCESS_LABEL_IN_WEBHOOK=true
ENABLE_REAL_LABEL_VOID=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Then:

```bash
set -a
source shipflow-web/.env.production
set +a

docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true

sleep 5
curl -s http://localhost:3003/api/config/status
curl -s https://sendiflash.com/api/config/status
```

Expected after activation:

- `directLabelPaymentEnabled=true`
- `realLabelPurchaseEnabled=true`
- `processLabelInWebhookEnabled=true`
- `labelVoidEnabled=false`
- `labelPaymentRefundsEnabled=false`

### Automatic processing QA to run after activation

1. Create a new guide as the allowlisted test user.
2. Get rates.
3. Pay with Stripe test card.
4. Do not click `Process label` manually.
5. Wait for redirect and webhook.
6. Confirm the newest order automatically becomes `label_purchased`.
7. Confirm shipment is created.
8. Confirm tracking, label id, shipment id, processed timestamp, and label URL when returned.
9. Confirm user success page shows "Your label is ready".
10. Confirm My Shipments shows the shipment.
11. Confirm admin shows completed state and no processing action is needed.

### Database checks after automatic test

```sql
select id, user_id, status, amount_cents, currency,
       stripe_checkout_session_id,
       stripe_payment_intent_id,
       paid_at,
       label_id,
       tracking_number,
       shipment_id,
       processed_at,
       error_message,
       created_at,
       updated_at
from pending_label_orders
order by created_at desc
limit 5;
```

Expected newest order:

- `status = 'label_purchased'`
- `label_id` has value
- `tracking_number` has value
- `shipment_id` has value
- `processed_at` has value
- `error_message is null`

```sql
select id,
       user_id,
       tracking_number,
       provider,
       provider_label_id,
       provider_shipment_id,
       label_url,
       status,
       label_status,
       metadata,
       created_at
from shipments
order by created_at desc
limit 5;
```

Expected newest shipment:

- `provider = 'shipstation'`
- `label_status = 'purchased'`
- `label_url` has value if provider returned it
- `metadata.pending_label_order_id` is present
- `metadata.stripe_payment_intent_id` is present
- if sandbox placeholder tracking appears, fallback tracking is unique and metadata preserves original tracking

### Safety rules for the activation test

- Do not click `Process label` manually for the automatic test order.
- Do not run refund.
- Do not run void.
- Do not enable refunds.
- Do not enable voids.
- Do not commit env files or secrets.

### Decision

**Final decision: PARTIAL / ACTIVATION PENDING**

Reason: code support exists in `c65ea8e`, direct payment and real label purchase are enabled, and refunds/voids remain disabled. Automatic processing is not yet active in production because `/api/config/status` still reports `processLabelInWebhookEnabled=false`. Promote to PASS only after the operator enables the flag in VM `.env.production`, redeploys, and a new clean order automatically reaches `label_purchased` without admin clicking `Process label`.

---

## FASE 5.49 — Safe Automatic Label Processing After Stripe Payment

Run timestamp: 2026-05-28 12:49 America/Guayaquil

Scope: support automatic label purchase from the Stripe `checkout.session.completed`
webhook when `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`, while preserving the existing
manual admin mode when the flag is false.

### Design

| Area | Result | Evidence / note |
| --- | --- | --- |
| Manual safe mode | PASS | When `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false`, webhook keeps current behavior: mark payment captured and leave order in `paid_waiting_label_purchase` for admin processing. |
| Automatic mode | PASS | When `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`, webhook records the paid state, checks the account gate, and calls the server-side label processor. |
| Idempotency | PASS | Existing processor claim still moves clean paid orders to `label_purchase_pending` before carrier calls. Stripe retries can recover clean `paid_waiting_label_purchase` orders when auto mode is enabled, but `label_purchased`, `label_purchase_pending`, and unsafe orders are not reprocessed. |
| Duplicate purchase protection | PASS | Auto processing requires no existing `label_id`, `shipment_id`, or `tracking_number`; processor also re-checks status and claim result before purchase. |
| Failure fallback | PASS | Automatic carrier failures mark the order `action_required` with a clear admin message. Webhook still returns 200 to Stripe and does not execute refunds or voids. |
| User success page | PASS | Success banner polls the order after redirect; shows "We're preparing your label" while pending/processing, "Your label is ready" with tracking/PDF link when purchased, and support review messaging for `action_required`. |
| Admin exception flow | PASS | Admin manual processing remains available for `paid_waiting_label_purchase` and clean `action_required` retries; FASE 5.48 double-submit and retry safety remain intact. |

### Flag behavior

- `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false`: manual safe mode.
- `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`: automatic label processing after Stripe confirms payment.
- `ENABLE_REAL_LABEL_VOID=false`: voids remain off.
- `ENABLE_LABEL_PAYMENT_REFUNDS=false`: refunds remain off.
- Wallet is not used for direct label payment.

### Safety

| Safety item | Result | Note |
| --- | --- | --- |
| Env files touched | PASS | No env files changed. |
| Migrations added | PASS | No migrations required. Existing statuses and claim helper were sufficient. |
| Refunds implemented/enabled | PASS | No refund behavior changed or enabled. |
| Voids implemented/enabled | PASS | No void behavior changed or enabled. |
| Wallet touched | PASS | No wallet flow changes. |
| Public landing touched | PASS | No landing changes. |
| Stripe recharge webhook | PASS | Existing wallet recharge handler unchanged. |
| Secrets exposed | PASS | No secrets added to docs or output. |

### Decision

**Final decision: READY FOR FLAGGED QA**

Reason: implementation is behind `ENABLE_PROCESS_LABEL_IN_WEBHOOK`, preserves manual mode by default, and reuses existing claim/idempotency protections. Production remains manual until the env flag is explicitly changed outside Codex.

---

## FASE 5.48 — Manual Admin Label Processing Hardening

Run timestamp: 2026-05-28 12:38 America/Guayaquil

Scope: make the admin manual `Process label` flow safer and clearer for controlled beta operation without changing Stripe webhook behavior, provider purchase logic, refunds, voids, env files, or migrations.

### Changes

| Area | Result | Evidence / note |
| --- | --- | --- |
| Double-submit prevention | PASS | `Process label` now uses both disabled UI state and an in-flight ref guard before calling the admin process endpoint. |
| Loading state | PASS | Button shows `Processing…` and all modal actions are disabled while processing. |
| `paid_waiting_label_purchase` | PASS | Button is enabled only when no `label_id`, `shipment_id`, or `tracking_number` is already saved. |
| `action_required` retry | PASS | Retry is enabled only for clean retries with no `label_id`, no `shipment_id`, and no `tracking_number`. |
| Unsafe retry explanation | PASS | Admin sees an explicit `Retry blocked` / manual review explanation when label/shipment/tracking data already exists. |
| `label_purchased` | PASS | Admin sees `Label already purchased`; process action is not active. |
| Processing success | PASS | Success message includes tracking/shipment/label-ready signal returned by the endpoint. |
| Processing failure | PASS | Existing error panel remains visible and receives the endpoint error message. |
| Local refresh | PASS | Detail state refreshes from the order endpoint and the list is reloaded after successful processing. |

### Safety

| Safety item | Result | Note |
| --- | --- | --- |
| Env files touched | PASS | No env files changed. |
| Migrations added | PASS | No migrations added. |
| Stripe webhook behavior changed | PASS | No webhook files changed. |
| Provider purchase business logic changed | PASS | No processor/provider files changed. |
| Refunds/voids enabled | PASS | No flags touched; no refund/void code path changed. |
| Public landing changed | PASS | No landing/public marketing files changed. |

### Decision

**Final decision: PASS for hardening scope**

Reason: the manual admin processing UI now blocks duplicate clicks, communicates safe retry rules, disables unsafe processing states, and refreshes after success. FASE 5.47 clean browser run remains dependent on interactive beta-user/admin/Supabase access.

---

## FASE 5.47 — Clean End-to-End Label Purchase Test

Run timestamp: 2026-05-28 12:25 America/Guayaquil

Goal: create one new clean direct label payment order from `/crear-guia`, pay with Stripe test card, process the label once from admin, verify `pending_label_orders`, `shipments`, and the user success banner.

### Production config pre-check

Checked:

```text
https://sendiflash.com/api/config/status
```

| Flag / status | Result | Observed value |
| --- | --- | --- |
| `buildEnvOk` | PASS | `true` |
| `directLabelPaymentEnabled` | PASS | `true` |
| `realLabelPurchaseEnabled` | PASS | `true` |
| `processLabelInWebhookEnabled` | PASS | `false` |
| `labelVoidEnabled` | PASS | `false` |
| `labelPaymentRefundsEnabled` | PASS | `false` |
| `appUrlHost` | PASS | `sendiflash.com` |

### Execution status

| Step | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Open `/crear-guia` as allowed test user | NOT RUN BY CODEX | Requires authenticated allowlisted user session | None | Operator must run in browser |
| Create test guide New York, NY → Chicago, IL, 1 lb, 1x1x1 in | NOT RUN BY CODEX | Requires authenticated browser flow | None | Operator must run |
| Get rates and select one rate | NOT RUN BY CODEX | Requires authenticated browser flow | None | Operator must run |
| Pay with Stripe test card | NOT RUN BY CODEX | Requires interactive Stripe Checkout | None | Operator must run |
| Verify webhook state `paid_waiting_label_purchase` | NOT RUN BY CODEX | Requires new order id and Supabase query | None | Operator must run |
| Admin `Process label` once | NOT RUN BY CODEX | Requires admin session; do not double-click | None | Operator must run |
| Verify `pending_label_orders` final row | NOT RUN BY CODEX | Requires Supabase query after processing | None | Operator must run |
| Verify newest shipment | NOT RUN BY CODEX | Requires Supabase query after processing | None | Operator must run |
| Verify user success URL | NOT RUN BY CODEX | Requires new `order_id` and browser session | None | Operator must run |

### Expected verification queries after clean run

```sql
select id, user_id, status, amount_cents, currency,
       stripe_checkout_session_id,
       stripe_payment_intent_id,
       paid_at,
       label_id,
       tracking_number,
       shipment_id,
       processed_at,
       error_message,
       created_at,
       updated_at
from pending_label_orders
order by created_at desc
limit 5;
```

Expected newest order:

- `status = 'label_purchased'`
- `label_id` has a value
- `tracking_number` has a value
- `shipment_id` has a value
- `processed_at` has a value
- `error_message is null`

```sql
select id,
       user_id,
       tracking_number,
       provider,
       provider_label_id,
       provider_shipment_id,
       label_url,
       status,
       label_status,
       metadata,
       created_at
from shipments
order by created_at desc
limit 5;
```

Expected newest shipment:

- Belongs to the new clean pending label order.
- `label_status = 'purchased'`.
- `label_url` has a provider PDF value when sandbox returns one.
- If sandbox returns placeholder tracking, internal fallback is applied.
- `metadata.pending_label_order_id` is present.
- `metadata.stripe_payment_intent_id` is present.

### Safety checks

| Safety item | Result | Note |
| --- | --- | --- |
| Refunds enabled | PASS | `labelPaymentRefundsEnabled=false` |
| Voids enabled | PASS | `labelVoidEnabled=false` |
| Webhook auto-processing enabled | PASS | `processLabelInWebhookEnabled=false` |
| Refund executed by Codex | PASS | No refund command/API call run |
| Void executed by Codex | PASS | No void command/API call run |
| Env files touched by Codex | PASS | No env file changes |
| Migrations run by Codex | PASS | No migration commands run |
| Secrets exposed | PASS | No secrets printed |

### Decision

**Final decision: PARTIAL / NOT RUN BY CODEX**

Reason: production flags are correct and FASE 5.46 is PASS, but the clean FASE 5.47 browser + Stripe Checkout + admin processing flow requires an authenticated allowlisted user session, an interactive Stripe Checkout, admin UI access, and Supabase verification output. Codex did not have those credentials/session artifacts in this environment.

Next required operator action: run the browser flow once, record the new `pending_label_order.id`, `shipment.id`, tracking value, fallback metadata if applied, label PDF availability, and user banner result. If all expectations above are met, update this section to **PASS**.

---

## FASE 5.46 — Final PASS Evidence

Run timestamp: 2026-05-28

Result: **PASS**

Evidence provided after manual retry:

| Item | Result | Evidence |
| --- | --- | --- |
| Retried order | PASS | `08ff529a-f140-46e0-bcef-629cb355f604` |
| Final pending order status | PASS | `label_purchased` |
| Shipment created | PASS | `shipment_id = 281839b8-65d4-468e-8c22-0d82b1d156ad` |
| Provider label id | PASS | `label_id = se-154184403` |
| Tracking persisted | PASS | `tracking_number = 1ZXXXXXXXXXXXXXXXX-08ff529a` |
| Error cleared | PASS | `error_message = null` |
| Original provider tracking preserved | PASS | `metadata.provider_tracking_number_original = 1ZXXXXXXXXXXXXXXXX` |
| Placeholder tracking marked | PASS | `metadata.tracking_number_was_placeholder = true` |
| Internal fallback marked | PASS | `metadata.tracking_number_internal_fallback = true` |
| User success page | PASS | Shows "Your label is ready.", tracking, `UPS Next Day Air® via shipstation`, and "View in My Shipments" |
| Duplicate tracking fix | PASS | Sandbox placeholder duplicate no longer blocks shipment persistence |

Safety confirmations:

- `ENABLE_PROCESS_LABEL_IN_WEBHOOK` remains off.
- `ENABLE_REAL_LABEL_VOID` remains off.
- `ENABLE_LABEL_PAYMENT_REFUNDS` remains off.
- No refund was executed.
- No void was executed.
- No DB uniqueness constraint was removed.
- No secrets were exposed in docs.

---

## FASE 5.46 — Duplicate Tracking Fix Closure Attempt

Run timestamp: 2026-05-28 11:33 America/Guayaquil

Scope: close QA after sandbox duplicate tracking fix for direct label payment + manual admin label purchase retry.

Commits checked locally:

- `d1293ac` — Refine SendiFlash landing visuals and branding clarity
- `4559d27` — Handle sandbox duplicate tracking during label persistence

### Local pre-check

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Root `git status --short` | PASS | Working tree clean before docs update | None | Continue |
| Root `git log --oneline -10` | PASS | `d1293ac` is HEAD; `4559d27` is present in history | None | Continue |
| Root `git diff --check` | PASS | No whitespace errors | None | Continue |
| Env files not staged/tracked | PASS | No `.env.local` or `.env.production` changes in git status; only `.env.example` files are tracked | None | Keep env files untracked |
| `npm run lint` | PASS with warnings | 0 errors; existing unused-variable warnings in `MockAdapter.ts` and `trackingService.ts` | None for FASE 5.46 | Clean warnings later |
| `npx tsc --noEmit` | PASS | No TypeScript errors | None | Continue |
| `npm run build` | PASS | Next build completed; all 41 static pages generated | None | Continue |
| App `git diff --check` | PASS | No whitespace errors | None | Continue |
| Legacy localStorage search | PASS with expected references | Found only docs test instructions plus `lib/storage.ts` constants and `legacyAuthCleanup` cleanup list | None | Keep production legacy auth blocked |
| Eval/CSP search | PASS with expected references | Found documentation references only; no app code hit | None | Continue |

### Runtime flag check

Checked public status endpoint:

```text
https://sendiflash.com/api/config/status
```

| Flag / status | Result | Observed value |
| --- | --- | --- |
| `buildEnvOk` | PASS | `true` |
| `directLabelPaymentEnabled` | PASS | `true` |
| `realLabelPurchaseEnabled` | PASS | `true` |
| `processLabelInWebhookEnabled` | PASS | `false` |
| `labelVoidEnabled` | PASS | `false` |
| `labelPaymentRefundsEnabled` | PASS | `false` |
| Supabase / service role configured | PASS | `true` / `true` |
| Stripe recharge configured/enabled | PASS | `true` / `true` |
| App URL host | PASS | `sendiflash.com` |

### VM redeploy runbook for operator

Codex did not modify `.env.production` and did not run destructive deploy commands on the VM. Operator should run:

```bash
cd /home/ubuntu/appsolux-apps/shipflow/shipflow

git fetch origin main
git reset --hard origin/main
git log --oneline -10

set -a
source shipflow-web/.env.production
set +a

docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true

sleep 5

curl -s http://localhost:3003/api/config/status
```

Expected VM result:

- `d1293ac` or newer at the top of `git log`.
- `4559d27` present in history.
- `buildEnvOk=true`.
- `directLabelPaymentEnabled=true`.
- `realLabelPurchaseEnabled=true`.
- `processLabelInWebhookEnabled=false`.
- `labelVoidEnabled=false`.
- `labelPaymentRefundsEnabled=false`.

### Retry target

Pending label order:

```text
08ff529a-f140-46e0-bcef-629cb355f604
```

Expected pre-retry state:

- `status=action_required`
- `label_id is null`
- `shipment_id is null`
- `tracking_number is null`
- `error_message` contains duplicate tracking error for `1ZXXXXXXXXXXXXXXXX`

Required manual action:

1. Open `https://sendiflash.com/admin/label-orders`.
2. Find order `08ff529a-f140-46e0-bcef-629cb355f604`.
3. Confirm `Process label` is visible because the order is a clean `action_required` retry.
4. Click `Process label` exactly once.
5. Do not retry repeatedly if it fails.

Expected result after retry:

- Order transitions to `label_purchased`.
- A new shipment is created.
- If provider returns sandbox placeholder `1ZXXXXXXXXXXXXXXXX` again, shipment stores unique internal tracking such as `1ZXXXXXXXXXXXXXXXX-08ff529a`.
- `pending_label_orders.error_message` is cleared.
- Original provider tracking is preserved in shipment metadata.

### Supabase verification queries

Run after the admin retry:

```sql
select id, user_id, status, amount_cents, currency,
       stripe_checkout_session_id,
       stripe_payment_intent_id,
       paid_at,
       label_id,
       tracking_number,
       shipment_id,
       processed_at,
       error_message,
       created_at,
       updated_at
from pending_label_orders
where id = '08ff529a-f140-46e0-bcef-629cb355f604';
```

Expected:

- `status = 'label_purchased'`
- `label_id` has a value
- `tracking_number` has the persisted tracking value, using fallback if needed
- `shipment_id` has a value
- `processed_at` has a value
- `error_message is null`

Then:

```sql
select id,
       user_id,
       tracking_number,
       provider,
       provider_label_id,
       provider_shipment_id,
       label_url,
       status,
       label_status,
       metadata,
       created_at
from shipments
order by created_at desc
limit 10;
```

Expected new shipment metadata when fallback applies:

```json
{
  "provider_tracking_number_original": "1ZXXXXXXXXXXXXXXXX",
  "tracking_number_was_placeholder": true,
  "tracking_number_internal_fallback": true
}
```

### User status verification

Open:

```text
https://sendiflash.com/crear-guia?labelPayment=success&order_id=08ff529a-f140-46e0-bcef-629cb355f604
```

Expected:

- Banner shows label ready / `label_purchased`.
- Tracking is visible.
- Label/PDF action is visible only if `label_url` exists.
- Old duplicate-tracking error is not shown.
- Page does not show "payment has not been completed yet".

### Safety checks

| Safety item | Result | Note |
| --- | --- | --- |
| `processLabelInWebhook` remains disabled | PASS | Public `/api/config/status` shows `false` |
| Label void remains disabled | PASS | Public `/api/config/status` shows `false` |
| Label payment refunds remain disabled | PASS | Public `/api/config/status` shows `false` |
| Refund executed by Codex | PASS | No refund command/API call run |
| Void executed by Codex | PASS | No void command/API call run |
| DB unique constraint removed | PASS | No migration/schema change made in this QA pass |
| Env files touched by Codex | PASS | No env file changes |
| Secrets exposed | PASS | No secrets printed or committed |
| Double purchase risk | NOT RUN | Requires single admin retry and DB verification |

### Final result for this closure attempt

| QA target | Result | Evidence / note |
| --- | --- | --- |
| Stripe Checkout test | PREVIOUSLY PASSED | Existing FASE 5.46 context says test checkout created pending order |
| Stripe webhook | PREVIOUSLY PASSED | Existing FASE 5.46 context says webhook updated order to `paid_waiting_label_purchase` |
| Admin Process label retry after `4559d27` | NOT RUN BY CODEX | Requires authenticated admin click |
| `pending_label_orders` final state | NOT RUN BY CODEX | Requires Supabase query after retry |
| Shipment final state | NOT RUN BY CODEX | Requires Supabase query after retry |
| User banner/status | NOT RUN BY CODEX | Requires authenticated/real order status after retry |
| Sandbox duplicate tracking fallback | READY TO VERIFY | Fix commit `4559d27` is present locally; runtime retry pending |

**Final decision: PARTIAL**

Reason: local validation and runtime flag checks pass, but the actual admin retry and Supabase verification for order `08ff529a-f140-46e0-bcef-629cb355f604` were not executed by Codex because they require production admin/Supabase access. Promote to PASS only after the single admin retry creates a shipment and verifies the fallback metadata above.

Next recommended step: Operator redeploys latest `main` on VM if not already deployed, clicks `Process label` once for order `08ff529a-f140-46e0-bcef-629cb355f604`, runs the two Supabase queries, and records the final PASS/PARTIAL/FAIL outcome here.

---

## FASE 5.46 — End-to-End Label Payment + Label Purchase QA

Run date: 2026-05-24

Commit tested: 0286ff5 (FASE 5.45 — Shared status helpers, admin detail polish, user banner improvements)

### BLOQUE 1 — Pre-check local

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Git status | Passed | Working tree clean; no env files tracked | None | Continue |
| Last commit | Passed | HEAD `0286ff5 FASE 5.45 — Shared status helpers, admin detail polish, user banner improvements` | None | Use `0286ff5` for VM redeploy |
| `git diff --check` | Passed | No whitespace errors | None | Continue |
| `npm run lint` | Passed with warnings | 6 pre-existing unused-variable warnings in `MockAdapter.ts` and `trackingService.ts`; 0 errors | None | Warnings can be cleaned later |
| `npx tsc --noEmit` | Passed | No TypeScript errors | None | Continue |
| `npm run build` | Passed | `✓ Compiled successfully`; all routes built | None | Continue |
| Migration SQL `pending_label_orders` | Ready | `supabase/migrations/20260524_add_pending_label_orders.sql` reviewed; 11-state enum, RLS, indexes, trigger | None | Apply manually in Supabase SQL Editor |
| Migration SQL `label_checkout_rate_limits` | Ready | `supabase/migrations/20260524_add_label_checkout_rate_limits.sql` reviewed; RLS, indexes, prune function | None | Apply manually in Supabase SQL Editor |
| Env files not tracked | Passed | `.env.local`, `.env.production`, `shipflow-web/.env.local`, `shipflow-web/.env.production` not in git status | None | Keep env files untracked |

### BLOQUE 2 — VM redeploy to latest main

Run manually on VM (`ubuntu@157.137.228.175`). Agent cannot SSH.

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| `git fetch origin main` | TBD | | | |
| `git reset --hard origin/main` | TBD | | | |
| Commit on VM after reset | TBD | Expected `0286ff5` | | |
| Backup files removed | TBD | | | |
| `.env.production` exists | TBD | | | |
| Variable names (no values) | TBD | Confirm ENABLE_ flags exist | | |
| `docker compose build --no-cache shipflow-web` | TBD | | | |
| `docker compose up -d shipflow-web` | TBD | | | |
| `docker ps --filter name=shipflow-web` | TBD | Container running | | |
| `docker logs --tail=120 shipflow-web` | TBD | No startup errors | | |
| `curl -i http://localhost:3003/api/config/status` | TBD | All dangerous flags false before activating | | |

### BLOQUE 3 — Apply migrations in Supabase

Apply manually in Supabase SQL Editor in order: (1) `pending_label_orders`, (2) `label_checkout_rate_limits`.

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Migration 1 `pending_label_orders` applied | TBD | `select count(*) from pending_label_orders` → 0 | | |
| Migration 2 `label_checkout_rate_limits` applied | TBD | `select count(*) from label_checkout_attempts` → 0 | | |
| Enum 11 states verified | TBD | `select unnest(enum_range(null::pending_label_order_status))` | | |
| Columns match schema | TBD | `information_schema.columns` check | | |
| RLS enabled on both tables | TBD | `pg_class.relrowsecurity = true` | | |
| Policies: user read own (pending_label_orders) | TBD | No INSERT/UPDATE for regular users | | |
| No user policies on label_checkout_attempts | TBD | Service_role only | | |
| Indexes created | TBD | user_id, status, stripe_session, stripe_pi, expires_at | | |
| updated_at trigger exists | TBD | `information_schema.triggers` check | | |
| `prune_label_checkout_attempts()` function exists | TBD | | | |

### BLOQUE 4 — Activate test flags on VM

Edit `.env.production` manually via `nano`. No values printed here.

| Flag | Expected value | Result | Note |
| --- | --- | --- | --- |
| `ENABLE_DIRECT_LABEL_PAYMENT` | `true` | TBD | Activate for test |
| `DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS` | (set) | TBD | Empty = all verified users; or specific emails |
| `ENABLE_REAL_LABEL_PURCHASE` | `true` | TBD | Only if provider confirmed sandbox |
| `REAL_LABEL_PURCHASE_ALLOWED_EMAILS` | (set) | TBD | |
| `ENABLE_PROCESS_LABEL_IN_WEBHOOK` | `false` | TBD | Keep off — manual process only |
| `ENABLE_REAL_LABEL_VOID` | `false` | TBD | Keep off |
| `ENABLE_LABEL_PAYMENT_REFUNDS` | `false` | TBD | Keep off |
| `/api/config/status` after rebuild | TBD | `directLabelPaymentEnabled=true`, `realLabelPurchaseEnabled=true`, others false | |

### BLOQUE 5 — Auth QA (quick, before payment)

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| No session: `/dashboard` → `/login` | TBD | | | |
| No session: no fake balance or $128.70 | TBD | | | |
| Verified session: `/login` → `/dashboard` | TBD | | | |
| Verified session: `/registro` → `Already signed in` | TBD | | | |
| Verified session: `/crear-guia` allows quoting | TBD | | | |
| Fake localStorage `shipflow-user` does not grant access | TBD | | | |

### BLOQUE 6 — Create guide and pay with Stripe test

Stripe test card: `4242 4242 4242 4242`, any future date, any CVC, any ZIP.

| Step | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Open `https://sendiflash.com/crear-guia` | TBD | | | |
| Enter test origin / destination | TBD | | | |
| Enter test parcel | TBD | | | |
| Rates load (no "disabled" message) | TBD | `directLabelPaymentEnabled=true` must show Pay button | | |
| Select a rate (e.g., UPS) | TBD | | | |
| "Pay with card" CTA visible | TBD | | | |
| Click Pay — Stripe Checkout opens | TBD | | | |
| Stripe Checkout session created in Stripe Dashboard | TBD | | | |
| `pending_label_order` created with `pending_payment` | TBD | Check Supabase before paying | | |
| Pay with test card | TBD | | | |
| Redirect back to app with `labelPayment=success&order_id=...` | TBD | | | |
| Banner polls `/api/billing/label-orders/[id]` | TBD | | | |
| Status in DB after webhook | TBD | Expected `paid_waiting_label_purchase` if `ENABLE_REAL_LABEL_PURCHASE=true` | | |
| `stripe_payment_intent_id` not null | TBD | | | |
| `paid_at` not null | TBD | | | |
| `label_id` null (before Process Label) | TBD | | | |
| `tracking_number` null (before Process Label) | TBD | | | |
| No wallet debit in `balance_movements` | TBD | Direct payment must not debit wallet | | |

### BLOQUE 7 — Admin label orders

URL: `https://sendiflash.com/admin/label-orders`

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Order appears in admin list | TBD | | | |
| Status correct | TBD | Expected `paid_waiting_label_purchase` | | |
| Amount / currency correct | TBD | | | |
| Provider / service visible | TBD | | | |
| Detail panel shows rate snapshot safely | TBD | No secrets exposed | | |
| Copy buttons work (Order ID, Tracking, Shipment ID) | TBD | | | |
| Status description tooltip present | TBD | | | |
| `Process label` button enabled | TBD | Requires `ENABLE_REAL_LABEL_PURCHASE=true` | | |
| Confirm provider is in sandbox/test mode | TBD | If not confirmed → do not click Process label | | |
| Click `Process label` | TBD | | | |
| Status changes to `label_purchased` | TBD | | | |
| `tracking_number` populated | TBD | | | |
| `label_id` populated | TBD | | | |
| Label URL / PDF available | TBD | Depends on provider sandbox response | | |
| Table updates without manual refresh | TBD | | | |
| `processed_at` populated in DB | TBD | | | |

Sandbox provider note: ShipEngine/ShipStation sandbox may return repeated placeholder
tracking numbers such as `1ZXXXXXXXXXXXXXXXX`. ShipFlow now preserves the original
provider tracking number in `shipments.metadata.provider_tracking_number_original`
and stores a unique internal `shipments.tracking_number` when needed to satisfy the
database uniqueness constraint.

### BLOQUE 8 — User status after Process Label

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Banner shows "Your label is ready." | TBD | If `label_purchased` | | |
| Tracking number visible | TBD | | | |
| Provider / service visible | TBD | | | |
| Download / view label link visible (if label_url exists) | TBD | | | |
| No label_url → no broken link shown | TBD | | | |
| Error state shows safe support message | TBD | If `action_required` or `refund_needed` | | |

### BLOQUE 9 — Negative tests (controlled)

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| No token: `POST /api/billing/label-checkout` → 401 | TBD | | | |
| No token: `GET /api/billing/label-orders/[id]` → 401 | TBD | | | |
| Another user's order ID → 403/404 | TBD | | | |
| Unverified user checkout → blocked | TBD | | | |
| Double-click `Process label` → safe (no double purchase) | TBD | Idempotency key should prevent | | |
| Refund button disabled (refunds off) | TBD | `ENABLE_LABEL_PAYMENT_REFUNDS=false` | | |
| Void not available in UI | TBD | `ENABLE_REAL_LABEL_VOID=false` | | |
| Rate limit (if migration applied) | TBD | Multiple checkouts → 429 after limit | | |

### BLOQUE 10 — Logs and Stripe Dashboard

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Stripe Dashboard: Checkout Session visible | TBD | | | |
| Stripe Dashboard: Payment Intent test mode | TBD | | | |
| Stripe Dashboard: Webhook delivered 200 | TBD | | | |
| Stripe metadata: `purpose=label_direct_payment` | TBD | | | |
| Stripe metadata: `pending_label_order_id` present | TBD | | | |
| Stripe metadata: `user_id` present | TBD | | | |
| Docker logs: no tokens / API keys printed | TBD | | | |
| Docker logs: no service role key printed | TBD | | | |
| Docker logs: no provider API secrets | TBD | | | |

### BLOQUE 11 — Final flag decision

| Flag | Final state | Note |
| --- | --- | --- |
| `ENABLE_DIRECT_LABEL_PAYMENT` | TBD | |
| `ENABLE_REAL_LABEL_PURCHASE` | TBD | |
| `ENABLE_PROCESS_LABEL_IN_WEBHOOK` | Keep `false` | Not changing in FASE 5.46 |
| `ENABLE_REAL_LABEL_VOID` | Keep `false` | Not changing in FASE 5.46 |
| `ENABLE_LABEL_PAYMENT_REFUNDS` | Keep `false` | Not changing in FASE 5.46 |

### Bugs found in FASE 5.46

| Bug | Route / command | Repro steps | Impact | Required action |
| --- | --- | --- | --- | --- |
| None recorded yet | N/A | N/A | N/A | Execute QA blocks above |

### Decision

| Criteria | Met? | Evidence |
| --- | --- | --- |
| Migrations applied without errors | TBD | |
| Direct payment test checkout works | TBD | |
| Stripe webhook updates pending_label_order | TBD | |
| Admin can Process Label in sandbox | TBD | |
| User sees tracking/PDF or clear status | TBD | |
| Negative tests safe | TBD | |
| No secrets in logs | TBD | |
| No double purchase possible | TBD | |

**Final decision: TBD — PASS / PARTIAL / FAIL**

Reason: QA pending manual execution by operator.

Next recommended step: After PASS — wire up `ENABLE_PROCESS_LABEL_IN_WEBHOOK` in a controlled beta with 1-2 real users.

---

Purpose: close VM/staging QA for auth/navigation with all label-payment flags off, before any migrations or direct label payment test.

Rules for this QA pass:

- Do not print secrets.
- Do not modify `.env.production` from the agent.
- Do not apply migrations during FASE 5.42.
- Do not enable direct label payment during FASE 5.42.
- Do not enable real label purchase, real void, webhook processing, or label refunds.
- Do not buy labels, void labels, or execute refunds.

## FASE 5.42 Closure Status

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Local branch / commit | Passed | Branch `main`, HEAD `013d8ed Record staging redeploy QA blocker`; working tree clean at pre-check | None | Use `013d8ed` or newer for VM redeploy |
| Local env tracking check | Passed | `.env`, `.env.local`, `.env.production`, `shipflow-web/.env.local`, and `shipflow-web/.env.production` are not tracked | None | Keep env files untracked |
| Local validations | Passed with warnings | `npm run lint` passed with existing unused-variable warnings; `npx tsc --noEmit` passed; `npm run build` passed | None | Warnings can be cleaned later |
| VM redeploy | Not completed by Codex | SSH to `ubuntu@157.137.228.175` returned `Permission denied (publickey)` | Operational access blocker | User/operator must run VM commands manually |
| VM API QA | Not completed by Codex | Requires VM shell or manual output | TBD | Run localhost API checks after redeploy |
| Public API QA | Passed | Public `https://sendiflash.com` no-token checks passed; all dangerous label flags false | None | Re-run after manual VM redeploy |
| Browser auth QA | Not completed by Codex | Browser automation not available; real session credentials required | Tool/access blocker | User/operator must complete browser QA manually |
| Labels disabled QA | Partial | Public config confirms all dangerous flags false; verified-user UI flow pending | TBD | Confirm `/crear-guia` with verified user |
| Final decision | PARTIAL | App public API/config checks passed, but VM redeploy and browser auth QA still need manual execution | Operational blocker, not app bug | Do not advance to migrations until manual QA is PASS |

## Historical Pre-Closure Notes

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Local branch / commit | Blocked before VM execution | Branch `main`, commit `ba59d7a Prepare secure direct label payment operations` | Local working tree is not clean | Commit or intentionally carry the pending auth/docs changes before VM reset/deploy QA |
| Local env tracking check | Passed | `.env`, `.env.local`, `.env.production`, `shipflow-web/.env.local`, and `shipflow-web/.env.production` are not tracked | None | Keep env files untracked |
| Migration SQL review | Reviewed locally in previous preparation | `pending_label_orders` and `label_checkout_attempts` SQL reviewed; not applied by Codex | None found in local review | Keep migrations unapplied until FASE 5.42 is PASS |
| VM pre-check | Not run by Codex | Requires VM access/operator execution | TBD | Run commands from `STAGING_EXECUTION_CHECKLIST.md` |
| Auth QA before migrations | Not run by Codex | Browser QA required on `https://sendiflash.com` | TBD | Run manually before touching migrations/flags |
| Migrations applied | Not applied | FASE 5.42 explicitly does not apply migrations | None | Apply only in FASE 5.43 after auth QA PASS |
| Direct payment flag enabled | Not enabled | `.env.production` was not touched by Codex | None | Enable only in FASE 5.43 if FASE 5.42 passes |
| Stripe direct label payment test | Not run | Out of scope for FASE 5.42 | None | Run in FASE 5.43 |
| Rollback | Not applicable | No staging flags changed by Codex | None | No rollback needed |

## Commit / Public API Check

Run timestamp: 2026-05-24 17:54 America/Guayaquil.

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Commit created | Passed | `312f514 Fix auth routing loops and staging QA docs` | None | Use this commit for clean VM redeploy |
| Push to GitHub | Passed | `main` pushed from `ba59d7a` to `312f514` | None | VM operator can fetch/reset to `origin/main` |
| VM redeploy | Not run by Codex | Requires VM shell access; commands are documented in `STAGING_EXECUTION_CHECKLIST.md` | TBD | Run redeploy manually before browser QA |
| Public `/api/config/status` | Passed | HTTP 200; `buildEnvOk=true`, Supabase/service role/Google Maps/Stripe recharge configured; all dangerous label flags false | None | Re-run after VM redeploy to verify new commit is live |
| Public no-token API checks | Passed | `/api/auth/me` returned `authenticated:false`; `/api/balance`, `/api/shipments`, `/api/config/features`, and `POST /api/billing/label-checkout` returned 401 | None | Re-run from VM localhost after redeploy |
| Public page reachability | Partial | `/dashboard`, `/login`, and `/verifica-tu-correo?resend=true` return HTML 200; client-side auth behavior still needs browser session QA | None from curl | Run manual browser QA |

## Redeploy / Auth QA Attempt

Run timestamp: 2026-05-24 18:00 America/Guayaquil.

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Local pre-check | Passed | Working tree clean; HEAD `1e85344`; `git diff --check` passed; env files not tracked | None | Continue using `1e85344` as QA target |
| Local validations | Passed with warnings | `npm run lint` passed with existing unused-variable warnings; `npx tsc --noEmit` passed; `npm run build` passed | None | Warnings can be cleaned later |
| SSH to VM | Blocked | `ssh ubuntu@157.137.228.175` returned `Permission denied (publickey)` | Access/key unavailable in this environment | Run VM redeploy manually or provide authorized SSH key/access |
| VM redeploy | Not run | Blocked by SSH auth | TBD | Run documented VM commands manually |
| Public `/api/config/status` | Passed | HTTP 200; `buildEnvOk=true`; Supabase/service role/Google Maps/Stripe recharge configured; `appUrlHost=sendiflash.com`; all dangerous label flags false | None | Repeat from `localhost:3003` after VM redeploy |
| Public no-token API checks | Passed | `/api/auth/me` returned `authenticated:false`; `/api/balance`, `/api/shipments`, `/api/config/features`, and label checkout POST returned 401 | None | Repeat from VM after redeploy |
| Browser automation | Blocked | `agent-browser` CLI not available in this environment | Tool unavailable | Execute browser QA manually in Chrome/Incognito |
| Browser auth QA | Not run by Codex | Requires real browser session and test credentials | TBD | Complete blocks 4-9 of `STAGING_EXECUTION_CHECKLIST.md` manually |
| Labels disabled QA | Partial | Config confirms dangerous flags false; UI quote flow not tested with verified session | TBD | Complete with verified user after redeploy |
| Final decision | PARTIAL | Local/API public checks passed, but VM redeploy and browser auth QA were not executable from this environment | Access/tooling blockers, not app bug | Do not advance to migrations until manual VM/browser QA passes |

## Summary

| Area | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Auth | Not run by Codex | Browser QA pending on `https://sendiflash.com` | TBD | Run FASE 5.42 auth checklist manually |
| API | Partial | Public no-token API checks passed against `https://sendiflash.com`; VM localhost checks still pending | None | Re-run after clean VM redeploy |
| Labels disabled | Not run yet | Requires verified user in staging | TBD | Confirm Pay by card disabled and no pending order |
| Config | Not run yet | `/api/config/status` expected to show all dangerous flags false | TBD | Capture safe boolean output only |
| UI | Not run yet | Dashboard/login/register/verify flows pending | TBD | Record route behavior and screenshots if needed |
| Security | Local checks passed | Legacy auth/eval searches completed locally; false positives documented below | No active issue found | Run browser/VM security checks during staging QA |

## Future Direct Label Payment Stripe Test (Do Not Run In FASE 5.42)

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Config before flags shows direct payment disabled | Not run yet | Expected `directLabelPaymentEnabled=false` | TBD | Run `curl -i http://localhost:3003/api/config/status` on VM |
| Apply `pending_label_orders` migration | Not run yet | Manual Supabase SQL Editor only | TBD | Confirm columns, enum, RLS, policies, indexes, triggers, counts |
| Apply `label_checkout_rate_limits` migration | Not run yet | Manual Supabase SQL Editor only | TBD | Confirm columns, RLS, indexes, initial count |
| Enable only internal direct payment gate | Not run yet | `ENABLE_DIRECT_LABEL_PAYMENT=true`, `DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com` | TBD | Keep real purchase, void, webhook processing, and refunds false |
| Allowlisted user sees Pay by card | Not run yet | Verified user required | TBD | Run `/crear-guia` quote flow |
| Stripe test Checkout completes | Not run yet | Use Stripe test card only | TBD | Confirm redirect back to app |
| Webhook marks order `paid_test_mode` | Not run yet | Expected because `ENABLE_REAL_LABEL_PURCHASE=false` | TBD | Verify DB and Stripe webhook 200 |
| No wallet debit | Not run yet | Direct label payment must not create wallet debit | TBD | Check `balance_movements` |
| No real label purchase | Not run yet | `label_id` and `tracking_number` must stay null | TBD | Check `pending_label_orders` |
| Admin sees order | Not run yet | `/admin/label-orders` | TBD | Verify `paid_test_mode` order details |

## Negative Direct Payment Tests

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| No token POST `/api/billing/label-checkout` | Not run yet | Expected 401/403 and no checkout | TBD | Run from VM |
| Non-allowlisted verified user | Not run yet | Expected 403 and account-not-available UI | TBD | Run manually |
| Unverified user | Not run yet | Expected 403 and no pending order | TBD | Run manually/API |
| Rate limit | Not run yet | More than 5 attempts / 10 min should return 429 | TBD | Run only after rate limit migration is applied |
| Webhook separation | Not run yet | No `payment_recharge` or wallet movement for label payment | TBD | Verify DB after Stripe test |

## Auth

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| No session: `/dashboard` redirects to `/login` | Not run yet | Incognito browser required | TBD | Run manually |
| No session: dashboard, balance, and `$128.70` are not shown | Not run yet | Incognito browser required | TBD | Run manually |
| Verified session: `/login` redirects to `/dashboard` | Not run yet | Existing verified Supabase session required | TBD | Run manually |
| Verified session: `/registro` shows `Already signed in` | Not run yet | Existing verified Supabase session required | TBD | Run manually |
| Existing email registration shows account options | Not run yet | Use test email only | TBD | Run manually |
| Unverified user: `/dashboard` redirects to `/verifica-tu-correo` | Not run yet | New unverified test account required | TBD | Run manually |
| `/verifica-tu-correo?resend=true` works without session | Not run yet | No session required | TBD | Run manually |
| Forgot/reset password works | Not run yet | Test inbox required | TBD | Run manually |
| Fake `shipflow-user` / `shipflow-balance` does not grant access | Not run yet | Browser console required | TBD | Run manually |

## API

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| `GET /api/auth/me` without token | Not run yet | Expected `authenticated:false` | TBD | Run from VM |
| `GET /api/balance` without token | Not run yet | Expected 401 | TBD | Run from VM |
| `GET /api/shipments?limit=10` without token | Not run yet | Expected 401 | TBD | Run from VM |
| `POST /api/billing/label-checkout` without token | Not run yet | Must not create checkout/session/order | TBD | Run from VM |
| `GET /api/config/status` | Not run yet | Expected dangerous flags false | TBD | Run from VM |
| `GET /api/config/features` without token | Not run yet | Must not expose allowlists | TBD | Run from VM |

Public API observations before VM redeploy confirmation:

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| `GET https://sendiflash.com/api/auth/me` without token | Passed | HTTP 200, `authenticated:false` | None | Repeat from VM localhost |
| `GET https://sendiflash.com/api/balance` without token | Passed | HTTP 401, missing authorization token | None | Repeat from VM localhost |
| `GET https://sendiflash.com/api/shipments?limit=10` without token | Passed | HTTP 401, missing authorization token | None | Repeat from VM localhost |
| `POST https://sendiflash.com/api/billing/label-checkout` without token | Passed | HTTP 401, no Stripe checkout created from unauthenticated request | None | Repeat from VM localhost |
| `GET https://sendiflash.com/api/config/status` | Passed | HTTP 200; direct label payment, real purchase, void, webhook processing, and refunds false | None | Repeat after redeploy |
| `GET https://sendiflash.com/api/config/features` without token | Passed | HTTP 401, no allowlists exposed | None | Repeat from VM localhost |

## Labels Disabled

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| `/crear-guia` quote flow works with verified user | Not run yet | Auth required | TBD | Run manually |
| Insufficient balance shows Pay by card disabled / `Soon` | Not run yet | Direct payment flag must remain false | TBD | Run manually |
| No Stripe Checkout created | Not run yet | Confirm via browser/API behavior, not secret logs | TBD | Run manually |
| No carrier label purchased | Not run yet | Real purchase flag must remain false | TBD | Run manually |
| Wallet balance unchanged | Not run yet | Compare before/after | TBD | Run manually |
| No `pending_label_order` created | Not run yet | Migration not applied and feature off | TBD | Run manually |

## Config / Flags

| Test | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| `directLabelPaymentEnabled=false` | Not run yet | `/api/config/status` | TBD | Verify on VM |
| `realLabelPurchaseEnabled=false` | Not run yet | `/api/config/status` | TBD | Verify on VM |
| `labelVoidEnabled=false` | Not run yet | `/api/config/status` | TBD | Verify on VM |
| `processLabelInWebhookEnabled=false` | Not run yet | `/api/config/status` | TBD | Verify on VM |
| `labelPaymentRefundsEnabled=false` | Not run yet | `/api/config/status` | TBD | Verify on VM |
| Allowlists are not exposed | Not run yet | Config endpoints only | TBD | Verify on VM |

## Bugs

Record any bug with:

- Exact route.
- Session state: no session, verified session, or unverified session.
- `authLoading` / `emailVerified` state if visible from debug logs.
- Browser steps to reproduce.
- Safe error message, without secrets or tokens.

Current bug list:

| Bug | Route / command | Repro steps | Impact | Required action |
| --- | --- | --- | --- | --- |
| None recorded yet | N/A | N/A | N/A | Run staging QA |

## Local Search Results

| Search | Result | False positives / notes | Required action |
| --- | --- | --- | --- |
| `shipflow-user\|shipflow-users` | Found expected references only | Docs test instructions, `lib/storage.ts` constants, and `lib/services/legacyAuthCleanup.ts` cleanup list | Keep blocked in production; verify fake localStorage QA in browser |
| `unsafe-eval\|eval(\|new Function\|setTimeout("\|setInterval("` | Found documentation reference only | `docs/LABELS_GO_NO_GO.md` notes prior CSP/dev-overlay warning; no app code hit | No code action required |

## Local Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed with warnings | Existing unused-variable warnings in `lib/logistics/adapters/MockAdapter.ts` and `lib/services/trackingService.ts` |
| `npx tsc --noEmit` | Passed | No TypeScript errors |
| `npm run build` | Passed | Next.js build completed successfully |
| `git diff --check` | Passed | No whitespace errors |

---

## FASE 5.54 — Pricing Margin Controls

### Current pricing behavior (audited 2026-05-28)

| Layer | File | Behavior |
|---|---|---|
| Rate fetch | `lib/logistics/rateAggregator.ts` | `repriceRate()` calls `calculateCustomerPrice(providerCost)` for every raw provider rate |
| Pricing engine | `lib/logistics/pricing.ts` | `platformMarkup = max(markupMinimum, providerCost × markupPct)` + `paymentFee = subtotal × feePct + feeFixed` |
| Config defaults | `lib/logistics/pricing.ts` | 6% markup / $0.99 min / 2.9%+$0.30 payment fee — configurable via env vars (no env file changed) |
| Stripe checkout | `app/api/billing/label-checkout/route.ts` | Recalculates from `providerCost` server-side; ignores client-sent `customerPrice` |
| Wallet debit | `lib/server/shipments/createShipEngineShipment.ts` | Uses `calculateCustomerPrice(revalidatedRate.pricing.providerCost)` — server-computed, not client-supplied |
| Card shipment persist | `lib/server/labelPurchaseProcessor.ts` | Now stores full breakdown: `provider_cost`, `platform_markup`, `payment_fee`, `pricing_subtotal`, `pricing_breakdown` |
| Pricing snapshot | `pending_label_orders.rate_snapshot` | Stores enriched snapshot with `pricingBreakdown` from server re-computation |

### Pricing model implemented

```
provider_cost       = raw carrier rate (from ShipStation / EasyPost / Shippo)
platform_markup     = max(LABEL_MARKUP_MIN_USD, provider_cost × LABEL_MARKUP_PCT)
pricing_subtotal    = provider_cost + platform_markup
payment_fee         = pricing_subtotal × LABEL_PAYMENT_FEE_PCT + LABEL_PAYMENT_FEE_FIXED_USD
customer_price      = pricing_subtotal + payment_fee
```

Defaults (when env vars absent): 6% markup / $0.99 min / 2.9%+$0.30 payment fee.

### Configurable env vars (server-side only, none added to .env)

| Variable | Default | Purpose |
|---|---|---|
| `LABEL_MARKUP_PCT` | `0.06` | Platform markup percentage |
| `LABEL_MARKUP_MIN_USD` | `0.99` | Minimum platform markup in USD |
| `LABEL_PAYMENT_FEE_PCT` | `0.029` | Payment processing fee percentage |
| `LABEL_PAYMENT_FEE_FIXED_USD` | `0.30` | Fixed payment processing fee in USD |

### Payment method tracking

| Path | `pricing_model` | `pricing_breakdown.paymentMethod` |
|---|---|---|
| Wallet (`/api/labels`) | `shipflow_v1` | `wallet` |
| Card (`/api/billing/label-checkout` → processor) | `direct_label_payment` | `card` |

### Mismatch prevention

Server-side in `label-checkout/route.ts`:
- `amountCents` is derived from `calculateCustomerPrice(rateSnapshot.providerCost)` — NOT from client-sent `customerPrice`
- If client-sent price diverges > $1.00 from server-computed, a warning is logged
- The enriched `rateSnapshot` stored in `pending_label_orders` uses server-computed `customerPrice` and full `pricingBreakdown`

### Admin visibility

`AdminShipmentsTable` now shows:
- **Charged / Cost** column: customer price + "Cost $X · +$Y" breakdown
- **Payment** column: badge (Paid/Refunded) + payment method (Wallet / Card)
- Inferred from `pricingBreakdown.paymentMethod` first, then `pricingModel` for older rows

### Migration required

None. All columns (`provider_cost`, `platform_markup`, `payment_fee`, `pricing_subtotal`, `pricing_model`, `pricing_breakdown`) existed from FASE 5.10.

### Limitations

- Payment fee is charged on both wallet and card paths (no wallet-only discount)
- Provider cost validation relies on the carrier API being honest; no cross-check
- Markup config is env var only; no DB-driven config yet (TODO in pricing.ts)

### Safety confirmations

- [ ] No env files changed
- [ ] No secrets printed
- [ ] No automatic refunds/voids enabled
- [ ] Direct card payment still works
- [ ] Wallet payment still works
- [ ] Automatic label purchase still works
- [ ] No provider credentials changed

### Validation results (2026-05-28)

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; new routes `/support`, `/terms`, `/privacy`, and `/support-policy` generated |
| `git diff --check` | Passed |
| legacy localStorage grep | Expected docs/storage cleanup references only |
| unsafe eval grep | Documentation reference only |
| secret diff grep | No secret-like values found in code/docs diff |

---

## FASE 5.55 — Multi-country Domestic Shipping Readiness

Date: 2026-05-28

### Scope

Prepared SendiFlash for selected same-country domestic markets only. This does not enable international, cross-border, customs, duties, export documents, new carriers, or multi-currency conversion.

### US-only assumptions found

| Area | Files | Finding |
|---|---|---|
| Address UI | `components/AddressInput.tsx`, `lib/googleMapsUtils.ts` | Google Places was restricted to `us`; manual country was disabled; state/ZIP labels and parser were US-centered. |
| Create guide | `components/CreateGuideForm.tsx` | Default addresses and payloads forced `country: "US"`; validation rejected non-US addresses; copy referenced ZIP/US only. |
| Rates API | `app/api/rates/route.ts` | Server rejected non-US rates before provider calls. |
| ShipEngine rates | `lib/logistics/adapters/ShipStationAdapter.ts` | ShipEngine validation and payload sent `country_code: "US"` for origin and destination. |
| Label purchase | `app/api/billing/label-checkout/route.ts`, `lib/server/labelPurchaseProcessor.ts`, `lib/server/shipments/createShipEngineShipment.ts` | Label order snapshots and wallet label purchase validated US-only and did not preserve domestic market metadata. |
| Copy/docs | `app/layout.tsx`, `app/page.tsx`, `components/landing/ScrollStory.tsx`, QA docs | Public copy implied US-only shipping. |

### Supported domestic countries

Central helper: `lib/domesticMarkets.ts`

Initial allowlist:
- `US` — United States
- `CA` — Canada
- `ES` — Spain
- `DE` — Germany
- `FR` — France
- `GB` — United Kingdom (`UK` input normalizes to `GB`)

### Domestic-only rule

Before rates, card checkout, wallet label purchase, and webhook/admin label processing:
- origin country is normalized
- destination country is normalized
- both countries must be in the allowlist
- origin country must equal destination country

If countries differ, users see:
`International shipping is coming soon. For now, SendiFlash supports domestic shipments within selected countries.`

If the country is not supported, users see:
`This country is not available yet.`

### Provider and no-rate handling

The provider payload now receives the normalized domestic country code. If a selected country is allowed by SendiFlash but the carrier/provider account returns no services, the UI shows:
`No rates were returned for this route. This market may require carrier setup.`

### Currency limitation

The current pricing, wallet, and Stripe direct label payment paths are USD-only. Non-USD rate snapshots are blocked before checkout/label processing. No currency conversion was added.

### Snapshot and metadata preservation

New rate/checkout/label metadata preserves:
- `originCountry`
- `destinationCountry`
- `domesticMarket`

This is stored in card order snapshots and wallet shipment metadata where available.

### QA scenarios to run in staging

| Scenario | Expected result |
|---|---|
| US → US | Existing domestic flow still works. |
| ES → ES | Passes validation and attempts provider rates. If account lacks setup, friendly no-rate message appears. |
| DE → DE | Passes validation and attempts provider rates. If account lacks setup, friendly no-rate message appears. |
| ES → DE | Blocked before rates with international-coming-soon message. |
| US → CA | Blocked before rates with international-coming-soon message. |
| Unsupported country | Blocked with country-unavailable message. |
| Provider returns no rates | No checkout allowed; friendly market setup message appears. |
| Card/wallet pricing | Still uses server-computed USD customer price. |

### Safety confirmations

- [x] No env files changed
- [x] No secrets printed
- [x] No migrations added
- [x] No customs/international/export documents implemented
- [x] No refunds/voids auto-enabled
- [x] Direct card payment still builds
- [x] Wallet payment still builds
- [x] Automatic label purchase still builds

### Validation results (2026-05-28)

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| `grep -R "shipflow-user\|shipflow-users"` | Found expected legacy-auth docs/storage cleanup references only |
| `grep -R "unsafe-eval\|eval(\|new Function\|setTimeout("\|setInterval("` | Found documentation reference only |

---

## FASE 5.60 — Controlled Multi-Label Shipment Flow

Date/time: 2026-05-29 07:04 -05

### Scope implemented

- Added a `/crear-guia` mode switch for `Single shipment` and `Multiple shipments`.
- Batch mode supports one shared origin and up to 5 domestic shipment rows.
- Each row has its own destination, validation state, rate status, and selected rate.
- Package data can be shared across the batch or customized per shipment.
- Product type `Other` requires a customer-friendly product description.
- Batch drafts persist locally without card/payment data.

### Rates and validation

- Every row validates selected domestic market rules before rates:
  - origin country must equal destination country.
  - country must be in the selected domestic allowlist.
  - cross-border/international routes are blocked before provider calls.
- Batch rates are requested sequentially for this controlled beta version.
- Rows show `ready`, `loading`, `no rates`, `error`, `checkout opened`, or `purchased`.
- No-rates rows show the existing friendly market/provider setup message.

### Payment behavior

- Wallet batch purchase processes labels one at a time using the existing safe wallet label endpoint.
- Successful wallet rows are saved immediately; if a later row fails, the failed row remains visible for support review and remaining rows are not charged automatically.
- Card batch checkout creates separate pending label orders and opens one Stripe Checkout tab per selected shipment.
- Card orders share beta metadata through `batchId`, `batchIndex`, and `batchSize`; automatic webhook processing remains per pending order.
- A combined one-payment Stripe batch checkout was intentionally deferred.

### Metadata and admin visibility

- Batch orders are identified with `batchId`, `batchIndex`, and `batchSize` in pricing/order metadata where available.
- Direct card label persistence carries batch metadata into shipment metadata/pricing breakdown.
- Shipment `product_type` uses the safe product description when provided.

### Safety and limitations

- Existing single-label flow remains available and unchanged as the default mode.
- Existing duplicate label protections/idempotency remain in the wallet and card paths.
- Batch limit: 5 shipments.
- Deferred: CSV/Excel import, larger bulk operations, international/customs, combined card batch payment, and full all-or-nothing wallet batch atomicity.
- No migrations, env changes, provider credential changes, refunds, voids, customs, or new carriers were added.

### Local validation

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; Next.js reported the existing multiple-lockfile workspace-root warning |
| `git diff --check` | Passed |
| `grep -R "shipflow-user\|shipflow-users"` | Found expected legacy-auth docs/storage cleanup references only |
| `grep -R "unsafe-eval\|eval(\|new Function\|setTimeout("\|setInterval("` | Found documentation reference only |

### FASE 5.60 UI fix — Create Guide rate flow refinement

Date/time: 2026-05-29 08:05 -05

- Refined single-shipment `/crear-guia` Get Rates layout.
- From/To remain side by side on desktop and stack on mobile, with Name and Phone on separate rows inside each card.
- Added a simple phone country code selector for selected domestic markets: US/CA +1, ES +34, DE +49, FR +33, GB +44.
- Phone code is stored in the local shipment draft with other address fields; no payment data is stored.
- Compact rate-search summary now displays separate From, To, and Package blocks instead of one large text paragraph.
- Available rates now render as responsive option cards in a grid/matrix.
- Searching rates shows a professional loading panel with skeleton cards and progress copy.
- Editing shipment details clears stale rates, selected rate, errors, modal state, and checkout notices before a new search.
- Card checkout behavior remains new-tab first; current `/crear-guia` stays open unless the popup is blocked.

---

## FASE 5.62 — Auth UX Pro

Date/time: 2026-05-29 12:32 -05

### Scope implemented

- Redesigned `/login` and `/registro` with a professional SendiFlash auth layout.
- Added a dark SaaS-style visual side panel with rate comparison, route, payment, and label-ready cues.
- Improved loading, error, existing-account, and already-signed-in states.
- Preserved forgot-password and verification links.

### Signup data

Registration now collects:
- first name
- last name
- business / company name
- phone
- default domestic market
- business type
- email
- password
- confirm password
- terms acceptance

Existing `profiles.business_name` remains the only profile-table write. Additional signup data is stored in Supabase Auth user metadata, so no migration was required.

### Anti-bot behavior

- Signup supports Google reCAPTCHA v3 when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` are configured.
- The secret is verified server-side through `/api/auth/verify-captcha`.
- No captcha secret is exposed to the browser.
- Local/non-production environments can sign up without configured captcha keys.
- Production signup shows a setup-required message when the public site key is missing; if a site key exists but server secret is missing, verification fails closed.

### Pending

- Full editable profile module remains pending.
- Additional profile-table columns for signup data remain deferred until profile management is designed.

---

## FASE 5.63 — User Profile and Account Settings

Date/time: 2026-05-29 12:37 -05

### Scope implemented

- Added `/perfil` as a protected user-facing account settings page.
- Added Profile navigation item in the dashboard sidebar.
- Users can view email, account creation date, company name, and metadata collected at signup.
- Users can edit first name, last name, phone, company/business name, default market, business type, preferred payment method, default product type, and support/contact email.

### Data storage

- Editable account details are stored in Supabase Auth `user_metadata`.
- `business_name` is also synced to `profiles.business_name` because the existing app uses it for user/admin display.
- Email remains read-only.
- No migration was required.

### Security/account section

- Profile page is protected by the existing `DashboardShell`/`ProtectedRoute` flow.
- Users only load and update their own Supabase Auth metadata/profile row.
- Password changes link to the existing forgot-password email reset flow.
- Sign out is available from the security section.

### Limitations

- Email change is not implemented.
- Avatar upload is not implemented.
- Wider profile/admin profile management remains deferred.

---

## FASE 5.67 — Prep Quote Acceptance and Payment

Date/time: 2026-05-29 America/Guayaquil

### Scope implemented

- Added proposed migration `20260529_add_prep_payments.sql` for Prep payment tracking fields on `prep_orders`.
- Added customer quote acceptance/payment UI on `/prep/orders/[id]`.
- Added wallet payment endpoint `POST /api/prep-orders/[id]/pay-wallet`.
- Added card checkout endpoint `POST /api/prep-orders/[id]/checkout`.
- Extended Stripe webhook for `metadata.type=prep_order` / `metadata.purpose=prep_order`.
- Added payment status visibility to customer Prep order list/detail and admin Prep list/detail.

### Prep payment behavior

- Customer can pay only their own Prep order.
- Payment is blocked when final quote is missing, final quote is zero, order is cancelled/completed, or payment is already paid/pending.
- Wallet payment debits `balance_movements` with `reference_type=prep_order` and idempotency key `prep-wallet:{prep_order_id}`.
- Card payment creates Stripe Checkout with metadata:
  - `type=prep_order`
  - `purpose=prep_order`
  - `prep_order_id`
  - `user_id`
- Stripe webhook marks Prep order paid, stores payment intent/session references, records paid amount/date, and adds customer-visible "Payment received" event.

### Still intentionally out of scope

- No Prep refunds.
- No automatic partner submission.
- No AI automation.
- No n8n automation.
- No Amazon SP-API.
- No partner API integration.

---

## FASE 5.66 — Prep Admin Operations, Pricing and Partner Workflow

Date/time: 2026-05-29 America/Guayaquil

### Scope implemented

- Improved `/admin/prep-orders` with compact operations list, status filter, search, short order id, units/cartons, quote amount, margin signal, created date, and action-required flag.
- Reworked `/admin/prep-orders/[id]` into an operations console with sections for order summary, customer/contact info, items/SKUs, requested services, pricing and margin, partner/internal workflow, receiving reference, status controls, and timeline events.
- Added admin pricing helpers:
  - estimated total = estimated unit price × total units
  - final total = final unit price × total units
  - margin total = final total − partner cost total
  - manual overrides remain available.
- Status changes can create a default timeline event with admin-selected visibility: customer, internal, or none.
- Customer `/prep/orders` and `/prep/orders/[id]` now show clearer next steps, quote blocks, customer-visible timeline, and receiving reference only when operationally relevant.

### Customer/internal separation

- Customer endpoints continue to omit partner name, partner reference, partner cost, margin, admin notes, internal events, and internal documents.
- Admin detail remains the only place where partner/internal fields are visible.
- `receiving_reference` is the only partner-workflow field intentionally shown to customers when useful.

### Still intentionally out of scope

- No Prep payment collection.
- No AI automation.
- No n8n automation.
- No Amazon SP-API.
- No partner API integration.
- No document upload/storage implementation.

---

## FASE 5.65 — SendiFlash Prep Managed MVP

Date/time: 2026-05-29 America/Guayaquil

### Scope implemented

- Added first manual-managed SendiFlash Prep module for Amazon FBA prep requests.
- Added proposed Supabase migration for `prep_orders`, `prep_order_items`, `prep_order_events`, and `prep_order_documents`.
- Added customer routes: `/prep`, `/prep/new`, `/prep/orders`, and `/prep/orders/[id]`.
- Added admin routes: `/admin/prep-orders` and `/admin/prep-orders/[id]`.
- Added authenticated APIs for users to create/list/view their own Prep orders.
- Added admin-only APIs for listing all Prep orders, updating status/pricing/internal fields, and adding customer/internal events.
- Added navigation entries for FBA Prep and admin Prep Orders.

### Manual-managed posture

- No AI automation.
- No n8n automation.
- No Amazon SP-API.
- No partner API integration.
- No Prep payment collection in this phase.
- Final quote can be updated manually by admin after review.

### Customer/admin separation

- Customers can see their own order summary, item list, customer-visible events, receiving reference, status, and customer estimate/final quote.
- Customers cannot see partner name, partner reference, partner cost, margin, admin notes, internal events, or internal documents.
- Admin can manage internal partner/reference/cost/margin fields and add internal-only events.

### Status workflow

`quote_requested` → `under_review` → `awaiting_inventory` → `inventory_received` → `prep_in_progress` → `ready_to_ship_to_amazon` → `shipped_to_amazon` → `completed`.

Exception statuses: `action_required`, `cancelled`.

### Future phases intentionally deferred

- Prep payments.
- n8n operations automation.
- AI assistant.
- Amazon SP-API.
- Partner API integration.
- Document upload/storage UX.

---

## FASE 5.64 — Dashboard UX Redesign

Date/time: 2026-05-29 12:44 -05

### Scope implemented

- Redesigned `/dashboard` as a SendiFlash operating cockpit.
- Added business-aware greeting using the authenticated user's business name or email prefix.
- Added a compact beta/automatic-label status header.
- Added visual quick actions for create shipment, multi-label beta, wallet balance, My Shipments, Profile, and Support.
- Reworked metric cards for shipments, spend, active shipments, wallet balance, purchased labels, and issues.
- Added a combined recent activity timeline using recent shipments and wallet movements.
- Added operational status card for automatic labels, selected domestic markets, wallet/card payments, and support review.
- Added onboarding next-step prompts for first shipment, wallet balance, profile completion, and support guide.

### Data powering widgets

- Shipments, labels, spend, active shipments, and issue counts use existing user shipment data.
- Wallet balance and recent wallet activity use the existing balance summary endpoint/service.
- Profile completion prompt uses currently available authenticated user/business name data.

### Limitations

- No new dashboard API was added.
- Action-required label orders are inferred only from available shipment/label status data in this user dashboard phase.
- Admin exception analytics remain in admin views.

---

## FASE 5.58 — Final Controlled Beta Deployment Readiness

Date: 2026-05-28

### Commits checked

Local `main`:
- `df6748f Prepare SendiFlash beta onboarding and support`
- `0ea42ff Record selected domestic markets QA`
- `b346cf0 Add multi-country domestic shipping readiness`

Production check indicates `sendiflash.com` is not yet deployed to `df6748f`, because beta support/legal routes added in that commit return 404.

### Production config/status

Checked:
`https://sendiflash.com/api/config/status`

Result:

| Flag/status | Result |
|---|---|
| `buildEnvOk` | `true` |
| `supabaseConfigured` | `true` |
| `serviceRoleConfigured` | `true` |
| `ratesConfigured` | `true` |
| `googleMapsConfigured` | `true` |
| `stripeRechargeConfigured` | `true` |
| `stripeRechargeEnabled` | `true` |
| `activeRateProviders` | `3` |
| `directLabelPaymentEnabled` | `true` |
| `realLabelPurchaseEnabled` | `true` |
| `processLabelInWebhookEnabled` | `true` |
| `labelVoidEnabled` | `false` |
| `labelPaymentRefundsEnabled` | `false` |
| `appUrlHost` | `sendiflash.com` |

No secrets were printed or documented.

### Route checks

Unauthenticated HTTP checks:

| Route | Production result | Notes |
|---|---:|---|
| `/` | 200 | Loads |
| `/login` | 200 | Loads |
| `/registro` | 200 | Loads |
| `/dashboard` | 200 | Protected client shell loads; auth guard requires browser session |
| `/crear-guia` | 200 | Protected client shell loads; auth guard requires browser session |
| `/envios` | 200 | Protected client shell loads; auth guard requires browser session |
| `/saldo` | 200 | Protected client shell loads; auth guard requires browser session |
| `/admin/label-orders` | 200 | Admin shell loads; admin access must be verified with admin session |
| `/support` | 404 | Added in `df6748f`; pending deploy |
| `/terms` | 404 | Added in `df6748f`; pending deploy |
| `/privacy` | 404 | Added in `df6748f`; pending deploy |
| `/support-policy` | 404 | Added in `df6748f`; pending deploy |

Local build generated the new support/legal routes successfully, so the 404s are deployment state, not a local build issue.

### End-to-end beta scenarios to run after redeploy

**A. Card label purchase**
- Create guide.
- Get rates.
- Pay with Stripe card checkout.
- Webhook confirms payment.
- Automatic label processing purchases label.
- User sees tracking/PDF.
- Shipment appears in `/envios`.

**B. Wallet recharge**
- Open `/saldo`.
- Recharge balance through Stripe.
- Webhook credits balance once.
- Ledger shows recharge.

**C. Wallet label purchase**
- Create guide.
- Choose wallet payment.
- Balance is debited using server-computed price.
- Label is purchased.
- Shipment appears in `/envios`.
- Balance does not go negative.

**D. Admin exception flow**
- `action_required` orders are visible in `/admin/label-orders`.
- Retry only appears when safe.
- Completed orders cannot be processed again.
- Refund/void controls remain gated by disabled flags.

**E. Multi-country domestic**
- US → US works or remains confirmed.
- ES → ES / DE → DE pass validation and either return rates or friendly no-rate/provider setup message.
- Cross-border routes are blocked before rates.
- Unsupported countries are blocked before rates.

### Known limitations

- Latest beta onboarding/support commit must be redeployed before inviting users.
- Full browser/session QA for dashboard/admin access was not executed in this pass.
- International/cross-border shipping is not supported.
- Customs, duties, taxes, export documents, promo codes, subscriptions, and multi-currency conversion are not implemented.
- Refunds and voids remain manual/admin-reviewed and disabled by default flags.
- Non-US selected domestic markets may require carrier/provider account setup.

### Final beta decision

**PARTIAL**

Core production config is healthy and routes currently deployed are not returning 500/502. However, the latest beta onboarding/support pages from `df6748f` are not deployed yet, so controlled beta release should wait for redeploy to latest `main` and a quick post-deploy route check.

### Validation results (2026-05-28)

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; local build includes `/support`, `/terms`, `/privacy`, `/support-policy` |
| `git diff --check` | Passed |
| legacy localStorage grep | Expected docs/storage cleanup references only |
| unsafe eval grep | Documentation reference only |
| secret diff grep | No secret-like values found in docs diff |

---

## FASE 5.59 — Create Guide, Payments, Recharge, Performance, and Profit Reporting

Date: 2026-05-29

### Scope

Improved beta usability around create-guide, wallet recharge, payment choices, pricing fee recovery, rates perceived speed, and admin earnings visibility. Multilabel purchase remains intentionally deferred.

### Changes implemented

| Area | Result |
|---|---|
| Test/Beta mode visibility | Admin overview now shows a Test/Beta label mode notice with label/auto-process badges. Operators must keep provider/test credentials unchanged until real launch. |
| Wallet recharge | Presets remain `$10`, `$25`, `$50`, `$100`; custom amount input added with `$5` minimum, `$500` maximum, numeric/two-decimal validation. |
| Create guide layout | From/To are grouped into cleaner cards; package fields are compacted into weight/unit/product and dimensions/unit rows. |
| Product type `Other` | Requires a user-friendly product description before rates; description is used for wallet label `productType` and preserved in card pricing snapshot metadata. |
| Compact rate search summary | During loading and after rates, shipment details collapse to a summary card with an edit button. |
| Draft persistence | `/crear-guia` saves non-sensitive shipment draft data to `localStorage` and restores it after returning from Stripe; clear draft button added. |
| Card checkout | Card checkout opens in a new tab when possible; if blocked, falls back to same-tab redirect with a clear notice. |
| Payment options | Confirm modal always shows wallet and card actions. Wallet can be disabled for insufficient balance while card remains visible/enabled when account gating allows it. |
| Pricing fee formula | Payment fee now uses gross-up cents formula: `ceil((pricingSubtotalCents + fixedFeeCents) / (1 - feePct)) - pricingSubtotalCents`. |
| Rate performance | Aggregator already calls configured providers in parallel; added safe per-provider timing logs, total timing logs, and a 15s per-provider timeout. |
| Admin profit | Admin overview now includes profitability snapshot with date filters, customer charged, provider cost, markup, estimated fees, gross margin, label count, wallet/card split, and recent margin rows. |

### Pricing decision

The gross-up payment fee remains applied to the shared customer price used by both card and wallet paths for this phase. This preserves consistency across displayed price, Stripe charge, wallet debit, `pending_label_orders.amount_cents`, shipment pricing fields, and admin profit reporting. A future phase can introduce wallet-specific discounting if desired.

### Performance observations

- `aggregateRates()` already queries configured providers with `Promise.allSettled`.
- Inactive/unconfigured providers are filtered out by provider capabilities.
- New logs are metadata-only: provider name, duration, counts. No addresses, secrets, or provider credentials are logged.
- A slow provider can now time out after 15 seconds rather than blocking indefinitely.

### Known limitations

- Multilabel/batch purchase is deferred.
- Profitability is an operational estimate, not a full accounting ledger.
- Refund/void accounting remains manual/admin-reviewed.
- Wallet still uses the same customer price as card.
- Stripe popup behavior depends on browser settings; same-tab fallback remains.

### Validation results (2026-05-29)

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| legacy localStorage grep | Expected docs/storage cleanup references only |
| unsafe eval grep | Documentation reference only |
| secret diff grep | No secret-like values found in code/docs diff |

---

## FASE 5.57 — Beta Release Hardening and Onboarding

Date: 2026-05-28

### Scope

Prepared the public and authenticated product experience for controlled beta onboarding. No provider/payment logic, env values, migrations, customs, international shipping, automatic refunds, or automatic voids were added.

### UX updates

| Area | Result |
|---|---|
| Dashboard onboarding | Added a controlled-beta welcome panel with first shipment, wallet balance, My Shipments, and support CTAs. |
| Create guide | Added a concise four-step first-shipment guide and domestic-only note. |
| User-facing status copy | Improved action-required, insufficient wallet, and card checkout failure messages to be friendlier and support-oriented. |
| Support/FAQ | Added `/support` with shipping, payment, label, domestic-market, and review guidance. |
| Policy placeholders | Added `/terms`, `/privacy`, and `/support-policy` beta placeholders. |
| Navigation | Added support/legal links in public header/footer and Help in the dashboard sidebar. |

### Beta operating notes

Current intended flags:
- `ENABLE_DIRECT_LABEL_PAYMENT=true`
- `ENABLE_REAL_LABEL_PURCHASE=true`
- `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`
- `ENABLE_REAL_LABEL_VOID=false`
- `ENABLE_LABEL_PAYMENT_REFUNDS=false`

Known limitations remain:
- International/cross-border shipping is not supported.
- Customs, duties, taxes, and export documents are not implemented.
- Multi-currency conversion is not implemented.
- Refunds and voids remain manual/admin-reviewed and disabled by default flags.
- Non-US selected domestic markets may require provider/carrier account setup before rates return.

### Operator checks before inviting beta users

- [ ] `/support`, `/terms`, `/privacy`, and `/support-policy` load in production.
- [ ] New user sees dashboard onboarding after login.
- [ ] `/crear-guia` shows the first-shipment guide and domestic-only note.
- [ ] US domestic create-guide flow still returns rates and reaches `label_purchased`.
- [ ] My Shipments shows the purchased label/tracking.
- [ ] Action-required user banner shows support review copy without raw provider errors.
- [ ] Refund/void/process-in-webhook flags match intended production config.

### Validation results (2026-05-28)

| Command | Result |
|---|---|
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; new routes `/support`, `/terms`, `/privacy`, and `/support-policy` generated locally |
| `git diff --check` | Passed |
| legacy localStorage grep | Expected docs/storage cleanup references only |
| unsafe eval grep | Documentation reference only |
| secret diff grep | No secret-like values found in code/docs diff |

---

## FASE 5.56 — Controlled QA for Selected Domestic Markets

Date: 2026-05-28

Commit tested:
- `b346cf0 Add multi-country domestic shipping readiness`

### QA scope

This was a local/code-level QA pass for the selected domestic market rules introduced in FASE 5.55. Production provider/account availability and full browser checkout remain operator QA unless explicitly run against the deployed environment.

### Domestic rule matrix

Executed against the real `lib/domesticMarkets.ts` helper with Node's TypeScript stripping:

| Scenario | Result |
|---|---|
| US → US | Passes validation as `US` |
| CA → CA | Passes validation as `CA` |
| ES → ES | Passes validation as `ES` |
| DE → DE | Passes validation as `DE` |
| FR → FR | Passes validation as `FR` |
| GB → GB | Passes validation as `GB` |
| UK → UK | Passes validation as normalized `GB` |
| US → CA | Blocked before rates as cross-border |
| US → ES | Blocked before rates as cross-border |
| ES → DE | Blocked before rates as cross-border |
| FR → GB | Blocked before rates as cross-border |
| CA → US | Blocked before rates as cross-border |
| EC → EC | Blocked as unsupported |
| MX → MX | Blocked as unsupported |

Expected messages preserved:
- Cross-border: `International shipping is coming soon. For now, SendiFlash supports domestic shipments within selected countries.`
- Unsupported: `This country is not available yet.`
- No rates: `No rates were returned for this route. This market may require carrier setup.`

### Address UI inspection

| Check | Result |
|---|---|
| Origin/destination country selector | Implemented with supported countries in `AddressInput.tsx` |
| UK normalization | Implemented server/client helper as `UK` → `GB` |
| State/province/postal labels | Updated away from US-only ZIP copy in create-guide/address UI |
| Google Places country restriction | Uses allowlist from `getGooglePlacesCountryRestrictions()` instead of hardcoded `us` |
| Manual entry | Supports selected country dropdown plus generic state/province/region field for non-US |
| Map picker country guard | Blocks unsupported country values before applying address |

### Rates/API inspection

| Check | Result |
|---|---|
| `/api/rates` blocks cross-border before provider call | Confirmed via `validateDomesticShipmentCountries()` in request parsing |
| `/api/rates` blocks unsupported countries before provider call | Confirmed via central helper |
| Provider country payload | ShipEngine rates payload now sends normalized `country_code` |
| No-rate behavior | Empty provider results return success payload with `rates: []`, diagnostic, and friendly no-rate message |
| Domestic markets actual rate availability | Not run against production provider account in this pass; must be operator-tested per market |

### Checkout/payment guard inspection

| Check | Result |
|---|---|
| Card checkout refuses cross-border/unsupported routes | Confirmed in `/api/billing/label-checkout` before creating pending order/Stripe session |
| Wallet label purchase refuses cross-border/unsupported routes | Confirmed in `createShipEngineShipment` validation |
| Webhook/admin label processor validates snapshots | Confirmed in `labelPurchaseProcessor.validateOrderSnapshots()` |
| Snapshots preserve domestic market | `originCountry`, `destinationCountry`, and `domesticMarket` stored in card snapshot and wallet shipment metadata |
| USD-only limitation | Non-USD rate snapshots blocked in checkout and label processor; no conversion added |

### Existing US flow

Code/build validation passed. A full interactive US flow (create guide → rates → card/wallet pay → automatic label → shipment detail) was not executed in this local QA pass and remains pending operator QA.

### Final decision

**PARTIAL / CODE PASS**

The domestic rule implementation and safety guards pass local QA. Full market usability remains provider/account dependent; selected markets such as ES/DE/FR/GB/CA may require carrier setup even though validation now permits same-country rate attempts.

### Validation results (2026-05-28)

| Command | Result |
|---|---|
| Domestic helper matrix | Passed |
| `npm run lint` | Passed with existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; Next.js reported the existing multiple-lockfile workspace-root warning |
| `git diff --check` | Passed |
| `grep -R "shipflow-user\|shipflow-users"` | Found expected legacy-auth docs/storage cleanup references only |
| `grep -R "unsafe-eval\|eval(\|new Function\|setTimeout("\|setInterval("` | Found documentation reference only |

---

## FASE 5.68 — Public Homepage Two-Service Positioning

### Purpose

Redesign the public homepage hero and add new sections to clearly communicate SendiFlash's two services: Shipping Labels and SendiFlash Prep (managed Amazon FBA prep).

### Changes

| File | Change |
|---|---|
| `app/page.tsx` | New hero headline/subheadline, `DashboardHeroVisual` (browser UI preview replacing SVG hero), two hero CTAs, `TwoServicesSection`, `SellerToolsSection`, updated trust strip, features, use cases, TrustMetricsSection, and final CTA |
| `components/Header.tsx` | Added "Services" nav item linking to `#services` |
| `components/Footer.tsx` | Added "FBA Prep" link in Product column |
| `data/site.ts` | Added 2 Prep-related FAQ items |

### Hero

- New headline: "Ship faster. Prep smarter. Scale your logistics."
- New badge: "Shipping Labels · Amazon FBA Prep · One account"
- New subheadline: "Compare rates, create shipping labels, request Amazon FBA prep, and track every order from a single SendiFlash account."
- Primary CTA: "Start shipping" → `/registro`
- Secondary CTA: "Explore FBA Prep" → `/registro?service=prep`
- Hero visual: `DashboardHeroVisual` — browser chrome with two mini-card UI preview (Shipping Labels left / Prep right) + status chip strip (Wallet · Card payment · Tracking · FBA Prep · Seller tools)

### Two-service section (`#services`)

- Card 1: SendiFlash Shipping — Truck icon, blue gradient, 4 bullet features, CTA "Create a label" → `/crear-guia`
- Card 2: SendiFlash Prep — Package icon, orange gradient, 4 bullet features, disclaimer about manual management and quote variability, CTA "Request FBA prep" → `/registro?service=prep`

### Seller tools hub section (`#seller-tools`)

Six tool cards: Shipping Label Generator (`/crear-guia`), FBA Prep Request (`/registro?service=prep`), Wallet & Balance (`/saldo`), Shipment Tracking (`/envios`), Prep Orders (`/prep/orders`), Seller Workspace (`/dashboard`). All link to existing authenticated routes; auth guard handles unauthenticated access.

### Copy rules observed

- "SendiFlash Shipping" and "SendiFlash Prep" used consistently.
- "Managed Amazon FBA prep service" — not "AI-automated" or "AMZ Prep".
- "Services may be performed by SendiFlash or logistics partners."
- "Final prep quote may vary after review."
- "Domestic shipping in selected markets."
- No guarantee of lowest price, no international shipping promise.

### Safety / not touched

- No `.env` files, secrets, Stripe keys, Supabase keys, or provider credentials.
- No migrations.
- No label purchase, label pricing, or label order processing logic.
- No Prep payment, wallet, refund, or void logic.
- No auth/captcha logic.

### Validation results (2026-05-29)

| Command | Result |
|---|---|
| `npm run lint` | 0 errors, 6 pre-existing warnings in `MockAdapter.ts` and `trackingService.ts` |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; `/` and all other routes build cleanly |
| `git diff --check` | Passed |

---

## FASE 5.69 — Dedicated service pages and absolute anchor navigation

**Date:** 2026-05-29

### Changes

| Area | Change |
|---|---|
| Header nav | All anchor links changed to absolute paths (`/#services`, `/#features`, `/#how-it-works`, `/#pricing`, `/#faq`). Correct from all pages including `/support`, `/shipping-labels`, `/fba-prep`, `/login`, `/registro`. |
| Homepage hero | Secondary CTA changed from `/registro?service=prep` → `/fba-prep`. |
| Homepage `TwoServicesSection` | Shipping card: primary CTA → `/shipping-labels` ("See Shipping Labels"), secondary text link → `/crear-guia` ("Create a label"). Prep card: primary CTA → `/fba-prep` ("See FBA Prep"), secondary text link → `/registro?service=prep` ("Request FBA prep"). |
| Homepage `sellerTools` | Replaced "Prep Orders" and "Seller Workspace" with "Shipping Labels Guide" → `/shipping-labels` and "FBA Prep Guide" → `/fba-prep`. Still 6 tools in clean 2×3 grid. |
| Footer | Product column updated: Shipping Labels → `/shipping-labels`, FBA Prep → `/fba-prep`, Create a label → `/crear-guia`, Prep orders → `/prep/orders`. "Tracking" link removed (accessible from dashboard). |
| `/shipping-labels` | New public marketing page: hero + QuotePreview, 6 benefit cards, 4 how-it-works steps, carrier comparison, NationwideRoute tracking visual, domestic scope notice, CTA. |
| `/fba-prep` | New public marketing page: hero + prep request preview, "What is SendiFlash Prep" section, 8 service cards, 5-step workflow, transparency notice, CTA. |

### Safety confirmation

- No `.env` files, secrets, Stripe/Supabase keys, or provider credentials changed.
- No migrations.
- No label purchase, label pricing, or label order processing logic touched.
- No Prep payment, wallet, refund, or void logic touched.
- No auth/captcha logic touched.
- No admin logic touched.

### Validation

| Check | Result |
|---|---|
| `npm run lint` | 0 errors |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; `/`, `/shipping-labels`, `/fba-prep`, and all other routes build cleanly |
| `git diff --check` | Passed |
