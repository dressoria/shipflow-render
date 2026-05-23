# ShipFlow

ShipFlow es una plataforma de envios enfocada en Estados Unidos. El objetivo es permitir cotizar envios, crear guias/labels, hacer tracking, manejar balance y aplicar un margen pequeno por guia.

El proyecto esta dividido en dos aplicaciones:

- `shipflow-web`: aplicacion web con Next.js.
- `shipflow-mobile`: aplicacion mobile con Expo/React Native.

> Estado beta: rates reales estan conectados para ShipEngine/ShipStation API nueva, Shippo y Easyship cuando las variables server-side estan configuradas.

> Advertencia: no usar en produccion con dinero real. Labels y void/refund reales siguen detras de guards server-side y solo se han validado en sandbox/test.

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
ENABLE_REAL_LABEL_PURCHASE
ENABLE_REAL_LABEL_VOID
ADMIN_EMAILS
SHIPSTATION_API_MODE
SHIPSTATION_API_KEY
SHIPSTATION_API_SECRET
SHIPSTATION_BASE_URL
SHIPSTATION_WEBHOOK_SECRET
SHIPPO_API_KEY
EASYPOST_API_KEY
EASYSHIP_API_KEY
EASYSHIP_BASE_URL
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
- `ENABLE_REAL_LABEL_PURCHASE` es un switch server-side: debe quedar vacio/false hasta completar una fase dedicada de compra real de labels.
- `ENABLE_REAL_LABEL_VOID` es un switch server-side: debe quedar vacio/false salvo pruebas sandbox controladas.
- Los archivos `.env`, `.env.local` y `.env.*` reales estan ignorados por Git; no commitear credenciales reales.
- Para ShipEngine/ShipStation sandbox usar `SHIPSTATION_API_MODE=shipengine`, `SHIPSTATION_API_KEY` con key TEST y `SHIPSTATION_BASE_URL=https://api.shipengine.com/v1`; en ese modo no se requiere `SHIPSTATION_API_SECRET`.

## Estado actual

Existe funcionalidad beta para:

- Login/registro.
- Dashboard.
- Cotizar rates reales multi-provider.
- Compra de label ShipEngine sandbox detras de guard.
- Listar envios.
- Ver carrier label oficial via `label_url` y shipment summary interno.
- Tracking basico de shipments guardados.
- Balance basado en movimientos con debits/refunds/adjustments.
- Admin support panel con audit/reconciliation foundation.
- Mobile conectado a Supabase.

Limitaciones actuales:

- No hay pagos reales ni Stripe.
- Add funds es solo mensaje beta; no acredita saldo.
- Label purchase y void/refund estan apagados por defecto con guards.
- Shippo/Easyship/EasyPost labels y void siguen pendientes.
- Tracking realtime/webhooks carrier siguen pendientes.
- Mobile aun debe migrarse a backend seguro en FASE 6.
- No hay Dockerfile ni docker-compose.
- No hay Nginx config.
- Produccion queda bloqueada hasta staging QA, pagos reales, runbook operativo y decision de guards.

## API backend interna

Endpoints preparados:

```text
GET /api/shipments
GET /api/shipments/[id]
POST /api/shipments/create
POST /api/rates
POST /api/labels
POST /api/labels/[id]/void
GET /api/balance
GET /api/tracking
```

Notas:

- `POST /api/rates` usa el RateAggregator y consulta providers reales activos.
- `POST /api/labels` esta bloqueado si `ENABLE_REAL_LABEL_PURCHASE !== "true"`.
- Con guard activo, solo ShipEngine sandbox esta soportado para label purchase.
- `POST /api/labels/[id]/void` esta bloqueado si `ENABLE_REAL_LABEL_VOID !== "true"`.
- Con guard activo, solo ShipEngine sandbox esta soportado para void/refund.
- `GET /api/tracking` busca shipments guardados; no hace tracking realtime externo.
- Mobile aun no usa esta API para crear labels/rates; queda para FASE 6.

## Staging beta

Antes de staging:

```bash
cd shipflow-web
npm run lint
npm run typecheck
npm run build
git diff --check
```

Checklist:

- Usar solo keys sandbox/test.
- Aplicar migraciones/RPCs documentadas en `docs/DEPLOYMENT.md`.
- Mantener `ENABLE_REAL_LABEL_PURCHASE=false` y `ENABLE_REAL_LABEL_VOID=false` por defecto.
- Configurar `ADMIN_EMAILS` o `profiles.role = admin`.
- Verificar `/api/config/status` despues del deploy.
- Probar rates con la ruta NY → Mountain View y paquete `1 lb, 6 x 4 x 2 in`.
- No comprar labels ni ejecutar void salvo prueba sandbox controlada y documentada.

## Documentacion

- [Contexto principal](./CONTEXT.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Seguridad](./docs/SECURITY.md)
- [Integracion logistica](./docs/LOGISTICS_INTEGRATION.md)
- [Base de datos](./docs/DATABASE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Roadmap](./docs/ROADMAP.md)
- [Checklist migracion FASE 1D](./docs/MIGRATION_1D_CHECKLIST.md)
