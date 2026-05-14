# ShipFlow Mobile

Expo mobile app for the ShipFlow U.S. shipping platform.

## Setup

```bash
npm install
npm run typecheck
npx expo start -c
```

Use the same Supabase project/schema as `shipflow-web`. Configure `EXPO_PUBLIC_TRACKING_API_URL` to point at the web `/api/tracking` endpoint when live tracking should be requested through the shared backend.
