# Arquitectura ShipFlow

## Vision general

ShipFlow esta compuesto por una aplicacion web, una aplicacion mobile y Supabase como capa de autenticacion/base de datos.

```text
shipflow-web
  UI Next.js
  servicios cliente/backend parcial
  app/api/tracking

shipflow-mobile
  UI Expo/React Native
  servicios Supabase
  tracking via backend web configurable

Supabase
  Auth
  PostgreSQL
  RLS
```

## Web

La app web usa Next.js App Router. Las rutas principales son:

- `/`: landing.
- `/login`: login.
- `/registro`: registro.
- `/dashboard`: resumen operativo.
- `/crear-guia`: formulario de creacion de guia interna.
- `/envios`: listado de envios.
- `/guia/[trackingNumber]`: label imprimible.
- `/tracking`: busqueda de tracking.
- `/saldo`: balance y movimientos.
- `/admin`: panel admin.
- `/api/tracking`: endpoint backend actual.
- `/api/shipments/create`: endpoint backend para crear guia interna web.
- `/api/shipments`: listado backend autenticado de envios.
- `/api/shipments/[id]`: detalle backend autenticado de envio.
- `/api/rates`: cotizacion interna/mock autenticada.
- `/api/labels`: creacion interna/mock autenticada.
- `/api/labels/[id]/void`: void interno limitado.
- `/api/balance`: lectura backend autenticada de balance.

La proteccion de rutas web se hace principalmente con componentes client-side:

- `ProtectedRoute`
- `AdminRoute`

La proteccion real de datos depende de Supabase RLS.

## Mobile

La app mobile usa Expo/React Native. Las pantallas principales viven en `shipflow-mobile/src/screens`:

- Welcome.
- Login.
- Register.
- Dashboard.
- CreateGuide.
- Shipments.
- Tracking.
- Balance.
- Profile.
- Admin.

Mobile se conecta directo a Supabase con anon key publica y usa Supabase Auth con AsyncStorage.

## Supabase

Supabase cumple dos funciones:

- Auth de usuarios.
- PostgreSQL con tablas operativas.

Tablas principales actuales:

- `profiles`
- `shipments`
- `balance_movements`
- `tracking_events`
- `couriers`
- `webhook_events` preparada en FASE 1C
- `audit_logs` preparada en FASE 1C

## Flujo actual de crear guia

Flujo web con Supabase activo despues de FASE 1B:

```text
CreateGuideForm
→ getActiveCouriers()
→ calculateShippingRate() para preview visual
→ createShipment()
→ obtiene session/access_token
→ POST /api/labels
→ backend valida usuario
→ backend valida datos
→ backend busca courier activo
→ backend recalcula tarifa local
→ backend valida saldo suficiente
→ backend crea shipment
→ backend crea tracking_event inicial
→ backend crea balance_movement negativo
→ devuelve shipment/trackingNumber
→ muestra resumen y label imprimible
```

Flujo demo sin Supabase configurado:

```text
CreateGuideForm
→ getActiveCouriers()
→ calculateShippingRate()
→ genera tracking interno SF-...
→ createShipment()
→ localStorage fallback
→ muestra resumen y label imprimible
```

Este flujo NO compra una label real en un carrier.

## Flujo actual de tracking

Flujo web:

```text
TrackingSearch
→ getShipmentByTrackingNumber()
→ getTrackingEvents()
→ POST /api/tracking
→ getRealTracking()
→ fetch a API de carrier si hay env vars
→ fallback si no hay configuracion o falla
→ saveRealTrackingEvents()
→ renderiza resultado
```

Flujo mobile:

```text
TrackingScreen
→ getShipmentByTrackingNumber()
→ getTrackingEvents()
→ getRealTracking() mobile
→ POST a EXPO_PUBLIC_TRACKING_API_URL
→ fallback con eventos locales/Supabase si falla
→ saveRealTrackingEvents()
```

## Flujo actual de balance

```text
BalancePanel / BalanceScreen
→ getBalanceMovements()
→ suma amount
→ muestra balance disponible
```

Crear guia agrega un movimiento negativo. Recargar saldo agrega un movimiento positivo fijo. Actualmente no hay pago real ni validacion financiera server-side.

## Servicios actuales

Web:

- `shipmentService`: crea guia via API backend cuando Supabase esta activo; lista/busca envios en Supabase o localStorage.
- `balanceService`: suma movimientos y permite agregar recargas.
- `courierService`: lista/crea/edita/elimina couriers y calcula tarifas locales.
- `realTrackingService`: normaliza courier y llama APIs externas configuradas para tracking.
- `trackingService`: lee y guarda eventos de tracking.
- `authService`: login, registro, logout y perfiles.

Mobile:

- `shipments`: crea/lista/busca envios en Supabase.
- `balance`: lee movimientos, suma balance y agrega recargas.
- `couriers`: lista couriers y calcula tarifa local.
- `realTrackingService`: llama al backend web de tracking si esta configurado.
- `tracking`: lee y guarda eventos de tracking.
- `auth`: Supabase Auth y perfil.
- `pdfGuideService`: genera PDF local visual de la guia.

## Endpoints actuales

Endpoints backend propios actuales:

- `POST /api/tracking`
- `POST /api/shipments/create`
- `GET /api/shipments`
- `GET /api/shipments/[id]`
- `POST /api/rates`
- `POST /api/labels`
- `POST /api/labels/[id]/void`
- `GET /api/balance`

No existen todavia:

- `/api/webhooks/shipstation`
- APIs backend para pagos/recargas reales.

## Deudas tecnicas FASE 1B

- `POST /api/shipments/create` usa operaciones secuenciales con Supabase JS; falta transaccion atomica SQL/RPC.
- Falta idempotencia persistida.
- Falta migrar mobile al backend seguro.
- Falta mover recargas/pagos a backend.
- Falta ShipStation y labels reales.

## Base logistica FASE 1C

La migracion `20260514_shipflow_security_logistics_foundation.sql` prepara:

- Provider IDs en `shipments`.
- `label_url`, `label_format`, `payment_status`, `label_status`.
- Pricing: `provider_cost`, `platform_markup`, `customer_price`, `currency`.
- Idempotencia: `idempotency_key`.
- Metadata JSON para shipment y balance.
- Ledger enriquecido en `balance_movements`.
- `webhook_events` para payloads futuros.
- `audit_logs` para auditoria.

El endpoint `POST /api/shipments/create` queda preparado para usar esos campos si la migracion esta aplicada, pero mantiene fallback legacy si la DB local aun no tiene las columnas.

No hay ShipStation ni providers externos todavia.

## Estabilizacion FASE 1D

La FASE 1D no cambia la arquitectura funcional ni conecta proveedores. Deja preparado el proceso operativo para aplicar la migracion 1C:

- Runbook/checklist: `docs/MIGRATION_1D_CHECKLIST.md`.
- La migracion recrea RLS/policies principales para el estado esperado.
- El endpoint `/api/shipments/create` debe funcionar con DB antigua y DB nueva, pero produccion debe priorizar DB nueva con migracion aplicada.
- La operacion sigue sin transaccion SQL atomica; la RPC queda pendiente antes de labels reales.
- Mobile sigue conectado directo a Supabase para operaciones sensibles hasta FASE 6.

## Backend API FASE 2

FASE 2 introduce una capa API interna en Next.js App Router:

```text
UI web
→ API backend autenticada
→ Supabase con RLS
→ logica interna/mock de couriers, rates, labels y balance
```

Archivos server-side relevantes:

- `shipflow-web/lib/server/apiResponse.ts`
- `shipflow-web/lib/server/supabaseServer.ts`
- `shipflow-web/lib/server/shipments/createInternalShipment.ts`

Comportamiento:

- `GET /api/shipments` lista envios del usuario autenticado.
- `GET /api/shipments/[id]` carga envio y tracking events del usuario autenticado.
- `POST /api/rates` recalcula tarifas internas con `couriers`.
- `POST /api/labels` crea una guia/label interna; no compra label real.
- `POST /api/labels/[id]/void` permite void interno limitado si `label_status` existe.
- `GET /api/balance` calcula balance desde `balance_movements`; no permite recargas.
- `POST /api/tracking` mantiene compatibilidad sin token, pero valida carrier permitido; si recibe Bearer token, valida sesion.

Limitaciones:

- No hay ShipStation.
- FASE 3 agrega adapters logisticos internal/mock; ShipStation aun no esta implementado real.
- No hay transaccion SQL atomica/RPC.
- No hay pagos reales ni refunds reales.
- Mobile aun no consume estos endpoints para rates/labels.

## Logistics Layer FASE 3

FASE 3 introduce la capa `shipflow-web/lib/logistics`:

```text
shipflow-web/lib/logistics
├── adapters
│   ├── LogisticsAdapter.ts
│   ├── MockAdapter.ts
│   └── ShipStationAdapter.ts
├── errors.ts
├── pricing.ts
├── registry.ts
└── types.ts
```

Comportamiento actual:

- `MockAdapter`/internal calcula rates desde `couriers`.
- `MockAdapter` crea labels internas con tracking `SF-...`, `labelStatus = internal` y `labelUrl = null`.
- `ShipStationAdapter.getRates()` implementado (FASE 4A): llama a `POST /shipments/getrates` en ShipStation V1 API.
- `ShipStationAdapter.createLabel()` implementado (FASE 4B): flujo V1 `POST /orders/createorder` → `POST /orders/createlabelfororder`. Devuelve `LabelResult` con `providerShipmentId`, `providerLabelId`, `providerServiceCode`. `labelUrl = null` (V1 devuelve base64).
- `ShipStationAdapter.voidLabel()` y `trackShipment()` devuelven error `NOT_IMPLEMENTED` (501).
- `/api/rates` soporta `provider: "shipstation"` para rates reales, o default internal/mock.
- `/api/labels` soporta `provider: "shipstation"` para labels reales (FASE 4B); default internal/mock.
- `/api/shipments/create` sigue usando internal/mock.
- Tracking real/fallback sigue en servicios actuales.

Nuevo archivo de servidor FASE 4B:

- `shipflow-web/lib/server/shipments/createShipStationShipment.ts` — orquesta validacion, idempotencia, balance check, llamada ShipStation y persistencia secuencial.

## Logistics Layer FASE 4A

Nuevas clases de error en `errors.ts`:

- `ProviderAuthError` (401): credenciales invalidas o faltantes.
- `ProviderRateLimitError` (429): rate limit del proveedor.
- `InvalidPayloadError` (400): payload invalido para el proveedor.

## Logistics Layer FASE 4B

Cambios en `types.ts`:

- `CreateLabelInput` ampliado con `provider?`, `serviceCode?`, `carrierCode?`, `labelFormat?`.
- `LabelResult` ampliado con `providerShipmentId?`, `providerLabelId?`, `providerServiceCode?`.

Nuevo archivo servidor:

- `shipflow-web/lib/server/shipments/createShipStationShipment.ts` — funcion `createShipStationShipment()` que orquesta el flujo completo: validacion de input → probe de migracion → idempotencia → balance check → compra label ShipStation → persistencia secuencial (shipment + tracking_event + balance_movement) → respuesta.

RPC preparada (no activada):

- `shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql` — funcion SQL `create_label_shipment_transaction` que reemplazara los inserts secuenciales con una sola transaccion atomica.

## Arquitectura futura deseada

La arquitectura futura debe mover operaciones sensibles a backend:

```text
UI web/mobile
→ API backend autenticada
→ servicios de dominio
→ logistics adapters
→ ShipStation/proveedores
→ Supabase transaccional/auditado
```

Base actual:

```text
shipflow-web/lib/logistics
├── adapters
├── registry.ts
├── pricing.ts
├── types.ts
└── errors.ts
```

Los componentes deben consumir APIs internas estables, no proveedores logisticos directamente.
