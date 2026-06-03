# Load Testing

Last updated: 2026-06-03 (FASE 5.72)

Purpose: run safe, low-risk load checks against SendiFlash before public launch without stressing paid or provider-backed systems.

## Scope

Load testing in this phase is only for safe public pages and the lightweight config status API.

Do not aggressively load test:

- Stripe checkout creation
- Shipping provider rate endpoints
- Label purchase endpoints
- Wallet/payment write endpoints
- Webhook endpoints
- Prep payment endpoints
- Any provider-backed or paid external integration

## Safe endpoints for initial tests

- `/`
- `/shipping-labels`
- `/fba-prep`
- `/ecuador`
- `/login`
- `/registro`
- `/support`
- `/terms`
- `/privacy`
- `/api/config/status`

## Unsafe or restricted endpoints

- `/api/rates`
- `/api/labels`
- `/api/billing/checkout-session`
- `/api/billing/label-checkout`
- `/api/webhooks/stripe`
- `/api/webhooks/shipstation`
- `/api/prep-orders/[id]/checkout`
- `/api/prep-orders/[id]/pay-wallet`
- Any provider-backed endpoint

## Recommended first beta thresholds

- `http_req_failed`: `0%`
- Public page `p95` under `1500ms` preferred
- Config API `p95` under `500ms` preferred
- No container restart during the test window
- Memory remains stable
- CPU is not pinned for long periods

## k6 installation on Ubuntu

```bash
sudo gpg -k
sudo apt-get update
sudo apt-get install -y gnupg ca-certificates
curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install -y k6
```

## Run the public pages test

```bash
BASE_URL=https://sendiflash.com k6 run scripts/load/public-pages.k6.js
```

## Run the config status API test

```bash
BASE_URL=https://sendiflash.com k6 run scripts/load/config-status.k6.js
```

## Safe execution notes

- Run these tests during a quiet window before public launch.
- Start with the provided low-VU scripts before increasing any threshold.
- Watch Docker logs, `docker stats`, proxy logs, Stripe webhook logs, Supabase logs, and provider error dashboards while tests run.
- If error rate rises, CPU stays pinned, memory climbs unexpectedly, or containers restart, stop the test and investigate before retrying.

## What these scripts are for

- Confirm public marketing pages return `200` consistently.
- Confirm `/api/config/status` stays healthy under light concurrency.
- Catch obvious production readiness issues like repeated 5xx responses, slow public rendering, or infrastructure instability.

## What these scripts are not for

- They are not a payment stress test.
- They are not a provider integration stress test.
- They are not a webhook replay test.
- They are not a shipment creation benchmark.
