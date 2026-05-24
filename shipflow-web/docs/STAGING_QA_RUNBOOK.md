# Staging QA Runbook

Last updated: 2026-05-24 (FASE 5.41A)

This runbook is for VM/staging QA only. Do not use it to apply production changes.

## 1. Local Pre-Check

- [ ] `git status --short` reviewed; no accidental `.env` files staged.
- [ ] `.env.local` and `.env.production` untouched and not printed.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
- [ ] All sensitive flags remain false by default:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

## 2. Suggested Commit Order

Use either one consolidation commit or small commits by block.

Suggested single commit:

```bash
git add shipflow-web docs
git commit -m "Consolidate direct label payment safety controls"
```

Suggested split:

```bash
git commit -m "Add pending label order payment gates and processing locks"
git commit -m "Add operational refund handling for label payments"
git commit -m "Document staging QA runbook for label payments"
```

## 3. VM/Staging Deploy Plan

Run on the VM after code is committed and pushed. Do not paste secrets into logs.

```bash
git pull
source .env.production
docker compose build --no-cache shipflow-web
docker compose up -d shipflow-web
docker network connect appsolux-network shipflow-web || true
curl -s https://sendiflash.com/api/config/status
```

Expected initial status:

- `supabaseConfigured: true`
- `serviceRoleConfigured: true`
- `stripeRechargeEnabled: true`
- `directLabelPaymentEnabled: false`
- `realLabelPurchaseEnabled: false`
- `processLabelInWebhookEnabled: false`
- `labelPaymentRefundsEnabled: false`

## 4. Migration Plan

Apply in Supabase Dashboard SQL Editor, staging first:

1. `supabase/migrations/20260524_add_pending_label_orders.sql`
2. `supabase/migrations/20260524_add_label_checkout_rate_limits.sql`
3. Run verification queries from `docs/DEPLOYMENT.md`.
4. Confirm both tables have RLS enabled.
5. Confirm regular users have no direct INSERT/UPDATE/DELETE policies on `pending_label_orders`.

Never apply directly in production. Never drop production tables as rollback.

## 5. Flag Plan

Initial:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

QA direct payment:

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_REAL_LABEL_PURCHASE=false
```

QA process label:

```env
ENABLE_REAL_LABEL_PURCHASE=true
REAL_LABEL_PURCHASE_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
```

QA refund:

```env
ENABLE_LABEL_PAYMENT_REFUNDS=true
LABEL_PAYMENT_REFUND_ALLOWED_EMAILS=131studio.ec@gmail.com
```

Keep `ENABLE_REAL_LABEL_VOID=false` during this QA pass.

## 6. Manual Test Order

1. Auth: signup, email verification, login, protected dashboard.
2. Wallet recharge: Stripe checkout for wallet, webhook credits `payment_recharges` and `balance_movements`.
3. Balance insufficient: attempt label purchase with insufficient wallet.
4. Direct label checkout: allowlisted verified user clicks Pay by card.
5. Webhook test mode: with `ENABLE_REAL_LABEL_PURCHASE=false`, order becomes `paid_test_mode`.
6. Admin order: `/admin/label-orders` shows order and snapshots.
7. Process label sandbox: enable real purchase only for the allowlisted user, keep webhook inline processing disabled, then use admin `process-label`.
8. Refund test: mark `refund_needed`, enable refunds only for allowlisted admin, run Stripe test refund.
9. Void remains disabled: verify void endpoint returns disabled/not available.

## 7. Rollback Plan

Immediate safety rollback:

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
ENABLE_LABEL_PAYMENT_REFUNDS=false
```

Then rebuild/restart if the deployment model requires env vars to be baked or process-loaded.

Operational handling:

- Do not drop DB objects in production.
- For `pending_payment`, let expiry sweep mark stale orders expired.
- For `paid_test_mode` or `refund_needed`, support reviews `/admin/label-orders`.
- For captured Stripe payments with no label, use Stripe Dashboard manual refund if app refunds are disabled.
- Document every manual action in the admin order reason/note.
