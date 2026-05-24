# Staging Execution Checklist

Last updated: 2026-05-24 (FASE 5.41B)

Purpose: first controlled VM/staging QA for ShipFlow / SendiFlash after phases 5.38D through 5.41A.

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
git pull origin main
git log -1 --oneline
```

Verify deployment files exist:

```bash
test -f docker-compose.yml && echo "docker-compose.yml: ok"
test -f shipflow-web/Dockerfile && echo "shipflow-web/Dockerfile: ok"
test -f .env.production && echo ".env.production: present"
```

Verify required env variable names only. This prints `set` or `missing`, never values:

```bash
set -a
source .env.production
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
source .env.production
set +a

docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true
curl -s http://localhost:3003/api/config/status
```

Initial expected config:

- `supabaseConfigured: true`
- `serviceRoleConfigured: true`
- `stripeRechargeEnabled: true`
- `directLabelPaymentEnabled: false`
- `realLabelPurchaseEnabled: false`
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
localStorage.setItem("shipflow-users", "[]")
```

Reload; expected: no dashboard access unless Supabase session is valid.

## 7. QA Wallet Recharge

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

## 8. QA Direct Label Payment Test

Enable only:

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

## 9. QA Process Label Sandbox Controlled

Enable only for the internal test user:

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

## 10. QA Refund Test

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

## 11. Rollback

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
source .env.production
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

## 12. Go / No-Go

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
