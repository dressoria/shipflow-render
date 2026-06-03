# Production Readiness Checklist

Last updated: 2026-06-03 (FASE 5.77)

Purpose: final pre-launch checklist for SendiFlash production readiness without enabling public launch prematurely.

## A. Current launch status

- Shipping Labels: available and treated as the main beta product.
- FBA Prep: gated controlled beta only.
- Ecuador Shipping: controlled beta request flow only, not live shipping.
- Ecuador Shipping may store internal beta requests, but must not create provider orders or process Ecuador payments yet.
- Ecuador beta RLS correction migration for `regional_shipment_events` must be applied anywhere the beta request flow is tested.
- Delivereo: not integrated.
- AI/n8n automation: not live.

## B. Environment checklist

- [ ] `APP_URL` is set correctly for the deployed environment.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is configured.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is configured.
- [ ] `STRIPE_SECRET_KEY` is configured.
- [ ] `STRIPE_WEBHOOK_SECRET` is configured.
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is configured.
- [ ] `RECAPTCHA_SECRET_KEY` is configured.
- [ ] Shipping provider credentials are configured for the intended environment.
- [ ] `ENABLE_DIRECT_LABEL_PAYMENT` is set intentionally.
- [ ] `ENABLE_REAL_LABEL_PURCHASE` is set intentionally.
- [ ] `ENABLE_PROCESS_LABEL_IN_WEBHOOK` is set intentionally.
- [ ] `ENABLE_REAL_LABEL_VOID=false` unless intentionally enabled during a later phase.
- [ ] `ENABLE_LABEL_PAYMENT_REFUNDS=false` unless intentionally enabled during a later phase.

## C. Auth checklist

- [ ] Login works in production.
- [ ] Registration works in production.
- [ ] reCAPTCHA registration protection works in production.
- [ ] Forgot password route works.
- [ ] Reset password route works.
- [ ] Supabase redirect URLs include `https://sendiflash.com` and any required staging domains.
- [ ] Admin user can sign in and reach admin routes.
- [ ] Normal user cannot access admin routes or admin APIs.

## D. Shipping Labels checklist

- [ ] Create shipment form works.
- [ ] Rates load successfully.
- [ ] Selected rate persists through the checkout flow.
- [ ] Wallet and card payment options show correctly for the account being tested.
- [ ] Card checkout creates a Stripe Checkout session successfully.
- [ ] Stripe webhook processes label orders correctly.
- [ ] Label becomes available after successful processing.
- [ ] Tracking number is saved correctly.
- [ ] Duplicate placeholder tracking fallback still works safely.
- [ ] `action_required` flow is still usable for support/admin review.

## E. Wallet/payment checklist

- [ ] Wallet balance loads correctly.
- [ ] Recharge flow works.
- [ ] Wallet debit creates the expected balance movement.
- [ ] Stripe webhooks are configured correctly.
- [ ] No duplicate charges or duplicate credits are observed.

## F. Prep/FBA checklist

- [ ] Normal user sees Prep as in preparation.
- [ ] Normal user cannot create Prep orders.
- [ ] Normal user Prep APIs return `403`.
- [ ] `131studio.ec@gmail.com` or admin can access Prep.
- [ ] Admin Prep routes still work.
- [ ] Prep is not publicly offered as live.

## G. Ecuador checklist

- [ ] `/ecuador` says coming soon or in preparation.
- [ ] No public promise mentions Delivereo.
- [ ] Ecuador customer flow is clearly labeled as beta request only, not live shipping.
- [ ] Ecuador customer APIs reject internal/admin field injection.
- [ ] Ecuador admin flow is internal-only and does not call Delivereo.
- [ ] No Ecuador payment flow is active yet.

## H. Legal/support checklist

- [ ] `/terms` loads.
- [ ] `/privacy` loads.
- [ ] `/support` loads.
- [ ] `/support-policy` loads.
- [ ] Contact and support path is clear for users.

## I. Monitoring checklist

- [ ] Review Docker application logs.
- [ ] Review `docker stats` during smoke/load checks.
- [ ] Review Nginx or proxy error logs.
- [ ] Review Stripe webhook logs.
- [ ] Review Supabase logs.
- [ ] Review shipping provider/API error logs.

## J. Rollback plan

- [ ] Identify the previous known-good git commit before launch changes.
- [ ] Confirm the previous commit can be rebuilt with Docker Compose.
- [ ] If needed, disable `ENABLE_REAL_LABEL_PURCHASE`.
- [ ] If needed, disable `ENABLE_PROCESS_LABEL_IN_WEBHOOK`.
- [ ] Keep refunds and voids disabled unless an intentional operations decision is made.

## Recommended release posture

- Keep Shipping Labels as the only production-ready public service.
- Keep FBA Prep gated to approved users and admins.
- Keep Ecuador Shipping limited to controlled beta requests until provider, payment, and operations work are complete.
- Treat any real-label, Stripe, or provider issue as a reason to pause launch and return to controlled beta validation.
