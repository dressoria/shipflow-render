# Staging QA Results

Last updated: 2026-05-24 (FASE 5.43)

Purpose: record VM/staging QA for auth/navigation, migrations, and controlled direct label payment with Stripe test mode.

Rules for this QA pass:

- Do not print secrets.
- Do not modify `.env.production` from the agent.
- Apply migrations only manually in the correct Supabase staging project after SQL review.
- Enable direct label payment only for the internal allowlisted email during the controlled QA window.
- Do not enable real label purchase, real void, webhook processing, or label refunds.
- Do not buy labels, void labels, or execute refunds.

## FASE 5.43 Execution Status

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Local branch / commit | Blocked before VM execution | Branch `main`, commit `ba59d7a Prepare secure direct label payment operations` | Local working tree is not clean | Commit or intentionally carry the pending auth/docs changes before VM reset/deploy QA |
| Local env tracking check | Passed | `.env`, `.env.local`, `.env.production`, `shipflow-web/.env.local`, and `shipflow-web/.env.production` are not tracked | None | Keep env files untracked |
| Migration SQL review | Reviewed locally | `pending_label_orders` and `label_checkout_attempts` SQL reviewed; not applied by Codex | None found in local review | Apply manually only in staging SQL Editor after confirming project |
| VM pre-check | Not run by Codex | Requires VM access/operator execution | TBD | Run commands from `STAGING_EXECUTION_CHECKLIST.md` |
| Auth QA before migrations | Not run by Codex | Browser QA required on `https://sendiflash.com` | TBD | Run manually before touching migrations/flags |
| Migrations applied | Not applied by Codex | Must be applied manually in Supabase staging | TBD | Apply only after auth QA passes |
| Direct payment flag enabled | Not enabled by Codex | `.env.production` was not touched | TBD | Enable only `ENABLE_DIRECT_LABEL_PAYMENT=true` and internal allowlist during QA |
| Stripe direct label payment test | Not run by Codex | Requires browser, Stripe test Checkout, webhook delivery | TBD | Run manually after migrations and flag gate |
| Rollback | Not applicable yet | No staging flags changed by Codex | None | After QA, turn direct payment off unless continuing controlled test |

## FASE 5.42B Commit / Public API Check

Run timestamp: 2026-05-24 17:54 America/Guayaquil.

| Item | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Commit created | Passed | `312f514 Fix auth routing loops and staging QA docs` | None | Use this commit for clean VM redeploy |
| Push to GitHub | Passed | `main` pushed from `ba59d7a` to `312f514` | None | VM operator can fetch/reset to `origin/main` |
| VM redeploy | Not run by Codex | Requires VM shell access; commands are documented in `STAGING_EXECUTION_CHECKLIST.md` | TBD | Run redeploy manually before browser QA |
| Public `/api/config/status` | Passed | HTTP 200; `buildEnvOk=true`, Supabase/service role/Google Maps/Stripe recharge configured; all dangerous label flags false | None | Re-run after VM redeploy to verify new commit is live |
| Public no-token API checks | Passed | `/api/auth/me` returned `authenticated:false`; `/api/balance`, `/api/shipments`, `/api/config/features`, and `POST /api/billing/label-checkout` returned 401 | None | Re-run from VM localhost after redeploy |
| Public page reachability | Partial | `/dashboard`, `/login`, and `/verifica-tu-correo?resend=true` return HTML 200; client-side auth behavior still needs browser session QA | None from curl | Run manual browser QA |

## Summary

| Area | Result | Evidence / note | Bug found | Required action |
| --- | --- | --- | --- | --- |
| Auth | Not run yet | Browser QA pending on `https://sendiflash.com` | TBD | Run FASE 5.42 auth checklist |
| API | Partial | Public no-token API checks passed against `https://sendiflash.com`; VM localhost checks still pending | None | Re-run after clean VM redeploy |
| Labels disabled | Not run yet | Requires verified user in staging | TBD | Confirm Pay by card disabled and no pending order |
| Config | Not run yet | `/api/config/status` expected to show all dangerous flags false | TBD | Capture safe boolean output only |
| UI | Not run yet | Dashboard/login/register/verify flows pending | TBD | Record route behavior and screenshots if needed |
| Security | Local checks passed | Legacy auth/eval searches completed locally; false positives documented below | No active issue found | Run browser/VM security checks during staging QA |

## Direct Label Payment Stripe Test

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
