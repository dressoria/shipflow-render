# ShipFlow

ShipFlow es una plataforma de envios enfocada en Estados Unidos. El objetivo es permitir cotizar envios, crear guias/labels, hacer tracking, manejar balance y aplicar un margen pequeno por guia.

El proyecto esta dividido en dos aplicaciones:

- `shipflow-web`: aplicacion web con Next.js.
- `shipflow-mobile`: aplicacion mobile con Expo/React Native.

> Advertencia: ShipStation todavia no esta conectado. Las guias actuales son internas/visuales y no deben considerarse labels oficiales de carrier.

> Advertencia: no usar en produccion con dinero real hasta corregir seguridad, RLS, balance y backend transaccional.

## Estructura de carpetas

```text
Ship flow
├── shipflow-web
│   ├── app
│   ├── components
│   ├── contexts
│   ├── data
│   ├── hooks
│   ├── lib
│   ├── public
│   ├── styles
│   └── supabase
├── shipflow-mobile
│   ├── assets
│   └── src
└── docs
```

## Stack

Web:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase JS

Mobile:

- Expo
- React Native
- TypeScript
- Supabase JS
- React Navigation

Base de datos/Auth:

- Supabase Auth
- Supabase/PostgreSQL

## Comandos conocidos

Web:

```bash
cd shipflow-web
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
```

Mobile:

```bash
cd shipflow-mobile
npm start
npm run android
npm run ios
npm run web
npm run typecheck
```

## Variables de entorno conocidas

Web:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
INTERNAL_API_SECRET
SHIPSTATION_API_KEY
SHIPSTATION_API_SECRET
SHIPSTATION_BASE_URL
SHIPSTATION_WEBHOOK_SECRET
USPS_API_URL
USPS_API_KEY
USPS_TRACKING_API_URL
USPS_TRACKING_API_KEY
UPS_API_URL
UPS_API_KEY
UPS_TRACKING_API_URL
UPS_TRACKING_API_KEY
FEDEX_API_URL
FEDEX_API_KEY
FEDEX_TRACKING_API_URL
FEDEX_TRACKING_API_KEY
DHL_API_URL
DHL_API_KEY
DHL_TRACKING_API_URL
DHL_TRACKING_API_KEY
PAYMENT_PROVIDER_SECRET
WEBHOOK_PAYMENT_SECRET
```

Mobile:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_TRACKING_API_URL
```

Notas:

- Web tiene ejemplo en `shipflow-web/.env.example`.
- Mobile tiene ejemplo en `shipflow-mobile/.env.example`.
- Para desarrollo local:

```bash
cp shipflow-web/.env.example shipflow-web/.env.local
cp shipflow-mobile/.env.example shipflow-mobile/.env
```

- Las variables `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*` son visibles para cliente/app.
- Las API keys privadas de proveedores logisticos, `SUPABASE_SERVICE_ROLE_KEY`, secretos internos y secretos de pagos/webhooks no deben usar prefijos `NEXT_PUBLIC_` ni `EXPO_PUBLIC_`.
- Los archivos `.env`, `.env.local` y `.env.*` reales estan ignorados por Git; no commitear credenciales reales.
- FASE 1B no agrega `SUPABASE_SERVICE_ROLE_KEY`; el endpoint web de crear guia usa token Bearer de usuario y RLS.

## Estado actual

Existe funcionalidad base para:

- Login/registro.
- Dashboard.
- Crear guia interna.
- Listar envios.
- Ver guia imprimible.
- Tracking con fallback.
- Balance simple basado en movimientos.
- Admin basico.
- Mobile conectado a Supabase.

Limitaciones actuales:

- Crear guia no compra una label real.
- Crear guia web con Supabase activo usa `POST /api/shipments/create`, pero aun no hay transaccion SQL atomica ni idempotencia persistida.
- FASE 1C agrega una migracion incremental para provider fields, pricing, idempotencia, webhooks y auditoria, pero debe aplicarse manualmente en Supabase.
- FASE 1D agrega un runbook/checklist para aplicar y validar esa migracion: `docs/MIGRATION_1D_CHECKLIST.md`.
- No existe ShipStation.
- No existe adapter pattern formal.
- No hay Dockerfile ni docker-compose.
- No hay Nginx config.
- No hay backend seguro para balance/labels/pagos.
- RLS y balance requieren correccion antes de produccion.

## Documentacion

- [Contexto principal](./CONTEXT.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Seguridad](./docs/SECURITY.md)
- [Integracion logistica](./docs/LOGISTICS_INTEGRATION.md)
- [Base de datos](./docs/DATABASE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Roadmap](./docs/ROADMAP.md)
- [Checklist migracion FASE 1D](./docs/MIGRATION_1D_CHECKLIST.md)
