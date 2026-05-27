# Staging Execution Checklist

Last updated: 2026-05-24 (FASE 5.46)

Purpose: first controlled VM/staging QA for ShipFlow / SendiFlash after phases 5.38D through 5.41C, with auth routing fixes deployed and all dangerous label flags still off.

Do not deploy production-wide. Do not apply migrations automatically. Do not print secrets. Do not buy real labels or execute real refunds without explicit confirmation.

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
