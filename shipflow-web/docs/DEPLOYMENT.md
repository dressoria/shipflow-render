# Deployment Guide — ShipFlow Web

Operational runbook for applying schema changes and configuring feature flags safely.

---

## FASE 5.40A — Applying the `pending_label_orders` migration

### Prerequisites

- [ ] FASE 5.39B backend + FASE 5.39C admin panel deployed (or deploying together).
- [ ] Supabase project accessible via Dashboard or Supabase CLI.
- [ ] At least one admin account configured (`profiles.role = 'admin'` or email in `ADMIN_EMAILS`).
- [ ] `ENABLE_DIRECT_LABEL_PAYMENT=false` and `ENABLE_REAL_LABEL_PURCHASE=false` confirmed in the target environment — never apply the migration while real label payments are flowing.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in the target environment (required for all label order writes).

### Step 1 — Review the SQL

Read the full migration before applying:

```
supabase/migrations/20260524_add_pending_label_orders.sql
```

The migration is intended to be run once per environment. It guards enum creation and
drops/recreates the `updated_at` trigger, but a partial manual apply should be reviewed
before re-running the full file.

### Step 2 — Apply in staging first

**Option A: Supabase Dashboard SQL Editor (recommended)**

1. Open Supabase Dashboard → your project → SQL Editor.
2. Open `supabase/migrations/20260524_add_pending_label_orders.sql` in your editor and copy its full contents.
3. Paste into the Supabase SQL Editor and click **Run**.
4. Verify output: no errors, all statements executed.

**Option B: Supabase CLI (if the project is linked)**

```bash
supabase db push
```

Or with an explicit connection string (never commit credentials):

```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

Replace `[PASSWORD]` and `[HOST]` with staging values from the Supabase Dashboard → Settings → Database.

### Step 3 — Verify the migration applied

Run these queries in Supabase SQL Editor (read-only, safe):

```sql
-- 1. Verify table columns.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pending_label_orders'
ORDER BY ordinal_position;
```

Expected: ~27 columns including `id`, `user_id`, `status`, `amount_cents`, `rate_snapshot`,
`origin`, `destination`, `parcel`, `stripe_checkout_session_id`, `idempotency_key`,
`expires_at`, `paid_at`, `stripe_refund_id`, `refund_attempted_at`, `refunded_at`,
`refund_error_message`, `updated_at`.

```sql
-- 2. Verify RLS is enabled.
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'pending_label_orders';
```

Expected: `relrowsecurity = true`.

```sql
-- 3. Verify indexes.
SELECT indexname
FROM pg_indexes
WHERE tablename = 'pending_label_orders'
ORDER BY indexname;
```

Expected indexes:
- `pending_label_orders_expires_at_idx`
- `pending_label_orders_pkey`
- `pending_label_orders_status_idx`
- `pending_label_orders_stripe_pi_idx`
- `pending_label_orders_stripe_session_idx`
- `pending_label_orders_user_id_idx`

```sql
-- 4. Verify RLS policies.
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'pending_label_orders';
```

Expected: `pending_label_orders: user read own` for `SELECT`.
No INSERT, UPDATE, or DELETE policies for regular users — all writes go through service_role.

```sql
-- 5. Verify updated_at trigger.
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'pending_label_orders';
```

Expected: `pending_label_orders_updated_at` on `UPDATE BEFORE`.

```sql
-- 6. Verify enum values (must be exactly 11).
SELECT unnest(enum_range(NULL::pending_label_order_status))::text AS status
ORDER BY 1;
```

Expected (11 values):
```
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

```sql
-- 7. Verify the table is initially empty (expected in staging after first apply).
SELECT COUNT(*) FROM pending_label_orders;
```

### Step 4 — Enable in staging (test mode only)

After the migration applies in staging, set these flags in your staging environment:

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
```

This activates:
- `POST /api/billing/label-checkout` — creates a Stripe Checkout Session and a `pending_payment` row.
- Stripe webhook `checkout.session.completed` → marks order `paid_test_mode` (no label purchased).
- Admin panel at `/admin/label-orders` shows real orders.

`ENABLE_REAL_LABEL_PURCHASE=false` is a hard safety: the webhook never calls the carrier API
even if a real Stripe payment completes. Do **not** set this to `true` until the staging
QA steps in `docs/LABELS_GO_NO_GO.md` and `docs/STAGING_QA_RUNBOOK.md` pass.

### Step 5 — Verify Supabase service_role is working

```bash
curl -s https://your-staging-url/api/config/status | jq '.'
```

Must return:
- `"supabaseConfigured": true`
- `"serviceRoleConfigured": true`
- `"stripeRechargeConfigured": true`
- `"directLabelPaymentEnabled": true` (after setting the flag)

### Step 6 — Run QA checklist

Run every step in `docs/LABELS_GO_NO_GO.md` **section 9** before promoting to production.

### Rollback (staging only — never on production without approval)

```sql
DROP TABLE IF EXISTS pending_label_orders CASCADE;
DROP TYPE IF EXISTS pending_label_order_status CASCADE;
DROP FUNCTION IF EXISTS set_pending_label_orders_updated_at() CASCADE;
```

**Never run this on production without explicit written approval.**

---

## Feature Flags

| Flag | Default | Safe to set `true` when… |
|------|---------|--------------------------|
| `ENABLE_DIRECT_LABEL_PAYMENT` | `false` | Migration applied in target env + QA section 9 passed |
| `ENABLE_REAL_LABEL_PURCHASE` | `false` | Server-side purchase implemented + full staging QA passed |
| `ENABLE_REAL_LABEL_VOID` | `false` | Void QA end-to-end in sandbox passed |
| `ENABLE_PROCESS_LABEL_IN_WEBHOOK` | `false` | Only after carrier latency is proven safe; prefer admin processing |
| `ENABLE_LABEL_PAYMENT_REFUNDS` | `false` | Stripe refund flow tested in sandbox and admin allowlist configured |

FASE 5.40C adds account allowlists. In production, a global flag set to `true` with an empty allowlist is treated as blocked for safety.

| Feature | Global flag | Email allowlist | User ID allowlist |
|---------|-------------|-----------------|-------------------|
| Direct label payment | `ENABLE_DIRECT_LABEL_PAYMENT` | `DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS` | `DIRECT_LABEL_PAYMENT_ALLOWED_USER_IDS` |
| Real label purchase | `ENABLE_REAL_LABEL_PURCHASE` | `REAL_LABEL_PURCHASE_ALLOWED_EMAILS` | `REAL_LABEL_PURCHASE_ALLOWED_USER_IDS` |
| Real label void | `ENABLE_REAL_LABEL_VOID` | `REAL_LABEL_VOID_ALLOWED_EMAILS` | `REAL_LABEL_VOID_ALLOWED_USER_IDS` |
| Webhook inline processing | `ENABLE_PROCESS_LABEL_IN_WEBHOOK` | `PROCESS_LABEL_IN_WEBHOOK_ALLOWED_EMAILS` | `PROCESS_LABEL_IN_WEBHOOK_ALLOWED_USER_IDS` |
| Label payment refunds | `ENABLE_LABEL_PAYMENT_REFUNDS` | `LABEL_PAYMENT_REFUND_ALLOWED_EMAILS` | `LABEL_PAYMENT_REFUND_ALLOWED_USER_IDS` |

### Safe QA configuration (test mode, no real label purchase)

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
```

With this configuration and Stripe in test mode:
- Users can complete Stripe Checkout using test card `4242 4242 4242 4242`.
- On success, `pending_label_orders.status` becomes `paid_test_mode`.
- No real money moves; no carrier label is purchased; no balance is deducted.
- Admin panel at `/admin/label-orders` shows the `paid_test_mode` order.

### Controlled sandbox real-purchase configuration

Use only in sandbox/staging with test carrier credentials:

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com

ENABLE_REAL_LABEL_PURCHASE=true
REAL_LABEL_PURCHASE_ALLOWED_EMAILS=131studio.ec@gmail.com

ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Do not enable `ENABLE_PROCESS_LABEL_IN_WEBHOOK` during early beta. Use the admin endpoint
`POST /api/admin/label-orders/[id]/process-label` so support can control exactly when the carrier call happens.

### Controlled refunds

Early beta can use manual refunds from Stripe Dashboard:

```env
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

With this setting, support can mark orders `refund_needed` or record a manual refund, but the app does not call Stripe Refund API.

For sandbox-only controlled refunds:

```env
ENABLE_LABEL_PAYMENT_REFUNDS=true
LABEL_PAYMENT_REFUND_ALLOWED_EMAILS=admin@example.com
```

The admin endpoint `POST /api/admin/label-orders/[id]/refund` requires an allowlisted admin and a textual `REFUND` confirmation. It uses Stripe idempotency key `label-refund-{order.id}` and never touches wallet balance.

### Rate limit migration

FASE 5.40C proposes, but does not apply, a DB-backed rate limit table:

```text
supabase/migrations/20260524_add_label_checkout_rate_limits.sql
```

When applied, `/api/billing/label-checkout` records attempts with hashed IPs only:

- 5 attempts per user per 10 minutes.
- 20 attempts per IP hash per 10 minutes.

Until the migration is applied, development/test uses an in-memory fallback. Production logs a warning and allows checkout rather than blocking traffic because of a missing optional table.

### Processing lock/idempotency

Real label purchase now claims an order before calling the carrier:

```text
paid_waiting_label_purchase -> label_purchase_pending
```

The claim requires `label_id IS NULL` and `tracking_number IS NULL`. Duplicate admin clicks or duplicate Stripe webhooks cannot claim the same order twice; already purchased orders return idempotently, while in-progress orders return "already being processed."

---

## Migration application order for staging QA

Apply migrations in this order in Supabase staging only:

1. `supabase/migrations/20260524_add_pending_label_orders.sql`
2. `supabase/migrations/20260524_add_label_checkout_rate_limits.sql`
3. Run the verification queries in this document and in each migration footer.
4. Confirm `/api/config/status` is healthy with all label/payment flags still `false`.
5. Only after verification, enable QA flags for one allowlisted account.

Do not apply these directly in production. Do not enable label payment, real purchase,
void, webhook processing, or refund flags before the tables have been verified.

### Production activation risks

See `docs/LABELS_GO_NO_GO.md` — section "Riesgos de activación" before enabling any flag
in production with Stripe in live mode.

---

## Supabase service_role requirement

All writes to `pending_label_orders` require `SUPABASE_SERVICE_ROLE_KEY`.
The table has no INSERT or UPDATE policies for regular users — service_role bypasses RLS.

If `SUPABASE_SERVICE_ROLE_KEY` is missing, the server returns `503` on any label checkout
attempt (detected by the `isServiceRoleConfigured` guard in `/api/billing/label-checkout`).

Verify before enabling:
```bash
curl -s https://your-staging-url/api/config/status | jq '.serviceRoleConfigured'
# Expected: true
```

---

## Environment variables reference

See `.env.example` for the full list with descriptions. The variables most relevant to the
label payment flow are:

| Variable | Server/Public | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses RLS — never expose client-side |
| `STRIPE_SECRET_KEY` | **Server only** | Stripe secret — never expose client-side |
| `STRIPE_WEBHOOK_SECRET` | **Server only** | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | Public | Used for Stripe `success_url` / `cancel_url` |
| `ENABLE_DIRECT_LABEL_PAYMENT` | Server only | Safety switch — default `false` |
| `ENABLE_REAL_LABEL_PURCHASE` | Server only | Safety switch — default `false` |
| `ENABLE_REAL_LABEL_VOID` | Server only | Safety switch — default `false` |
