# Staging QA Results

Last updated: 2026-05-24 (FASE 5.46)

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
