# ShipFlow Web

North American shipping platform kept as a separate project from the Ecuador version.

## Scope

- Create shipping labels across the U.S.
- Compare USPS, UPS, FedEx, and DHL rates.
- Track shipments with Supabase fallback and prepared real carrier API connectors.
- Keep dashboard, shipments, balance, admin, authentication, and printable labels.

## Setup

```bash
npm install
npm run typecheck
npm run build
```

## Supabase

Run `supabase/schema.sql` and `supabase/seed.sql` in your Supabase project.

Demo admin fallback:

- Email: `admin@shipflow.local`
- Password: `admin123`

Live tracking is ready for official carrier credentials through:

- `USPS_API_URL` / `USPS_API_KEY`
- `UPS_API_URL` / `UPS_API_KEY`
- `FEDEX_API_URL` / `FEDEX_API_KEY`
- `DHL_API_URL` / `DHL_API_KEY`
