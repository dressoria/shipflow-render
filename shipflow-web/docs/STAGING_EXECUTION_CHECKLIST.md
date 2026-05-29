# Staging Execution Checklist

Last updated: 2026-05-28 (FASE 5.55)

Purpose: controlled VM/staging QA for ShipFlow / SendiFlash direct label payment, manual label processing, and sandbox provider behavior.

Do not deploy production-wide. Do not apply migrations automatically. Do not print secrets. Do not buy real labels or execute real refunds without explicit confirmation.

## FASE 5.46 Final PASS Snapshot

- [x] Existing order `08ff529a-f140-46e0-bcef-629cb355f604` retried successfully after `4559d27`.
- [x] `pending_label_orders.status = label_purchased`.
- [x] `shipment_id = 281839b8-65d4-468e-8c22-0d82b1d156ad`.
- [x] `label_id = se-154184403`.
- [x] `tracking_number = 1ZXXXXXXXXXXXXXXXX-08ff529a`.
- [x] `error_message = null`.
- [x] Shipment metadata preserves `provider_tracking_number_original = 1ZXXXXXXXXXXXXXXXX`.
- [x] Shipment metadata marks `tracking_number_was_placeholder = true`.
- [x] Shipment metadata marks `tracking_number_internal_fallback = true`.
- [x] User success page shows label ready, tracking, `UPS Next Day Air® via shipstation`, and "View in My Shipments".

## FASE 5.47 Clean E2E Test Runbook

Current required flags:

- `directLabelPaymentEnabled=true`
- `realLabelPurchaseEnabled=true`
- `processLabelInWebhookEnabled=false`
- `labelVoidEnabled=false`
- `labelPaymentRefundsEnabled=false`

Pre-check:

```bash
curl -s https://sendiflash.com/api/config/status
```

Clean browser flow:

1. Sign in as the allowed verified test user.
2. Open `https://sendiflash.com/crear-guia`.
3. Create a New York, NY → Chicago, IL test shipment.
4. Package: 1 lb, 1x1x1 in.
5. Get rates.
6. Select one rate.
7. Pay with Stripe test card.
8. After redirect, verify the new order reaches `paid_waiting_label_purchase`.
9. Open `https://sendiflash.com/admin/label-orders`.
10. Find the new paid order.
11. Click `Process label` exactly once.
12. Verify the order reaches `label_purchased`.
13. Verify a shipment is created.
14. Verify the user success URL shows label ready and tracking.

Post-run pending order query:

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

Post-run shipment query:

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

Expected PASS criteria:

- New clean order reaches `label_purchased`.
- `stripe_payment_intent_id`, `paid_at`, `label_id`, `shipment_id`, `tracking_number`, and `processed_at` are populated.
- `error_message = null`.
- Newest shipment has `label_status = purchased`.
- `label_url` is available if sandbox returns a PDF.
- If sandbox returns placeholder tracking, fallback metadata is present.
- User success page shows label ready, tracking, and "View in My Shipments".
- Refunds, voids, and webhook auto-processing remain disabled.

## FASE 5.48 Manual Admin Processing Hardening Checklist

- [x] `Process label` cannot be double-submitted from the modal UI.
- [x] `Process label` shows `Processing…` while the request is in flight.
- [x] `Process label` is disabled while processing.
- [x] `label_purchased` orders show a completed-state explanation and cannot be processed again from the UI.
- [x] `paid_waiting_label_purchase` orders can be processed only when no label/shipment/tracking data exists yet.
- [x] `action_required` retry is visible only when no `label_id`, `shipment_id`, or `tracking_number` exists.
- [x] Unsafe `action_required` retry explains that manual review is required to avoid duplicate carrier purchase.
- [x] Successful processing refreshes the order detail and reloads the admin list.
- [x] Processing failures remain visible in the existing admin error panel.
- [x] No Stripe webhook behavior changed.
- [x] No env files, migrations, refunds, voids, wallet, or process-in-webhook flags changed.

## FASE 5.49 Automatic Processing QA Checklist

Manual mode pre-check:

- [ ] Confirm `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false` leaves paid orders in `paid_waiting_label_purchase`.
- [ ] Confirm admin can still process `paid_waiting_label_purchase` manually.
- [ ] Confirm admin can still retry clean `action_required` orders.

Automatic mode pre-check:

- [ ] Enable `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` manually in the target environment only.
- [ ] Do not enable refunds.
- [ ] Do not enable voids.
- [ ] Confirm `/api/config/status` shows `processLabelInWebhookEnabled=true`.

Automatic mode clean run:

- [ ] Create a new guide as allowed test user.
- [ ] Pay with Stripe test card.
- [ ] Confirm webhook records `paid_at` and `stripe_payment_intent_id`.
- [ ] Confirm webhook automatically purchases the label.
- [ ] Confirm newest `pending_label_orders.status = label_purchased`.
- [ ] Confirm `label_id`, `tracking_number`, `shipment_id`, and `processed_at` are populated.
- [ ] Confirm newest shipment has `label_status = purchased`.
- [ ] Confirm `metadata.pending_label_order_id` and `metadata.stripe_payment_intent_id` are present.
- [ ] If sandbox placeholder tracking is returned, confirm fallback metadata preserves the original tracking number.
- [ ] Confirm user success page moves from preparing state to label ready without admin intervention.
- [ ] Confirm My Shipments shows the shipment.

Automatic failure QA:

- [ ] If carrier/rate/provider fails, confirm webhook returns 200 to Stripe.
- [ ] Confirm order becomes `action_required`.
- [ ] Confirm `error_message` is clear for admin and safe for user display.
- [ ] Confirm no refund is attempted.
- [ ] Confirm no void is attempted.
- [ ] Confirm admin can retry manually only if no label/shipment/tracking data exists.

## FASE 5.50 Production Activation Checklist

Activation code:

- [ ] Deploy `c65ea8e` or newer.
- [ ] Confirm `git log --oneline -8` shows `c65ea8e`.

VM env changes, VM only:

- [ ] Set `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`.
- [ ] Keep `ENABLE_REAL_LABEL_VOID=false`.
- [ ] Keep `ENABLE_LABEL_PAYMENT_REFUNDS=false`.
- [ ] Do not commit `.env.production`.

Runtime status:

- [ ] `directLabelPaymentEnabled=true`.
- [ ] `realLabelPurchaseEnabled=true`.
- [ ] `processLabelInWebhookEnabled=true`.
- [ ] `labelVoidEnabled=false`.
- [ ] `labelPaymentRefundsEnabled=false`.

Automatic order QA:

- [ ] Create a clean order as allowlisted test user.
- [ ] Pay with Stripe test card.
- [ ] Do not click admin `Process label`.
- [ ] Confirm webhook automatically moves order to `label_purchased`.
- [ ] Confirm shipment is created.
- [ ] Confirm tracking, label id, shipment id, and label URL when returned.
- [ ] Confirm user success page shows "Your label is ready".
- [ ] Confirm My Shipments shows the shipment.
- [ ] Confirm admin shows completed state.

Safety:

- [ ] No refund executed.
- [ ] No void executed.
- [ ] No env file committed.
- [ ] No secrets printed.

## FASE 5.51 Operating UX Checklist

User shipment history:

- [x] `/envios` explains that labels appear automatically after checkout.
- [x] Shipment cards/table show tracking number, carrier/provider, service, status, label status, created date, price, and actions.
- [x] Label/PDF action is visible when `label_url` exists.
- [x] Loading, empty, and error states are clear.
- [x] Mobile shipment cards remain usable.

Shipment detail:

- [x] `/guia/[tracking]` shows tracking, carrier/provider, service, label status, payment status, created date, and provider references.
- [x] User can copy tracking.
- [x] User can open the carrier label PDF when available.
- [x] Raw metadata is not shown to normal users.
- [x] Access still depends on verified user shipment ownership through the shipments API.

Admin exceptions:

- [x] Admin label orders page explains automatic mode and exception-only operation.
- [x] Quick filters exist for needs review, waiting, processing, and completed.
- [x] `action_required` and waiting rows are visually distinct.
- [x] Table includes user id, amount, provider/service, tracking, created date, and status.
- [x] Existing safe retry and double-submit protections remain unchanged.

Safety:

- [x] No env file edits.
- [x] No migrations.
- [x] No refunds enabled or executed.
- [x] No voids enabled or executed.
- [x] No wallet changes.
- [x] No public landing redesign.
- [x] No provider credential changes.

## FASE 5.52 Manual Refund/Void Admin Checklist

Current flags:

- [x] `ENABLE_REAL_LABEL_VOID=false`.
- [x] `ENABLE_LABEL_PAYMENT_REFUNDS=false`.
- [x] No automatic refund behavior enabled.
- [x] No automatic void behavior enabled.

Audit results:

- [x] Admin Stripe refund endpoint exists: `/api/admin/label-orders/[id]/refund`.
- [x] Manual refund recording endpoint exists: `/api/admin/label-orders/[id]/mark-refunded-manual`.
- [x] Provider void endpoint exists and is now admin-only: `/api/labels/[id]/void`.
- [x] ShipStation/ShipEngine void helpers already exist.
- [x] Shipment label statuses include `purchased`, `voided`, and `refunded`.
- [x] Pending label order refund fields are mapped.

Refund QA when flag is enabled in a controlled environment:

- [ ] Admin sees Stripe refund disabled when `ENABLE_LABEL_PAYMENT_REFUNDS=false`.
- [ ] Refund button enables only for eligible paid orders with no `label_id`, `shipment_id`, or `tracking_number`.
- [ ] Refund is blocked without `stripe_payment_intent_id`.
- [ ] Refund is blocked without `paid_at`.
- [ ] Refund is blocked for `refund_pending` and `refunded`.
- [ ] Refund is blocked for `label_purchased`.
- [ ] Repeated request uses Stripe idempotency key `label-refund-{order.id}` and does not double refund.
- [ ] Manual refunded recording is only used after Stripe Dashboard verification.

Void QA when flag is enabled in a controlled environment:

- [ ] Normal users do not see void controls in `/envios`.
- [ ] Non-admin API callers cannot void labels.
- [ ] Admin sees carrier void disabled when `ENABLE_REAL_LABEL_VOID=false`.
- [ ] Void button enables only for purchased labels with `shipment_id`, `label_id`, and `tracking_number`.
- [ ] Void is blocked if shipment `label_status` is not `purchased`.
- [ ] Void is blocked if shipment is already `voided`.
- [ ] Duplicate void returns current voided state and does not call provider twice.
- [ ] Existing refund movement blocks duplicate void/refund persistence.
- [ ] Successful void stores `shipments.metadata.label_void` with provider status/message, admin user, timestamp, and refund marker.

Safety:

- [x] No env file edits.
- [x] No migrations.
- [x] No wallet feature added.
- [x] No public landing changes.
- [x] No provider credential changes.
- [x] No refund or void executed by Codex.

## FASE 5.55 Controlled Beta Release QA Checklist

Commit/config:

- [x] Local HEAD reviewed: `04db119 Add pricing margin controls for labels`.
- [x] History includes `c65ea8e`, `df37081`, `6ab4e4a`, `55842bb`, and `04db119`.
- [x] Working tree was clean before docs update.
- [x] `/api/config/status` reports `directLabelPaymentEnabled=true`.
- [x] `/api/config/status` reports `realLabelPurchaseEnabled=true`.
- [x] `/api/config/status` reports `processLabelInWebhookEnabled=true`.
- [x] `/api/config/status` reports `labelVoidEnabled=false`.
- [x] `/api/config/status` reports `labelPaymentRefundsEnabled=false`.
- [x] `/api/config/status` reports `stripeRechargeEnabled=true`.
- [x] `/api/config/status` reports `buildEnvOk=true`.

Public/app shell smoke:

- [x] `/` returns HTTP 200.
- [x] `/login` returns HTTP 200.
- [x] `/registro` returns HTTP 200.
- [x] `/crear-guia` returns HTTP 200 app shell.
- [x] `/saldo` returns HTTP 200 app shell.
- [x] `/admin/label-orders` returns HTTP 200 app shell.

Manual browser QA required:

- [ ] Signup works end-to-end.
- [ ] Login works and redirects verified user to dashboard/create guide.
- [ ] Unauthenticated users are redirected safely where required.
- [ ] Create guide origin/destination/package validation works.
- [ ] Get rates works with real configured providers.
- [ ] Rate cards show final customer price.
- [ ] Direct-card checkout amount equals displayed price.
- [ ] Stripe webhook automatically buys label when `processLabelInWebhookEnabled=true`.
- [ ] New direct-card order reaches `label_purchased`.
- [ ] New shipment has tracking/PDF and appears in My Shipments.
- [ ] Wallet recharge credits balance once.
- [ ] Wallet label purchase debits server-computed customer price.
- [ ] Wallet balance cannot go negative.
- [ ] Shipment detail copy tracking and label PDF links work.
- [ ] User cannot see another user's shipments.
- [ ] Admin quick filters work.
- [ ] Admin completed labels cannot be processed again.
- [ ] Admin safe retry appears only for clean `action_required` orders.
- [ ] Refund/void controls remain disabled or unavailable while flags are false.

Pricing/margin QA required:

- [ ] Displayed price equals Stripe direct charge.
- [ ] Displayed price equals wallet debit.
- [ ] `pending_label_orders.amount_cents` equals charged direct-card amount.
- [ ] Shipment/admin displays provider cost, customer price, and margin.
- [ ] Customer price is never below provider cost.
- [ ] No floating point money issue observed in cents/ledger values.

Safety:

- [x] No env files changed.
- [x] No secrets printed.
- [x] No provider credentials touched.
- [x] No migrations applied by Codex.
- [x] No refunds executed.
- [x] No voids executed.
- [x] No automatic refund/void behavior enabled.

## 1. Local Pre-Check

- [ ] Working tree reviewed:

```bash
git status --short
```

- [ ] Local branch is up to date with `main`:

```bash
git branch --show-current
git log -1 --oneline
git fetch origin
git status -sb
```

- [ ] Validation commands passed:

```bash
cd "/Users/andres/Desktop/enviafacil/Ship flow/shipflow-web"
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

- [ ] No real env file is tracked or staged:

```bash
git ls-files | grep -E '(^|/)\.env($|\.local$|\.production$)' || true
git status --short | grep -E '(^|/)\.env($|\.local$|\.production$)' || true
```

- [ ] `.env.example` keeps all sensitive label-payment flags false:

```bash
grep -E 'ENABLE_DIRECT_LABEL_PAYMENT|ENABLE_REAL_LABEL_PURCHASE|ENABLE_REAL_LABEL_VOID|ENABLE_PROCESS_LABEL_IN_WEBHOOK|ENABLE_LABEL_PAYMENT_REFUNDS' .env.example
```

Expected:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

## 2. VM Pre-Check

VM path:

```bash
cd /home/ubuntu/appsolux-apps/shipflow/shipflow
```

Update code:

```bash
git status --short
git fetch origin main
git reset --hard origin/main
git log -1 --oneline
```

Use `git reset --hard origin/main` only in the VM staging checkout after confirming there are no local VM-only changes to preserve.

Verify deployment files exist:

```bash
test -f docker-compose.yml && echo "docker-compose.yml: ok"
test -f shipflow-web/Dockerfile && echo "shipflow-web/Dockerfile: ok"
test -f shipflow-web/.env.production && echo "shipflow-web/.env.production: present"
```

Verify required env variable names only. This prints `set` or `missing`, never values:

```bash
awk -F= '/^[A-Z0-9_]+=/{print $1}' shipflow-web/.env.production | sort
```

Optional presence check, still without printing values:

```bash
set -a
source shipflow-web/.env.production
set +a

for name in \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXT_PUBLIC_APP_URL \
  SUPABASE_SERVICE_ROLE_KEY \
  STRIPE_SECRET_KEY \
  STRIPE_WEBHOOK_SECRET \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  SHIPSTATION_API_MODE \
  SHIPSTATION_API_KEY \
  SHIPSTATION_BASE_URL \
  ADMIN_EMAILS \
  ENABLE_DIRECT_LABEL_PAYMENT \
  ENABLE_REAL_LABEL_PURCHASE \
  ENABLE_REAL_LABEL_VOID \
  ENABLE_PROCESS_LABEL_IN_WEBHOOK \
  ENABLE_LABEL_PAYMENT_REFUNDS
do
  if [ -n "${!name:-}" ]; then
    echo "$name=set"
  else
    echo "$name=missing"
  fi
done
```

## 3. Build VM

Build and restart only after code is committed/pushed and VM pre-checks pass:

```bash
cd /home/ubuntu/appsolux-apps/shipflow/shipflow
set -a
source shipflow-web/.env.production
set +a

docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true
curl -s http://localhost:3003/api/config/status
```

Initial expected config:

- `buildEnvOk: true`
- `supabaseConfigured: true`
- `serviceRoleConfigured: true`
- `stripeRechargeEnabled: true`
- `googleMapsConfigured: true`
- `directLabelPaymentEnabled: false`
- `realLabelPurchaseEnabled: false`
- `labelVoidEnabled: false`
- `processLabelInWebhookEnabled: false`
- `labelPaymentRefundsEnabled: false`

## 4. Staging Migrations

Apply manually in Supabase Dashboard SQL Editor, staging first:

1. `shipflow-web/supabase/migrations/20260524_add_pending_label_orders.sql`
2. `shipflow-web/supabase/migrations/20260524_add_label_checkout_rate_limits.sql`

Do not apply automatically from the agent. Do not run against production first.

### Verification Queries

Columns:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pending_label_orders'
ORDER BY ordinal_position;
```

Enum values:

```sql
SELECT unnest(enum_range(NULL::pending_label_order_status))::text AS status
ORDER BY 1;
```

Expected:

```text
action_required
canceled
expired
label_purchase_pending
label_purchased
paid_test_mode
paid_waiting_label_purchase
pending_payment
refund_needed
refund_pending
refunded
```

RLS:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('pending_label_orders', 'label_checkout_attempts')
ORDER BY relname;
```

Policies:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('pending_label_orders', 'label_checkout_attempts')
ORDER BY tablename, policyname;
```

Expected:

- `pending_label_orders` has user SELECT own policy.
- `pending_label_orders` has no user INSERT/UPDATE/DELETE policies.
- `label_checkout_attempts` has RLS enabled and no user policies.

Indexes:

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename IN ('pending_label_orders', 'label_checkout_attempts')
ORDER BY tablename, indexname;
```

Triggers:

```sql
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'pending_label_orders'
ORDER BY trigger_name;
```

Initial counts:

```sql
SELECT COUNT(*) AS pending_label_orders_count FROM pending_label_orders;
SELECT COUNT(*) AS label_checkout_attempts_count FROM label_checkout_attempts;
```

## 5. Initial Flags

Before any QA:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Confirm:

```bash
curl -s http://localhost:3003/api/config/status
```

## 6. QA Auth

Run these tests at `https://sendiflash.com` after the VM build is healthy and before applying label migrations.

- [ ] Register a new user.
- [ ] Email verification arrives from the configured sender.
- [ ] Verified user can login.
- [ ] Logout clears app session.
- [ ] Forgot password email arrives.
- [ ] Reset password succeeds.
- [ ] Unverified user is blocked from protected routes and sensitive APIs.
- [ ] Fake `localStorage` keys do not grant access:

```js
localStorage.setItem("shipflow-user", JSON.stringify({ email: "fake@test.com", role: "user", emailVerified: true }))
localStorage.setItem("shipflow-balance", "999")
location.href = "/dashboard"
```

Expected: no dashboard access unless Supabase session is valid, legacy keys are ignored/cleaned when Supabase is configured, and fake balance is never shown.

### Auth Loop Regression Tests

No active Supabase session:

- [ ] `/dashboard` redirects to `/login`.
- [ ] `/login` shows the login form.
- [ ] `/registro` shows the registration form.
- [ ] `/verifica-tu-correo?resend=true` shows an email input and does not redirect to `/login`.

Verified Supabase session:

- [ ] `/login` redirects to `/dashboard`.
- [ ] `/registro` shows "Already signed in" with `Go to my dashboard` and `Sign out`.
- [ ] `/verifica-tu-correo` redirects to `/dashboard`.
- [ ] `/dashboard` renders normally.

Unverified Supabase session:

- [ ] `/dashboard` redirects to `/verifica-tu-correo`.
- [ ] `/login` does not loop; it sends the user to verification or shows clear verification guidance.
- [ ] `/registro` does not create another account over the active session.
- [ ] `/verifica-tu-correo` shows resend and "I already verified" actions.
- [ ] "I already verified" stays on the page if Supabase still reports unverified.

Existing account registration:

- [ ] Attempt to register with an email that already exists.
- [ ] No profile is created or modified.
- [ ] User is not signed in.
- [ ] User is not sent to dashboard.
- [ ] UI shows "Account may already exist".
- [ ] `Go to login` works.
- [ ] `Resend verification email` opens `/verifica-tu-correo?resend=true`.
- [ ] `Forgot password` opens `/forgot-password`.

Detailed browser cases for FASE 5.42:

- [ ] No session: incognito `/dashboard` redirects to `/login`; dashboard, balance, and `$128.70` are not shown.
- [ ] Verified existing session: after logging in, close the tab and visit `/login`; it redirects to `/dashboard` without asking for login again.
- [ ] Verified session on `/registro`: shows `Already signed in`, `Go to my dashboard`, and `Sign out`; it does not show the registration form.
- [ ] Existing email registration: does not create a user, does not modify password/profile, does not enter dashboard, and shows `Go to login`, `Resend verification email`, `Forgot password`.
- [ ] Unverified user: `/dashboard` redirects to `/verifica-tu-correo`; `I already verified` stays on the page if Supabase still reports unverified; resend sends a verification email.
- [ ] `/verifica-tu-correo?resend=true`: without session, shows an email input and returns a neutral message after submit.
- [ ] Forgot/reset password: `/forgot-password` sends an email; reset link opens `/reset-password`; new password works.
- [ ] LocalStorage fake: `shipflow-user` and `shipflow-balance` do not grant access or show fake balance.

## 7. QA API With Flags Off

Run from the VM after the service is up. These commands must not include bearer tokens.

```bash
curl -i http://localhost:3003/api/auth/me
curl -i http://localhost:3003/api/balance
curl -i "http://localhost:3003/api/shipments?limit=10"
curl -i -X POST http://localhost:3003/api/billing/label-checkout
curl -i http://localhost:3003/api/config/status
curl -i http://localhost:3003/api/config/features
```

Expected:

- `/api/auth/me` returns `authenticated: false`.
- `/api/balance` returns 401.
- `/api/shipments` returns 401.
- `POST /api/billing/label-checkout` without token returns 401/403/503 depending on auth/config order, but it never creates Stripe Checkout or pending orders.
- `/api/config/status` shows all dangerous label flags false and does not expose allowlists.
- `/api/config/features` without token returns 401/403 or a safe response, and never exposes emails, user ids, or secrets.

## 8. QA Labels Disabled With Flags Off

Preconditions:

- `ENABLE_DIRECT_LABEL_PAYMENT=false`
- `ENABLE_REAL_LABEL_PURCHASE=false`
- `ENABLE_REAL_LABEL_VOID=false`
- `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false`
- `ENABLE_LABEL_PAYMENT_REFUNDS=false`
- `pending_label_orders` migration has not been applied yet.
- `label_checkout_rate_limits` migration has not been applied yet.

With a verified user:

- [ ] Visit `/crear-guia`.
- [ ] Quote rates.
- [ ] Simulate insufficient balance.
- [ ] Pay by card is disabled or marked `Soon`.
- [ ] No Stripe Checkout is created.
- [ ] No carrier label is purchased.
- [ ] Wallet balance does not change.
- [ ] No `pending_label_order` is created because migrations are not applied and direct payment is off.
- [ ] `/api/config/status` reports `directLabelPaymentEnabled=false`, `realLabelPurchaseEnabled=false`, and `labelVoidEnabled=false`.

## 9. No Migrations / No Flags Confirmation

Before ending FASE 5.42, confirm and record in `docs/STAGING_QA_RESULTS.md`:

- [ ] `pending_label_orders` migration was not applied.
- [ ] `label_checkout_rate_limits` migration was not applied.
- [ ] `ENABLE_DIRECT_LABEL_PAYMENT=false`.
- [ ] `ENABLE_REAL_LABEL_PURCHASE=false`.
- [ ] `ENABLE_REAL_LABEL_VOID=false`.
- [ ] `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false`.
- [ ] `ENABLE_LABEL_PAYMENT_REFUNDS=false`.

If any sensitive flag is already true in VM `.env.production`, stop and report it as a staging risk. Do not change VM env automatically from the agent.

## 10. QA Wallet Recharge

- [ ] Start wallet recharge in Stripe test mode.
- [ ] Complete Stripe Checkout using a Stripe test card.
- [ ] Stripe webhook is received and signature validated.
- [ ] `payment_recharges.status = 'paid'`.
- [ ] One `balance_movements` recharge is created.
- [ ] Duplicate webhook does not duplicate balance.
- [ ] Audit event exists for recharge.
- [ ] `pending_label_orders` remains unchanged.

Verification SQL:

```sql
SELECT status, amount, currency, stripe_checkout_session_id, stripe_payment_intent_id
FROM payment_recharges
ORDER BY created_at DESC
LIMIT 5;

SELECT type, amount, reference_type, reference_id
FROM balance_movements
ORDER BY created_at DESC
LIMIT 5;

SELECT COUNT(*) FROM pending_label_orders;
```

## 11. QA Direct Label Payment Test

Step A: apply migrations manually in Supabase staging only:

1. `pending_label_orders`
2. `label_checkout_rate_limits`

Step B: verify columns, enum, RLS, policies, indexes, triggers, and counts using section 4 queries.

Step C: enable only direct payment for the internal account:

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_REAL_LABEL_PURCHASE=false
```

Keep:

```env
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Rebuild/restart if env loading requires it.

Test:

- [ ] Allowlisted verified user has insufficient wallet balance.
- [ ] UI shows Pay by card option.
- [ ] Non-allowlisted account cannot start direct label payment.
- [ ] Pay by card creates `pending_label_orders.status = 'pending_payment'`.
- [ ] Stripe test card completes checkout.
- [ ] Webhook marks order `paid_test_mode`.
- [ ] No carrier label is purchased.
- [ ] No wallet debit is created.
- [ ] Admin sees order in `/admin/label-orders`.

Verification SQL:

```sql
SELECT id, user_id, status, amount_cents, stripe_checkout_session_id,
       stripe_payment_intent_id, paid_at, processed_at
FROM pending_label_orders
ORDER BY created_at DESC
LIMIT 10;
```

## 12. QA Process Label Sandbox Controlled

Step D: only after auth + direct payment QA are OK, enable real purchase for the internal test user:

```env
ENABLE_REAL_LABEL_PURCHASE=true
REAL_LABEL_PURCHASE_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
```

Keep:

```env
ENABLE_REAL_LABEL_VOID=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Preconditions:

- Carrier credentials must be sandbox/test credentials.
- `SHIPSTATION_API_MODE=shipengine`.
- Do not run if credentials could purchase live labels.
- Do not use customer emails.
- Do not enable global allowlists.
- Do not enable void.
- Do not enable refunds unless running section 10.

Test:

- [ ] Create a paid direct label order.
- [ ] Confirm order is `paid_waiting_label_purchase` when real purchase is enabled.
- [ ] Admin clicks `Process label`.
- [ ] Claim lock changes order to `label_purchase_pending`.
- [ ] Double click / repeated request does not call provider twice.
- [ ] Provider sandbox call succeeds or fails safely.
- [ ] Success: order becomes `label_purchased`.
- [ ] Failure: order becomes `refund_needed` or `action_required`.
- [ ] Shipment persisted without wallet debit.

Verification SQL:

```sql
SELECT id, status, shipment_id, label_id, tracking_number, error_message,
       paid_at, processed_at
FROM pending_label_orders
ORDER BY created_at DESC
LIMIT 10;

SELECT id, user_id, tracking_number, payment_status, label_status,
       pricing_model, metadata
FROM shipments
ORDER BY created_at DESC
LIMIT 10;

SELECT type, amount, reference_type, reference_id
FROM balance_movements
ORDER BY created_at DESC
LIMIT 10;
```

## 13. QA Refund Test

Enable:

```env
ENABLE_LABEL_PAYMENT_REFUNDS=true
LABEL_PAYMENT_REFUND_ALLOWED_EMAILS=131studio.ec@gmail.com
```

Keep:

```env
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
```

Preconditions:

- Stripe must be in test mode.
- Order must be eligible, usually `refund_needed`, `paid_test_mode`, `action_required`, or `paid_waiting_label_purchase`.
- Order must have `stripe_payment_intent_id` and `paid_at`.
- Order must not have `label_id` or `tracking_number`.

Test:

- [ ] Mark an eligible order `refund_needed`.
- [ ] Non-allowlisted admin receives 403 or disabled UI.
- [ ] Allowlisted admin opens refund modal.
- [ ] Confirmation requires typing `REFUND`.
- [ ] Refund starts and order moves to `refund_pending`.
- [ ] Stripe test refund succeeds.
- [ ] Order moves to `refunded`.
- [ ] `stripe_refund_id` and `refunded_at` are saved.
- [ ] Double click / repeated request does not duplicate refund.
- [ ] Wallet balance is not changed by direct label payment refund.

Verification SQL:

```sql
SELECT id, status, stripe_payment_intent_id, stripe_refund_id,
       refund_attempted_at, refunded_at, refund_error_message
FROM pending_label_orders
ORDER BY updated_at DESC
LIMIT 10;

SELECT type, amount, reference_type, reference_id
FROM balance_movements
ORDER BY created_at DESC
LIMIT 10;
```

## 14. Rollback

Turn off every sensitive flag:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Then rebuild/restart if env changes require it:

```bash
set -a
source shipflow-web/.env.production
set +a
docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
curl -s http://localhost:3003/api/config/status
```

Rules:

- Do not drop tables in production.
- Do not reset DB.
- Document paid orders before disabling flows.
- For `pending_payment`, let expiry handle stale orders.
- For `paid_test_mode` or `refund_needed`, support reviews in `/admin/label-orders`.
- For captured payments without labels, use Stripe Dashboard if app refunds are disabled.

## 15. FASE 5.44 — UX Polish QA Items

Changes in FASE 5.44 (no migration required, all flags remain off):

- After Stripe Checkout returns `?labelPayment=success&order_id=<id>`, the success page fetches `GET /api/billing/label-orders/[id]` and shows a status-specific message (`paid_test_mode`, `paid_waiting_label_purchase`, `label_purchased` with tracking number, `action_required`, `refund_needed`, etc.).
- After admin **Process label** succeeds, the order row auto-updates to `label_purchased` without a page reload.
- `apiAdminGetLabelOrder` helper added to `apiClient.ts`.
- "Pay by card" disabled tooltip distinguishes flag-off vs. user-not-allowlisted.

QA items for this section:

- [ ] Success page shows status-specific message after sandbox checkout.
- [ ] Missing `order_id` in URL shows generic success message without error.
- [ ] Admin process-label refreshes order row on success.
- [ ] "Pay by card" tooltip shows correct reason when disabled.

## 16. FASE 5.45 — Failure/Refund/Support Operations Readiness

Changes in FASE 5.45 (no migration required, all flags remain off):

### State machine single source of truth

New file `lib/label-order-status.ts` exports:

| Export | Purpose |
|---|---|
| `CAN_PROCESS_LABEL_STATUSES` | paid_waiting_label_purchase, label_purchase_pending, action_required when no label/shipment/tracking is saved |
| `CAN_MARK_ACTION_REQUIRED_STATUSES` | pending_payment, paid_test_mode, paid_waiting_*, label_purchase_pending |
| `CAN_MARK_REFUND_NEEDED_STATUSES` | paid_test_mode, paid_waiting_*, label_purchase_pending, action_required |
| `CAN_REFUND_LABEL_ORDER_STATUSES` | refund_needed, action_required, paid_test_mode, paid_waiting_* |
| `CAN_MARK_REFUNDED_MANUAL_STATUSES` | refund_needed, refund_pending, paid_test_mode, action_required, paid_waiting_* |
| `FINAL_LABEL_ORDER_STATUSES` | label_purchased, refunded, expired, canceled |
| `getUserFacingLabelOrderMessage(status)` | User-facing string per status |
| `getLabelOrderStatusLabel(status)` | Human-readable label |
| `getLabelOrderStatusDescription(status)` | Admin-facing description |
| `isErrorLabelOrderStatus(status)` | True for action_required, refund_*, expired, canceled |

### Admin panel improvements

- Status badge shows tooltip with status description on hover
- Detail panel shows `Order ID` (copyable) and `Updated` timestamp
- `Label ID` field added
- Tracking and Shipment ID show inline copy buttons
- `error_message` labeled by context: "Action required reason" / "Refund needed reason" / "Error / reason"
- "Mark refunded manually" button now requires both `stripePaymentIntentId` AND `paidAt` (prevents accidental click on unpaid orders)
- "Mark refunded manually" now available for `paid_waiting_label_purchase` (was missing)
- Filter dropdown shows human-readable status labels
- Refund-disabled tooltip: "Stripe refunds are disabled in this environment. Use Stripe Dashboard manually."

### User-facing banner improvements

- `expired` / `canceled` statuses show `XCircle` icon with slate coloring (not red)
- `paid_test_mode` shows purple coloring (distinct from green)
- `label_purchased` shows provider + service name in addition to tracking
- All messages sourced from `getUserFacingLabelOrderMessage()` (single source of truth)

### QA items for this section:

- [ ] Status badge tooltip shows description text in admin panel.
- [ ] Admin detail shows Order ID copy button.
- [ ] Admin detail `action_required` shows "Action required reason" label.
- [ ] `Mark refunded manually` NOT shown for `pending_payment` (no paidAt).
- [ ] `Mark refunded manually` shown for `paid_waiting_label_purchase` with paidAt set.
- [ ] User banner for `expired` shows slate/gray (not green/red).
- [ ] User banner for `paid_test_mode` shows purple.
- [ ] User banner for `label_purchased` shows tracking + provider + service.
- [ ] `lib/label-order-status.ts` imported by both `AdminLabelOrdersView` and `CreateGuideForm` (no duplication).

## 17. FASE 5.46 — End-to-End Label Payment + Label Purchase QA (In Progress)

Commit: `0286ff5`

### Pre-check local (BLOQUE 1) — PASSED

- [x] Working tree clean.
- [x] Last commit `0286ff5 FASE 5.45`.
- [x] `git diff --check` clean.
- [x] `npm run lint` — 6 pre-existing warnings, 0 errors.
- [x] `npx tsc --noEmit` — passed.
- [x] `npm run build` — `✓ Compiled successfully`.
- [x] Migration SQL `pending_label_orders` reviewed and ready.
- [x] Migration SQL `label_checkout_rate_limits` reviewed and ready.

### VM redeploy (BLOQUE 2) — User executes manually

```bash
cd /home/ubuntu/appsolux-apps/shipflow/shipflow
git fetch origin main
git reset --hard origin/main
git log --oneline -5
docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true
curl -i http://localhost:3003/api/config/status
```

- [ ] VM on commit `0286ff5`.
- [ ] All dangerous flags false before activating.

### Apply migrations (BLOQUE 3) — User executes in Supabase SQL Editor

Order:
1. `supabase/migrations/20260524_add_pending_label_orders.sql`
2. `supabase/migrations/20260524_add_label_checkout_rate_limits.sql`

Verify after each:
```sql
select count(*) from pending_label_orders;
select count(*) from label_checkout_attempts;
select unnest(enum_range(null::pending_label_order_status))::text order by 1;
```

- [ ] Migration 1 applied.
- [ ] Migration 2 applied.
- [ ] 11-state enum verified.
- [ ] RLS enabled on both tables.

### Activate test flags (BLOQUE 4) — User edits `.env.production` on VM via nano

```bash
nano shipflow-web/.env.production
# Set:
#   ENABLE_DIRECT_LABEL_PAYMENT=true
#   ENABLE_REAL_LABEL_PURCHASE=true (only if provider sandbox confirmed)
# Keep false:
#   ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
#   ENABLE_REAL_LABEL_VOID=false
#   ENABLE_LABEL_PAYMENT_REFUNDS=false
docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
curl -i http://localhost:3003/api/config/status
```

- [ ] `directLabelPaymentEnabled=true` in config status.
- [ ] `realLabelPurchaseEnabled=true` in config status (if sandbox confirmed).
- [ ] All other dangerous flags false.

### Auth + Payment + Admin (BLOQUEs 5–10) — User runs manually in browser

Record detailed results in `docs/STAGING_QA_RESULTS.md`.

- [ ] Auth QA passed (no fake balance, protected routes, verified session).
- [ ] Stripe test checkout completed with card `4242 4242 4242 4242`.
- [ ] `pending_label_order` created with correct status.
- [ ] No wallet debit.
- [ ] Admin `Process label` button works.
- [ ] `label_purchased` status after processing.
- [ ] Tracking / label in user banner.
- [ ] Negative tests safe (401, 403, no double purchase, refund disabled).
- [ ] Docker logs clean (no secrets).

### Final decision and commit (BLOQUEs 11–13)

- [ ] Flag state documented.
- [ ] `STAGING_QA_RESULTS.md` updated with decision.
- [ ] Lint + TSC + build pass.
- [ ] Docs committed and pushed.
- [ ] Decision: PASS / PARTIAL / FAIL.

## 18. Go / No-Go

Go only if all are true:

- [ ] Auth OK.
- [ ] Wallet recharge OK.
- [ ] Direct payment OK for allowlisted user only.
- [ ] Admin label orders OK.
- [ ] Process label sandbox OK.
- [ ] Refund test OK.
- [ ] Void remains disabled.
- [ ] No secrets printed in logs/screenshots.
- [ ] No double charge.
- [ ] No double label purchase.
- [ ] No double refund.
- [ ] Logs reviewed.
- [ ] Support knows how to handle `paid_test_mode`, `action_required`, and `refund_needed`.

No-go if any are true:

- [ ] Unknown live carrier credentials.
- [ ] Stripe live mode is active unexpectedly.
- [ ] Any non-allowlisted user can direct-pay labels.
- [ ] Webhook signature validation fails.
- [ ] Wallet recharge duplicates balance.
- [ ] Label purchase can be triggered twice for one order.
- [ ] Refund can be triggered twice for one order.

---

## FASE 5.53 — Wallet Balance and Label Payment UX Checklist

Date: 2026-05-28

### Prerequisites
- [ ] User account with verified email exists in staging
- [ ] Stripe recharge configured (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET set)
- [ ] At least one rate provider returning real rates

### 1. Wallet balance fetch in ConfirmModal
- [ ] Get rates for a valid shipment
- [ ] Click "Continue" to open ConfirmModal
- [ ] Wallet balance is shown in the modal
- [ ] If balance >= label price: "Pay with wallet" button is enabled (blue)
- [ ] If balance < label price: "Pay with wallet" button is disabled, shows shortfall amount
- [ ] Balance shown matches /saldo page balance

### 2. Wallet payment flow (balance sufficient)
- [ ] Add sufficient balance via /saldo → recharge
- [ ] Return to /crear-guia, get rates
- [ ] Open ConfirmModal — balance shows sufficient
- [ ] Click "Pay with wallet"
- [ ] Label is purchased, tracking number appears
- [ ] Balance on /saldo decreases by label amount
- [ ] Movement appears in balance activity as "Carrier label purchase"

### 3. Pay by card flow (when enabled)
- [ ] With ENABLE_DIRECT_LABEL_PAYMENT=true and account on allowlist
- [ ] Open ConfirmModal — "Pay by card" button is visible
- [ ] Click "Pay by card" — modal closes, redirects to Stripe checkout
- [ ] Complete payment — label is purchased via webhook
- [ ] Stripe payment order appears in /admin/label-orders

### 4. Insufficient balance with no card option
- [ ] With balance < label price and card payment not available
- [ ] Open ConfirmModal — "Pay with wallet" disabled, "Add funds to wallet" link shown
- [ ] Click "Add funds to wallet" — navigates to /saldo

### 5. Balance UI (BalancePanel)
- [ ] /saldo page loads correctly with blue/orange palette
- [ ] Recharge modal opens, shows amounts in new hover style (blue)
- [ ] Recharge flow via Stripe still works
- [ ] Balance activity list shows movements correctly
- [ ] Stat cards (total recharged, spent, refunded, adjustments) show correct values

### 6. Idempotency
- [ ] Submitting the same wallet purchase twice (same idempotency key) does not double-debit
- [ ] Recharging the same Stripe session twice (webhook retry) does not double-credit

### Go / No-go
No-go if any of the following:
- [ ] Wallet balance deducted but no label created
- [ ] Label created but balance not deducted
- [ ] Balance goes negative
- [ ] Double debit on retry
- [ ] Stripe recharge duplicates balance_movement
- [ ] /saldo page crashes or shows wrong balance

---

## FASE 5.54 — Pricing Margin Controls QA Checklist

### 1. Rate display consistency
- [ ] Get a rate quote in `/crear-guia`
- [ ] Confirm displayed price = providerCost + markup + payment fee
- [ ] Select a rate and open ConfirmModal — price shown matches quoted price

### 2. Stripe checkout amount matches displayed price
- [ ] Click "Pay by card" (requires `ENABLE_DIRECT_LABEL_PAYMENT=true`)
- [ ] Arrive at Stripe Checkout — confirm amount on checkout page matches confirmed rate
- [ ] Check `pending_label_orders` row: `amount_cents` matches displayed price × 100

### 3. Wallet debit amount matches displayed price
- [ ] With sufficient balance, click "Pay with wallet"
- [ ] After purchase, check `/saldo` balance activity
- [ ] Debit amount matches confirmed price

### 4. Admin pricing breakdown
- [ ] Navigate to `/admin/envios`
- [ ] For a purchased shipment with `provider_cost` populated:
  - [ ] "Charged / Cost" column shows customer price on first line
  - [ ] Second line shows "Cost $X · +$Y" with breakdown
- [ ] Payment method shown (Wallet or Card) below payment status badge

### 5. Price mismatch log (dev/staging only)
- [ ] Manually forge a request with `customerPrice` far from `providerCost × markup`
- [ ] Confirm server uses its own computed price, not the forged one
- [ ] Confirm warning is logged (not a user-facing error)

### 6. Pricing config env vars (optional)
- [ ] Temporarily set `LABEL_MARKUP_PCT=0.10` in staging env
- [ ] Verify rates now show 10% markup
- [ ] Remove env var — verify reverts to default 6%

### Go / No-go
No-go if any of the following:
- [ ] Client-sent `customerPrice` accepted by server without recalculation
- [ ] Wallet debit amount differs from Stripe charged amount for same rate
- [ ] Admin table does not show cost breakdown for shipments with `provider_cost`
- [ ] Negative margin persists in any calculated price

---

## FASE 5.55 — Multi-country Domestic Shipping Readiness Checklist

### 1. Supported domestic countries
- [ ] Origin country dropdown includes United States, Canada, Spain, Germany, France, and United Kingdom
- [ ] Destination country dropdown includes United States, Canada, Spain, Germany, France, and United Kingdom
- [ ] `UK` values normalize to `GB` in server validation

### 2. Existing US flow
- [ ] US → US address entry still works
- [ ] US → US rates still return with configured provider
- [ ] US → US card checkout still uses server-computed USD price
- [ ] US → US wallet purchase still uses server-computed USD price
- [ ] Automatic label processing still completes when provider returns a label

### 3. Selected same-country markets
- [ ] ES → ES passes form validation and attempts rates
- [ ] DE → DE passes form validation and attempts rates
- [ ] CA → CA passes form validation and attempts rates
- [ ] If provider returns no services, UI shows: "No rates were returned for this route. This market may require carrier setup."
- [ ] Checkout is not available when no rates are returned

### 4. Cross-border blocks
- [ ] ES → DE is blocked before rates
- [ ] US → CA is blocked before rates
- [ ] GB → FR is blocked before rates
- [ ] User sees: "International shipping is coming soon. For now, SendiFlash supports domestic shipments within selected countries."

### 5. Unsupported country blocks
- [ ] Unsupported country is blocked before rates
- [ ] User sees: "This country is not available yet."

### 6. Currency guardrails
- [ ] Non-USD rate snapshot cannot create Stripe label checkout
- [ ] Non-USD pending order cannot be processed into a label
- [ ] No currency conversion is attempted

### 7. Metadata and admin visibility
- [ ] Card order rate snapshot includes `originCountry`, `destinationCountry`, and `domesticMarket`
- [ ] Wallet shipment metadata includes `originCountry`, `destinationCountry`, and `domesticMarket`
- [ ] Admin can inspect country/market metadata where JSON details are available

### Go / No-go
No-go if any of the following:
- [ ] Cross-border route reaches provider rates or checkout
- [ ] Unsupported country reaches provider rates or checkout
- [ ] Non-USD amount is charged or debited
- [ ] Existing US domestic flow breaks
- [ ] Automatic label processing breaks
- [ ] Env files, migrations, secrets, customs, refunds, or voids are changed unexpectedly

---

## FASE 5.56 — Controlled QA for Selected Domestic Markets

### 1. Code-level domestic rule matrix
- [x] US → US passes validation
- [x] CA → CA passes validation
- [x] ES → ES passes validation
- [x] DE → DE passes validation
- [x] FR → FR passes validation
- [x] GB → GB passes validation
- [x] UK → UK normalizes to GB and passes validation
- [x] US → CA blocks before rates
- [x] US → ES blocks before rates
- [x] ES → DE blocks before rates
- [x] FR → GB blocks before rates
- [x] CA → US blocks before rates
- [x] EC → EC blocks as unsupported
- [x] MX → MX blocks as unsupported

### 2. Browser/address UI operator QA
- [ ] Origin country selector works for all supported countries
- [ ] Destination country selector works for all supported countries
- [ ] State/province/postal labels are not US-only
- [ ] Google Places returns addresses for selected countries when API key is configured
- [ ] Manual entry works without Google Places
- [ ] Map picker still works for US and blocks unsupported countries

### 3. Provider/rates operator QA
- [ ] US → US returns rates as before
- [ ] CA → CA attempts rates and either returns rates or friendly no-rate message
- [ ] ES → ES attempts rates and either returns rates or friendly no-rate message
- [ ] DE → DE attempts rates and either returns rates or friendly no-rate message
- [ ] FR → FR attempts rates and either returns rates or friendly no-rate message
- [ ] GB → GB attempts rates and either returns rates or friendly no-rate message
- [ ] No checkout is available when rates array is empty

### 4. Payment/label operator QA
- [ ] Card checkout refuses cross-border route
- [ ] Wallet label purchase refuses cross-border route
- [ ] Non-USD rate snapshot is blocked
- [ ] Successful same-country US flow still reaches `label_purchased`
- [ ] Shipment appears in `/envios`
- [ ] Shipment detail/PDF status works

### 5. Final decision gate
Current local decision: **PARTIAL / CODE PASS**.

Move to PASS only after deployed operator QA confirms at least the US flow remains fully working and each selected non-US market has an explicit provider result: rates returned, or no-rates due to provider/account setup.

---

## FASE 5.57 — Beta Release Hardening Checklist

### 1. Onboarding
- [ ] New or returning user lands on `/dashboard`
- [ ] Dashboard welcome panel explains automatic label flow
- [ ] "Create your first shipment" opens `/crear-guia`
- [ ] "Add wallet balance" opens `/saldo`
- [ ] "My Shipments" opens `/envios`
- [ ] Help link opens `/support`

### 2. First shipment guidance
- [ ] `/crear-guia` shows four steps: enter addresses, compare rates, pay, get label automatically
- [ ] Domestic-only rule is visible
- [ ] International shipping is described as coming later
- [ ] No long or confusing instructional copy blocks the main form

### 3. Support and policy pages
- [ ] `/support` loads
- [ ] `/terms` loads
- [ ] `/privacy` loads
- [ ] `/support-policy` loads
- [ ] Footer links reach the support/legal pages
- [ ] Header support link works on desktop and mobile

### 4. User-facing exception copy
- [ ] No-rates message is friendly and actionable
- [ ] Unsupported country message is friendly
- [ ] Cross-border message is clear
- [ ] Payment confirmed/action_required banner says support review, not raw provider error
- [ ] Insufficient wallet balance message points to add funds or card if available

### 5. Safety
- [ ] No env files changed
- [ ] No secrets printed
- [ ] No provider credentials changed
- [ ] No migrations added
- [ ] No customs/export/international flow added
- [ ] No automatic refunds added
- [ ] No automatic voids added
- [ ] Wallet/card/direct label payment still compile
- [ ] Multi-country domestic validation still compiles

---

## FASE 5.58 — Final Controlled Beta Deployment Checklist

### 1. Deploy latest main
- [ ] Production VM is on latest `main`
- [ ] `git log --oneline -5` shows `df6748f Prepare SendiFlash beta onboarding and support` or newer
- [ ] `docker compose build --no-cache shipflow-web` completed
- [ ] `docker compose up -d shipflow-web` completed
- [ ] `docker network connect appsolux-network shipflow-web || true` completed

### 2. Config/status
- [x] `/api/config/status` reachable
- [x] `buildEnvOk=true`
- [x] `supabaseConfigured=true`
- [x] `ratesConfigured=true`
- [x] `googleMapsConfigured=true`
- [x] `stripeRechargeConfigured=true`
- [x] `directLabelPaymentEnabled=true`
- [x] `realLabelPurchaseEnabled=true`
- [x] `processLabelInWebhookEnabled=true`
- [x] `labelVoidEnabled=false`
- [x] `labelPaymentRefundsEnabled=false`

### 3. Route checks
- [x] `/` returns 200
- [x] `/login` returns 200
- [x] `/registro` returns 200
- [x] `/dashboard` returns 200 client shell
- [x] `/crear-guia` returns 200 client shell
- [x] `/envios` returns 200 client shell
- [x] `/saldo` returns 200 client shell
- [x] `/admin/label-orders` returns 200 client shell
- [ ] `/support` returns 200 after redeploy to `df6748f` or newer
- [ ] `/terms` returns 200 after redeploy to `df6748f` or newer
- [ ] `/privacy` returns 200 after redeploy to `df6748f` or newer
- [ ] `/support-policy` returns 200 after redeploy to `df6748f` or newer

### 4. End-to-end beta scenarios
- [ ] Card label purchase reaches `label_purchased`
- [ ] Stripe webhook processes payment and automatic label purchase
- [ ] User sees tracking/PDF
- [ ] Shipment appears in `/envios`
- [ ] Wallet recharge credits balance once
- [ ] Wallet label purchase debits balance without going negative
- [ ] Admin exception retry appears only when safe
- [ ] Completed orders cannot be processed again
- [ ] Refund/void controls remain disabled by flags
- [ ] Cross-border domestic-market routes are blocked before rates
- [ ] Unsupported countries are blocked before rates

### 5. Final decision
Current decision: **PARTIAL**.

Release can move to PASS after latest main is deployed, support/legal routes return 200, and one clean card or wallet label purchase is verified end-to-end in production/staging.

---

## FASE 5.59 — Create Guide, Payments, Recharge, and Profit Checklist

### 1. Test/Beta mode
- [ ] `/api/config/status` still shows label purchase enabled
- [ ] Provider credentials remain in current sandbox/test configuration
- [ ] Admin overview shows Test/Beta label mode notice
- [ ] Void/refund flags remain disabled

### 2. Wallet custom recharge
- [ ] Preset amounts `$10`, `$25`, `$50`, `$100` still work
- [ ] Custom amount `$5.00` works
- [ ] Custom amount `$500.00` works
- [ ] Amount below `$5` is blocked
- [ ] Amount above `$500` is blocked
- [ ] Negative/zero/non-numeric values are blocked
- [ ] More than two decimals are blocked
- [ ] Stripe Checkout receives the selected custom amount
- [ ] Webhook/idempotency behavior remains unchanged

### 3. Create guide UX
- [ ] From and To render as clean cards on desktop/mobile
- [ ] Weight/unit/product fields are compact
- [ ] Dimensions/unit fields are compact
- [ ] Product type `Other` shows product description input
- [ ] Product description is required for `Other`
- [ ] Get rates collapses details into summary while loading/displaying rates
- [ ] Edit shipment details re-expands form without losing data
- [ ] Clear draft resets saved draft

### 4. Draft and checkout behavior
- [ ] Draft restores after page reload
- [ ] Draft restores after returning from Stripe
- [ ] Draft does not store payment/card data
- [ ] Card checkout opens in new tab when allowed
- [ ] Popup-blocked card checkout falls back to same-tab redirect
- [ ] Wallet payment stays in-app

### 5. Payment options
- [ ] Wallet button is visible
- [ ] Card button is visible
- [ ] Wallet disabled with shortfall when balance is insufficient
- [ ] Card remains available when wallet balance is insufficient and card gate allows it
- [ ] Wallet and card both remain visible when wallet has enough balance

### 6. Pricing
- [ ] Gross-up card fee formula is used
- [ ] Integer cents avoid floating money drift
- [ ] Displayed price matches Stripe checkout amount
- [ ] Displayed price matches wallet debit
- [ ] `pending_label_orders.amount_cents` matches displayed price
- [ ] Admin shipment pricing matches displayed/charged price

### 7. Performance and admin profit
- [ ] Rates show loading/progress copy
- [ ] Double-click Get rates is prevented
- [ ] Rate provider timing logs contain no secrets
- [ ] Slow provider timeout does not block forever
- [ ] Admin profitability snapshot loads
- [ ] Date filters work: today, 7 days, 30 days, all time
- [ ] Recent margin rows show charged/cost/fees/margin

### 8. Deferred scope
- [ ] Batch/multilabel remains deferred
- [ ] International/customs remains deferred
- [ ] Automatic refunds/voids remain deferred
- [ ] Full accounting remains deferred
