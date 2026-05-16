# Contexto ShipFlow

Este archivo es el punto de partida para futuros chats con Codex. Resume el estado tecnico actual de ShipFlow y las reglas para avanzar sin perder contexto.

## Resumen del proyecto

ShipFlow es una plataforma de envios enfocada principalmente en Estados Unidos. El objetivo del producto es permitir que usuarios coticen envios, creen guias/labels, hagan tracking, manejen balance y que la plataforma agregue un margen pequeno por guia, por ejemplo USD 0.25 o USD 0.50.

La integracion logistica prioritaria actual es ShipStation/ShipEngine. Tambien existen rates reales para Shippo y Easyship, y EasyPost queda preparado/activo solo si existe API key. En fases futuras se completaran labels multi-provider e integraciones directas con USPS, UPS, FedEx y DHL si conviene.

## Estructura general

```text
Ship flow
├── shipflow-web
│   ├── app
│   ├── components
│   ├── contexts
│   ├── data
│   ├── hooks
│   ├── lib
│   │   ├── logistics
│   │   ├── server
│   │   └── services
│   ├── public
│   ├── styles
│   └── supabase
├── shipflow-mobile
│   ├── assets
│   └── src
│       ├── components
│       ├── constants
│       ├── navigation
│       ├── screens
│       ├── services
│       └── types
└── docs
```

## Stack actual

Web:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase JS
- Framer Motion
- Lucide React

Mobile:

- Expo
- React Native
- TypeScript
- Supabase JS
- React Navigation
- Expo Print/Sharing/FileSystem para PDF local

Base de datos/Auth:

- Supabase Auth
- Supabase/PostgreSQL

## Estado actual

Existe una base funcional de producto:

- Login y registro basicos.
- Dashboard.
- Crear guia.
- Listado de envios.
- Balance.
- Admin.
- Tracking.
- Endpoint `POST /api/tracking`.
- Supabase con tablas principales: `profiles`, `shipments`, `balance_movements`, `tracking_events`, `couriers`.
- Tracking real/fallback para USPS, UPS, FedEx y DHL si se configuran variables de entorno.
- Mobile sincroniza datos con Supabase y puede llamar al backend web para tracking mediante `EXPO_PUBLIC_TRACKING_API_URL`.

## Que es real y que es demo/simulado

Real o parcialmente real:

- Autenticacion con Supabase cuando esta configurado.
- Persistencia de envios en Supabase cuando esta configurado.
- Persistencia de balance como ledger simple de movimientos.
- Persistencia de eventos de tracking.
- Consulta de tracking externo preparada para carriers si existen endpoints y credenciales.
- Cotizador web con flujo unico real en `/crear-guia`, usando `/api/rates` y `RateAggregator`.
- Rates reales server-side para ShipEngine/ShipStation sandbox, Shippo y Easyship cuando sus variables estan configuradas.
- Pricing server-side con `provider_cost`, margen ShipFlow y cargo de procesamiento.
- Labels reales ShipStation V1 existen en backend legacy si esta configurado y se cumplen migraciones/RPC; no son automaticas para todos los providers.

Demo/simulado:

- La tabla `couriers` ya no debe usarse como cotizador visible de precios finales.
- ShipEngine, Shippo, Easyship y EasyPost solo cotizan; sus labels siguen pendientes.
- Si se usa flujo interno/mock de compatibilidad backend, las guias usan tracking interno tipo `SF-...`.
- El PDF mobile es generado localmente, no emitido por ShipStation ni por un carrier.
- El balance no esta conectado a pagos reales.
- No existe Dockerfile, docker-compose ni Nginx config.

## Riesgos criticos actuales

- FASE 1A en codigo SQL: `profiles_update_own` ahora queda protegido por trigger contra cambios de `role`, `id`, `created_at` y email por usuarios normales; `profiles_insert_own` solo acepta `role = user`.
- FASE 1A en codigo SQL: `balance_movements_insert_own` fue reemplazada por una policy temporal que solo permite movimientos negativos propios.
- FASE 1B en codigo web: crear guia en web usa `POST /api/shipments/create` cuando Supabase esta activo; el servidor valida usuario, recalcula tarifa y valida saldo antes de insertar.
- Pendiente: aplicar estos cambios SQL en Supabase mediante migracion controlada; no se ejecuto migracion automaticamente.
- Mobile todavia crea guia, balance y tracking events directamente con Supabase anon key.
- No hay transaccion atomica real entre `shipment`, `tracking_event` y `balance_movement`; el endpoint web los ejecuta en secuencia.
- No hay `idempotency_key` aplicada en la DB real hasta ejecutar la migracion 1C.
- No hay `provider_label_id` ni `provider_shipment_id` aplicados en la DB real hasta ejecutar la migracion 1C.
- No hay `label_url` real.
- No hay `payment_status` ni `label_status` aplicados en la DB real hasta ejecutar la migracion 1C.
- `/api/tracking` no valida sesion ni tiene rate limit.
- Mobile no tiene `EXPO_PUBLIC_API_BASE_URL` general; solo `EXPO_PUBLIC_TRACKING_API_URL`.
- Tracking fallback puede confundirse con tracking real.

## Reglas de arquitectura

- No conectar ShipStation directamente desde frontend ni mobile.
- Las integraciones logisticas deben vivir en backend.
- El cliente no debe calcular ni decidir costos finales confiables.
- El backend debe calcular `provider_cost`, `platform_markup` y `customer_price`.
- Crear labels reales debe ser una operacion server-side, autenticada, transaccional e idempotente.
- Usar un Adapter Pattern para proveedores logisticos.
- Mantener UI separada de integraciones externas.
- Evitar acoplar ShipStation directamente a componentes.

## Reglas de seguridad

- Nada sensible en variables `NEXT_PUBLIC_*`.
- Nada sensible en variables `EXPO_PUBLIC_*`.
- API keys de ShipStation/proveedores solo en servidor.
- No usar service role en cliente.
- Operaciones de dinero, balance, labels, voids y webhooks deben pasar por backend seguro.
- RLS debe impedir escalacion de roles.
- El balance debe ser un ledger controlado, no editable libremente por usuarios.
- Webhooks deben validar firma/secreto.
- Endpoints que llamen proveedores externos deben tener auth y rate limiting.

## Variables de entorno

- Web usa `shipflow-web/.env.example` como plantilla versionada.
- Mobile usa `shipflow-mobile/.env.example` como plantilla versionada.
- Para desarrollo local:

```bash
cp shipflow-web/.env.example shipflow-web/.env.local
cp shipflow-mobile/.env.example shipflow-mobile/.env
```

- `.env`, `.env.local` y `.env.*` reales no deben commitearse.
- `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*` son visibles para cliente/app.
- ShipStation, carriers, `SUPABASE_SERVICE_ROLE_KEY`, pagos y webhooks deben quedarse solo en backend/servidor.

## Fases acordadas

1. FASE 0 - Contexto/documentacion base.
2. FASE 1 - Seguridad, RLS, base y dinero.
3. FASE 2 - Backend API real.
4. FASE 3 - Logistics adapters.
5. FASE 4 - ShipStation real.
6. FASE 5 - Tracking/webhooks reales.
7. FASE 6 - Mobile conectado al backend seguro.
8. FASE 7 - Docker + servidor + Nginx + SSL.

## Como trabajar con Codex

- Leer este archivo antes de hacer cambios.
- Mantener cambios pequenos por fase.
- No mezclar seguridad, UI, ShipStation y deploy en el mismo cambio.
- Antes de modificar schema o RLS, explicar el cambio esperado.
- Antes de conectar proveedores reales, crear endpoints backend seguros.
- Antes de tocar mobile para labels reales, definir API web estable.
- No hacer commits a menos que el usuario lo pida.

## Que NO hacer todavia

- No ejecutar migraciones automaticamente.
- No cambiar componentes ni servicios durante esta fase.
- No instalar paquetes.
- No crear Dockerfile todavia.
- No mover operaciones reales de dinero sin corregir RLS y backend.
- No poner API keys reales en el repositorio.
- No conectar webhooks de ShipStation todavia (FASE 5).
- No usar en produccion publica hasta completar el checklist de FASE 4E.

## Estado FASE 1A

Cambios preparados en `shipflow-web/supabase/schema.sql`:

- Trigger `protect_profile_admin_fields` para impedir escalacion de rol/admin desde cliente.
- Policy `profiles_insert_own` restringida a `role = user`.
- Policy admin explicita para update de perfiles.
- Policy de balance renombrada a `balance_movements_insert_negative_own`, permitiendo temporalmente solo movimientos negativos propios.

Deuda tecnica pendiente:

- Crear guia todavia debe moverse a backend transaccional.
- Balance real todavia no esta listo para dinero real.
- Recargas positivas deben venir de backend/pagos verificados en FASE 1B/2.
- ShipStation no debe conectarse hasta completar seguridad/base/API.

## Estado FASE 1B

Cambios preparados en web:

- Nuevo helper server-side `shipflow-web/lib/server/supabaseServer.ts`.
- Nuevo endpoint `POST /api/shipments/create`.
- El formulario web sigue mostrando preview local, pero la creacion con Supabase activo llama al endpoint backend.
- El backend valida token Bearer de Supabase, campos minimos, courier activo, COD y saldo suficiente.
- El backend recalcula la tarifa local/mock usando `MockAdapter`, que envuelve la logica actual de `calculateShippingRate`.
- El backend crea `shipment`, `tracking_event` inicial y `balance_movement` negativo.

Deuda tecnica pendiente:

- No hay transaccion SQL atomica/RPC aplicada.
- No hay idempotencia persistida en la DB real hasta aplicar la migracion 1C.
- Mobile todavia debe migrarse a backend seguro en FASE 6.
- Balance real y recargas positivas verificadas siguen pendientes.
- ShipStation sigue pendiente.

## Estado FASE 1C

Cambios preparados en base de datos:

- Nueva migracion incremental: `shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql`.
- `schema.sql` actualizado para reflejar el estado final deseado.
- `shipments` queda preparado para provider IDs, label URL, estados de pago/label, pricing, currency, metadata e idempotencia.
- `balance_movements` queda preparado con `type`, referencias, `shipment_id`, `idempotency_key`, metadata y `created_by`.
- Nuevas tablas futuras: `webhook_events` y `audit_logs`.
- Indices y constraints para idempotencia, estados, provider fields y auditoria.

Cambios preparados en endpoint:

- `POST /api/shipments/create` acepta/genera `idempotencyKey`.
- Si la columna existe y encuentra un shipment previo para el usuario/key, devuelve el shipment existente.
- Intenta guardar campos logisticos nuevos; si la DB real aun no tiene la migracion aplicada, cae a insert legacy para no romper desarrollo.

Deuda tecnica pendiente:

- No se ejecuto la migracion contra Supabase.
- No hay RPC/transaccion SQL atomica todavia.
- No hay ShipStation ni labels reales.
- No hay pagos reales.
- Mobile sigue pendiente.

## Estado FASE 1D

Objetivo de esta fase:

- Validar la migracion 1C antes de aplicarla en Supabase real.
- Preparar pasos seguros de aplicacion manual y checklist post-migracion.
- Mantener ShipStation pendiente.

Cambios preparados:

- La migracion 1C fue revisada y ajustada para activar RLS en tablas existentes, recrear policies principales y evitar fallo duro si ya existieran duplicados de `idempotency_key`.
- Se agrego runbook: `docs/MIGRATION_1D_CHECKLIST.md`.
- La migracion sigue sin ejecutarse automaticamente.

Deuda tecnica pendiente:

- Aplicar la migracion manualmente en Supabase despues de backup/snapshot.
- Verificar RLS con usuario normal y admin real.
- Crear RPC/transaccion SQL atomica para `shipment + tracking_event + balance_movement`.
- Endurecer policies temporales de `shipments_insert_own`, `shipments_update_own` y `tracking_events_insert_own` cuando mobile migre al backend.
- ShipStation y pagos reales siguen bloqueados hasta cerrar seguridad/base/API.

## Estado FASE 2

Objetivo:

- Crear una capa API backend interna para ShipFlow antes de conectar proveedores reales.

Endpoints preparados en web:

- `GET /api/shipments`
- `GET /api/shipments/[id]`
- `POST /api/shipments/create` como compatibilidad para creacion interna existente.
- `POST /api/rates`
- `POST /api/labels`
- `POST /api/labels/[id]/void`
- `GET /api/balance`
- `POST /api/tracking` mejorado con validacion estricta de carrier y auth opcional compatible.

Notas:

- Todos los endpoints nuevos de usuario validan Bearer token de Supabase.
- `POST /api/rates` calcula tarifas internas/mock con `couriers`.
- `POST /api/labels` crea label interna/mock; no compra label real.
- `POST /api/labels/[id]/void` no llama proveedor ni hace refund real; solo puede marcar label interna como `voided` si la migracion 1C esta aplicada.
- Se extrajo logica compartida a `shipflow-web/lib/server/shipments/createInternalShipment.ts`.
- ShipStation sigue pendiente para FASE 4 y adapters logisticos para FASE 3.
- Mobile sigue pendiente para FASE 6.
- Sigue pendiente RPC/transaccion SQL atomica antes de dinero real o labels reales.

## Estado FASE 3

Objetivo:

- Crear una capa logistica extensible para no acoplar ShipFlow directamente a ShipStation.

Cambios preparados:

- Nueva carpeta `shipflow-web/lib/logistics`.
- Contrato `LogisticsAdapter` para rates, labels, void y tracking opcional.
- `MockAdapter`/internal activo para tarifas y labels internas usando la logica local de `couriers`.
- `ShipStationAdapter` queda como skeleton server-side: lee nombres de variables de entorno, pero no llama APIs reales y responde error controlado si se usa.
- `registry.ts` permite obtener adapters por provider.
- `pricing.ts` centraliza `provider_cost`, `platform_markup` y `customer_price`.
- `/api/rates`, `/api/labels` y `/api/shipments/create` usan la capa internal/mock mediante la logica compartida server-side.

Deuda tecnica pendiente:

- Implementar ShipStation real en FASE 4.
- Migrar tracking real a adapters o webhooks en FASE 5.
- Mantener mobile pendiente hasta FASE 6.
- No usar con dinero real hasta aplicar migracion, RPC/transaccion atomica y flujo de pagos.

## Estado FASE 4A

Objetivo:

- Conectar rates reales de ShipStation sin comprar labels.

Cambios preparados:

- `ShipStationAdapter.getRates()` implementado con llamada real a `POST /shipments/getrates` de ShipStation V1 API.
- Autenticacion Basic Auth (key:secret) leida solo desde variables de entorno server-side.
- Normalizacion de respuesta ShipStation a `RateResult[]` con `provider: "shipstation"`, `serviceCode`, `serviceName`, `providerCost`, `platformMarkup` (0 por ahora), `customerPrice`, estimatedTime.
- Manejo de errores: credenciales faltantes, 401/403, 429, 400, timeout, sin rates.
- Nuevas clases de error: `ProviderAuthError`, `ProviderRateLimitError`, `InvalidPayloadError`.
- `ShipStationAdapter.createLabel()`, `voidLabel()` y `trackShipment()` devuelven `LogisticsError` con codigo `NOT_IMPLEMENTED` (501).
- `/api/rates` acepta `provider: "shipstation"` en el body: usa `ShipStationAdapter` con `RateInput` completo (origin/destination/parcel con postal codes).
- `/api/rates` mantiene `provider: "shipstation"` solo como compatibilidad directa, pero el flujo visible usa `mode: "best_available"` y ya no expone cotizaciones locales de `couriers`.

Variables necesarias FASE 4A:

```
SHIPSTATION_API_KEY       # requerida
SHIPSTATION_API_SECRET    # recomendada
SHIPSTATION_BASE_URL      # opcional; default https://ssapi.shipstation.com
```

Deuda tecnica pendiente (cerrada en FASE 4B):

- `createLabel()` real implementado en FASE 4B.
- `voidLabel()` real queda para FASE 4D.
- Webhooks ShipStation en FASE 5.
- Mobile pendiente hasta FASE 6.

## Estado FASE 4B

Objetivo:

- Implementar `createLabel()` real en `ShipStationAdapter` y conectar `/api/labels` con provider shipstation.

Cambios preparados:

- `ShipStationAdapter.createLabel()` implementado usando ShipStation V1 API (mismo base URL y auth que FASE 4A).
  - Paso 1: `POST /orders/createorder` con `orderKey = idempotencyKey` para idempotencia a nivel ShipStation.
  - Paso 2: `POST /orders/createlabelfororder` para comprar el label real.
  - Normaliza respuesta a `LabelResult` con `providerShipmentId`, `providerLabelId`, `providerServiceCode`.
  - `labelUrl = null` porque ShipStation V1 devuelve `labelData` en base64, no una URL directa.
- Nuevos tipos en `CreateLabelInput`: `provider?`, `serviceCode?`, `carrierCode?`, `labelFormat?`.
- Nuevos campos opcionales en `LabelResult`: `providerShipmentId?`, `providerLabelId?`, `providerServiceCode?`.
- `ShipmentRow` en `createInternalShipment.ts` ampliado con todos los campos de provider FASE 1C.
- Nuevo archivo `shipflow-web/lib/server/shipments/createShipStationShipment.ts`:
  - Valida input (campos requeridos, postal codes, serviceCode, carrierCode).
  - Verifica que la migracion 1C este aplicada (probe via columna `idempotency_key`).
  - Chequeo de idempotencia: si existe shipment con `label_status = purchased` y mismo idempotencyKey, devuelve el existente.
  - Valida saldo antes de comprar (usa `expectedCost` si el cliente lo envia, o valida que balance > 0).
  - Llama `ShipStationAdapter.createLabel()`.
  - Persiste `shipments` con todos los campos de provider.
  - Persiste `tracking_events` inicial (source = shipstation, is_real = true).
  - Persiste `balance_movements` negativo de tipo `debit`.
  - Si ShipStation compra pero persistencia falla: devuelve error critico con tracking number y provider IDs para recuperacion manual.
- `/api/labels/route.ts` actualizado: si `provider: "shipstation"` llama `createShipStationShipment`; de lo contrario sigue el flujo interno.
- Nuevo archivo migration `shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql`:
  - Funcion SQL `create_label_shipment_transaction` que hace todo en una sola transaccion.
  - NO ejecutada todavia; es la deuda para reemplazar los inserts secuenciales.
  - Solo accesible por `service_role`, no por el cliente.

Variables necesarias FASE 4B (mismas que 4A):

```
SHIPSTATION_API_KEY       # requerida
SHIPSTATION_API_SECRET    # recomendada
SHIPSTATION_BASE_URL      # opcional; default https://ssapi.shipstation.com
```

Flujo de labels reales (POST /api/labels con provider: "shipstation"):

```json
{
  "provider": "shipstation",
  "origin": { "city": "Austin", "state": "TX", "postalCode": "78756", "country": "US" },
  "destination": { "city": "Miami", "state": "FL", "postalCode": "33101", "country": "US" },
  "parcel": { "weight": 1.5, "weightUnit": "lb" },
  "carrierCode": "stamps_com",
  "serviceCode": "usps_priority_mail",
  "expectedCost": 7.50,
  "idempotencyKey": "<uuid>",
  "senderName": "John Doe",
  "senderPhone": "5551234567",
  "recipientName": "Jane Doe",
  "recipientPhone": "5559876543",
  "productType": "Package"
}
```

- `serviceCode` debe venir de una llamada previa a `POST /api/rates` con `provider: "shipstation"`.
- `expectedCost` es opcional pero recomendado para validacion de saldo.
- `idempotencyKey` es opcional; si no se envia, se genera uno automaticamente.

Deuda tecnica pendiente:

- Inserts son secuenciales (no atomicos); riesgo de label comprada sin balance descontado si falla step 6.
- Activar la RPC `create_label_shipment_transaction` para atomicidad real.
- `voidLabel()` real queda para FASE 4D.
- Webhooks ShipStation en FASE 5.
- Mobile pendiente hasta FASE 6.
- `labelUrl` es siempre null para ShipStation V1 (solo devuelve base64 `labelData`).
- NO usar en produccion con cobros reales hasta activar la RPC atomica y validar con pruebas manuales.

## Estado FASE 4D

Objetivo:

- Activar persistencia atomica via RPC (requiere `SUPABASE_SERVICE_ROLE_KEY`).
- Implementar `voidLabel()` real en ShipStation.
- Manejar `labelData` base64 correctamente.
- Endpoint `/api/labels/[id]/void` completo para provider shipstation.

Cambios preparados:

- `ShipStationAdapter.voidLabel()` implementado usando ShipStation V1 API: `POST /shipments/{shipmentId}/voidlabel`. Devuelve `{ approved: boolean, message }`. Errores 401/403/404/429/5xx manejados.
- `VoidLabelInput` ampliado con `providerShipmentId?: string` para pasar el numeric ID de ShipStation sin ambiguedad.
- `LabelResult` ampliado con `labelData?: string | null` (base64 PDF de ShipStation V1; no se guarda en DB; se devuelve solo en la respuesta inmediata).
- `createShipStationShipment.ts` completamente reescrito para usar la RPC `create_label_shipment_transaction` via cliente de servicio role:
  - Verifica `SUPABASE_SERVICE_ROLE_KEY` ANTES de comprar el label (evita comprar sin poder persistir).
  - No vuelve a inserts secuenciales; para provider shipstation, si la RPC no existe, devuelve error critico con recovery info.
  - Retorna `labelData` (base64 PDF) en la respuesta inmediata para que el cliente pueda imprimir.
- `ShipStationShipmentResult` ampliado con `labelData: string | null`.
- Migration SQL `20260514_create_label_transaction_rpc.sql` mejorada:
  - `create_label_shipment_transaction`: agrega parametro `p_label_format`, validacion `p_customer_price > 0`.
  - Nueva funcion `void_label_refund_transaction`: update atomico de `label_status = 'voided'` + insert de `balance_movement` tipo `refund` + idempotencia.
  - Ambas funciones: `SECURITY DEFINER`, `REVOKE ALL FROM public`, `GRANT EXECUTE TO service_role`.
  - SQL NO ejecutado; aplicar manualmente en Supabase.
- `createServiceSupabaseClient()` y `isServiceRoleConfigured` agregados a `supabaseServer.ts`.
- `isRpcNotFoundError()` agregado a `apiResponse.ts` para detectar errores PGRST202/42883.
- `/api/labels/[id]/void` actualizado: si provider shipstation, llama SS void, luego `void_label_refund_transaction` RPC para atomicamente actualizar estado y crear refund. Idempotencia: verifica si refund ya existe antes de llamar SS.
- `.env.example` actualizado: agrega `SHIPFLOW_LABELS_BUCKET` y `SHIPFLOW_LABELS_PUBLIC_BASE_URL` como placeholders para futura integracion de Supabase Storage.

Variables necesarias FASE 4D:

```
SHIPSTATION_API_KEY              # requerida para rates/labels/void
SHIPSTATION_API_SECRET           # recomendada
SHIPSTATION_BASE_URL             # opcional; default https://ssapi.shipstation.com
SUPABASE_SERVICE_ROLE_KEY        # REQUERIDA para RPC atomica (nueva en 4D)
```

Flujo de void real (POST /api/labels/{id}/void con provider shipstation):

1. Valida usuario y busca shipment.
2. Si `label_status = voided` ya, retorna 409.
3. Si `label_status != purchased`, retorna 409.
4. Verifica que ya exista refund en `balance_movements` (idempotencia).
5. Llama `ShipStationAdapter.voidLabel()` — SS confirma `approved: true`.
6. Llama RPC `void_label_refund_transaction` via service_role.
7. RPC atomicamente: update `label_status = voided`, `payment_status = refunded`, insert `balance_movement` tipo `refund`.
8. Retorna resultado.

labelData / base64:

- ShipStation V1 devuelve `labelData` en base64 en la respuesta de crear label.
- No se guarda en la DB (puede ser muy grande y crece con cada label).
- Se devuelve en la respuesta inmediata de `POST /api/labels` para que el cliente pueda descargar/imprimir.
- El cliente debe guardar el base64 inmediatamente; no es recuperable via idempotency re-entry.
- `label_url` sigue siendo null en la DB. Para almacenarlo permanentemente, se debe configurar Supabase Storage con `SHIPFLOW_LABELS_BUCKET` (pendiente FASE futura).

Deuda tecnica pendiente antes de produccion:

1. Aplicar migration `20260514_create_label_transaction_rpc.sql` manualmente en Supabase (ya requiere FASE 1C aplicada primero).
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` en el servidor.
3. Probar flujo completo con cuenta ShipStation de prueba siguiendo `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`.
4. Implementar Supabase Storage para guardar label PDFs permanentemente (opcional pero recomendado).
5. Webhooks ShipStation (FASE 5).
6. Mobile al backend seguro (FASE 6).

## Estado FASE 4E

Objetivo:

- Preparar guia exacta de aplicacion y prueba real controlada para migraciones y flujo ShipStation.

Cambios preparados:

- Nuevo checklist `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`:
  - Pre-checks: backup, entorno, variables, tipo de `balance_movements.id`, ShipStation test account.
  - Aplicacion manual de las dos migraciones en orden correcto.
  - Verificaciones SQL post-migracion: columnas, funciones RPC, permisos, RLS, policies.
  - Pruebas API locales paso a paso: balance, rates, saldo insuficiente, label real, idempotencia, void, idempotencia de void.
  - Curls de ejemplo con placeholders para `/api/rates`, `/api/labels`, `/api/labels/[id]/void`.
  - Tabla de errores esperados con codigo HTTP y causa.
  - Lista de lo que NO hacer.
  - Checklist de aprobacion para produccion.

No se ejecutaron migraciones. No se hicieron cambios de codigo.

Variables requeridas para el flujo completo:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # REQUERIDA para RPC atomica
SHIPSTATION_API_KEY              # REQUERIDA para rates/labels/void
SHIPSTATION_API_SECRET           # recomendada
SHIPSTATION_BASE_URL             # opcional; default https://ssapi.shipstation.com
```

ADVERTENCIA: No usar en produccion publica hasta completar el checklist de FASE 4E completo.
FASE 5 (webhooks) viene despues del checklist de FASE 4E.

## Estado FASE 5

Objetivo:

- Recibir y procesar webhooks de ShipStation para sincronizar estados de envio y tracking automaticamente.

Cambios preparados:

- Nuevo endpoint `POST /api/webhooks/shipstation`:
  - Valida secreto en tiempo constante via header `x-shipflow-webhook-secret` o query `?secret=`.
  - Hace fetch a `resource_url` de ShipStation con Basic Auth para obtener datos reales del shipment.
  - Deduplica via `event_id` (SHA-256 de `provider:resource_type:resource_url`) contra `webhook_events`.
  - Inserta en `webhook_events` con `status = received → processed` o `failed`.
  - Busca shipment por `provider_shipment_id`, `tracking_number` o `idempotency_key (orderKey)`.
  - Actualiza `shipments.status` y `shipments.label_status` segun estado de ShipStation.
  - Inserta `tracking_events` con `source = "shipstation_webhook"`, `is_real = true`.
  - Idempotencia: segundo envio del mismo evento retorna `duplicate: true` sin insertar nada.
  - Sin usuario Bearer token — autenticacion por secreto compartido.
  - Service role para todas las operaciones de DB.
- Nuevo helper `lib/server/webhooks/shipstation.ts`:
  - `extractWebhookSecret()` — extrae secreto de header o query.
  - `isValidWebhookSecret()` — comparacion en tiempo constante.
  - `generateEventId()` — SHA-256 de provider:type:url.
  - `fetchSSResource()` — fetch a resource_url de ShipStation con timeout 10s.
  - `normalizeWebhookEvent()` — normaliza payload a estructura tipada.
  - `mapSSStatusToInternal()` — mapeo de estados SS a español e internos.
  - `mapEventToTitle()` — titulo legible para tracking_event.
- Nuevo checklist `docs/SHIPSTATION_WEBHOOK_TEST_CHECKLIST.md`.
- No se requirio nueva migracion SQL: `webhook_events` ya existia de FASE 1C con todos los campos necesarios.

Variables nuevas FASE 5:

```
SHIPSTATION_WEBHOOK_SECRET   # REQUERIDA; generar con: openssl rand -hex 32
```

Variables ya requeridas (de FASE 4D):

```
SUPABASE_SERVICE_ROLE_KEY        # REQUERIDA para operaciones de webhook
SHIPSTATION_API_KEY              # REQUERIDA para fetch de resource_url
SHIPSTATION_API_SECRET           # recomendada
```

ADVERTENCIA: ShipStation requiere HTTPS para enviar webhooks. No registrar la URL del webhook en ShipStation hasta que el servidor tenga SSL configurado.
FASE 6 (mobile backend seguro) es el siguiente paso.

## Estado FASE 5.5 — Web UI operativa

Objetivo:

- Cerrar la experiencia web operativa antes de pasar a mobile.

Cambios preparados:

**Tipos y servidor:**
- `lib/types.ts`: `Envio` extendido con campos opcionales `provider`, `labelStatus`, `paymentStatus`, `customerPrice`, `providerShipmentId`.
- `lib/server/shipments/createInternalShipment.ts:fromShipmentRow`: mapea los nuevos campos de la fila de DB a `Envio`.

**Cliente API centralizado:**
- Nuevo `lib/services/apiClient.ts`: helper autenticado que lee el token de sesion de Supabase y llama a los endpoints propios: `apiGetBalance()`, `apiGetShipments()`, `apiGetRates()`, `apiCreateSSLabel()`, `apiVoidLabel()`.

**Servicios actualizados:**
- `lib/services/shipmentService.ts`: `getShipments()` y `getShipmentByTrackingNumber()` ahora usan `/api/shipments` (backend autenticado) cuando Supabase esta activo. Fallback a localStorage en modo demo.
- `lib/services/balanceService.ts`: `getAvailableBalance()` y `getBalanceMovements()` usan `/api/balance`. `addBalance()` solo funciona en modo demo local.

**Componentes actualizados:**
- `BalancePanel.tsx`: usa `/api/balance` via apiClient. Boton de recarga solo en modo demo; en Supabase activo muestra nota de que recargas van por admin.
- `ShipmentsTable.tsx`: usa `/api/shipments`. Muestra campos extendidos: provider (badge), label_status (badge coloreado), payment_status, customer_price. Boton "Anular" con confirmacion inline para shipments de ShipStation con label_status = purchased. Llama `apiVoidLabel()`.
- `CreateGuideForm.tsx`: refactorizado con flujo dual:
  - **Provider selector**: "Internal / demo" (default) o "ShipStation (real)".
  - **Flujo internal**: igual al anterior (couriers locales, calculo local, sin confirmacion extra).
  - **Flujo ShipStation**: formulario con campos comunes + state/weightUnit adicionales. Boton "Get ShipStation rates" llama `/api/rates`. Muestra lista de rates reales. Formulario secundario para postal codes (requeridos para label). Boton "Generate real ShipStation label" abre modal de confirmacion explicito. Al confirmar llama `apiCreateSSLabel()`. Si respuesta trae `labelData` (base64 PDF): boton "Download label PDF" crea blob local en el navegador sin pasar por localStorage ni logs. Si no hay labelData (retry/idempotencia): mensaje explicativo.
- `TrackingSearch.tsx`: muestra badge "Real" cuando `isReal = true` y fuente del tracking.
- `PrintableGuide.tsx`: muestra provider, label_status y providerShipmentId si estan disponibles.

**No cambiado:**
- Flujo internal/mock sigue funcionando igual.
- Mobile no fue tocado.
- No se instalaron paquetes adicionales.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Pendiente antes de usar ShipStation real desde UI:**
1. Aplicar migraciones FASE 1C y FASE 4D en Supabase (para que `fromShipmentRow` devuelva campos provider/label).
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` en servidor.
3. Configurar `SHIPSTATION_API_KEY` y `SHIPSTATION_API_SECRET`.
4. Completar checklist `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`.
5. Para webhooks: completar `docs/SHIPSTATION_WEBHOOK_TEST_CHECKLIST.md`.
6. FASE 6: mobile al backend seguro.
7. Supabase Storage para guardar label PDFs permanentemente (pendiente FASE futura).

ADVERTENCIA: No usar el flujo ShipStation desde la UI sin tener `SUPABASE_SERVICE_ROLE_KEY` configurado y la migracion de RPC aplicada. El backend ya devuelve error 503 si faltan, pero el balance podria quedar sin descontar si la RPC no existe.

## Estado FASE 5.6 — Quitar demo visible, ocultar providers, mejorar diagnóstico Supabase

Objetivo:

- Eliminar cualquier texto que revele implementación interna ("demo", "ShipStation", "internal", "provider") en la interfaz de usuario.
- Proveedores son secretos internos del negocio.
- Mejorar diagnóstico de error de Supabase para facilitar debugging.

Cambios:

**CreateGuideForm.tsx** (reescrito completo):
- Selector de modo: "Cotización estándar" / "Mejor tarifa disponible" (reemplaza "Internal / demo" / "ShipStation (real)").
- Tipo de cotización en lugar de "Shipping provider".
- Rates con etiquetas "Más económico" / "Más rápido" según posición.
- Modal de confirmación sin referencias a ShipStation.
- Descarga de guía como `guia-{tracking}.pdf` (sin nombre de proveedor).
- Secciones del formulario: Remitente, Destinatario, Paquete.
- Placeholders descriptivos en español.

**ShipmentsTable.tsx**:
- Columna "Carrier / Provider" renombrada a "Carrier". Columna "Label" renombrada a "Guía".
- Badge de provider eliminado (ya no se muestra "shipstation" o "internal" al usuario).
- Solo se muestra el nombre del carrier/courier.

**BalancePanel.tsx**:
- "Demo local" → "Modo local".
- "Recargar saldo (demo)" → "Recargar saldo".

**PrintableGuide.tsx**:
- Filas "Provider" y "Provider ID" eliminadas del bloque "Package and carrier".
- "Label status" también eliminado (datos técnicos internos).

**supabaseServer.ts**:
- Nueva función `getSupabaseConfigDiagnostic()` que identifica cuál variable de entorno específica falta o es inválida.
- `createUserSupabaseClient()` y `createServiceSupabaseClient()` usan diagnóstico en el mensaje de error.

**No cambiado:**
- Lógica interna de providers (backend sigue usando "internal"/"shipstation" como valores técnicos).
- Flujo mock/internal del backend sigue activo como fallback.
- Mobile no fue tocado.
- No se instalaron paquetes.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Validaciones:** lint 0 errores / 7 warnings (pre-existentes), typecheck limpio, build exitoso (24 rutas).

## Estado FASE 5.7 — Motor multi-provider

Objetivo:

- Crear base del motor multi-provider sin decidir la fórmula matemática final.
- ShipStation sigue siendo el único proveedor real activo.
- Shippo, EasyPost, Easyship preparados como skeleton.
- Providers nunca visibles al usuario.

**Archivos nuevos:**
- `lib/logistics/providerCapabilities.ts` — mapa de capacidades por provider: `supportsRates`, `supportsLabels`, `supportsVoid`, `supportsTracking`, `configured`, `priority`.
- `lib/logistics/rateAggregator.ts` — consulta adapters configurados en paralelo, captura errores por provider, devuelve rates rankeados.
- `lib/logistics/rateRanking.ts` — ranking provisional (cheapest/fastest/recommended). **Modelo matemático final pendiente.**
- `lib/logistics/adapters/ShippoAdapter.ts` — skeleton. Requiere `SHIPPO_API_KEY`.
- `lib/logistics/adapters/EasyPostAdapter.ts` — skeleton. Requiere `EASYPOST_API_KEY`.
- `lib/logistics/adapters/EasyshipAdapter.ts` — skeleton. Requiere `EASYSHIP_API_KEY` + `EASYSHIP_BASE_URL`.

**Archivos modificados:**
- `lib/logistics/types.ts`: `LogisticsProvider` += `"shippo" | "easypost" | "easyship"`. `RateResult` += `tags?`.
- `lib/logistics/registry.ts`: `normalizeProvider` y `getLogisticsAdapter` actualizados para los nuevos providers.
- `lib/services/apiClient.ts`: nuevo tipo `AggregatedRatesBody { mode: "best_available" }`, union `RatesBody`, `apiGetRates` acepta ambos.
- `app/api/rates/route.ts`: nuevo branch `isAggregatedRequest` usa `aggregateRates()`. Branch ShipStation directo (`provider: "shipstation"`) conservado para retrocompatibilidad.
- `components/CreateGuideForm.tsx`: modo "online" envía `mode: "best_available"` (antes `provider: "shipstation"`).
- `.env.example`: stubs para nuevos providers.

**No cambiado:**
- Flujo internal/mock sigue siendo fallback técnico.
- Label creation: sigue usando ShipStation (único provider real configurado).
- Mobile no fue tocado.
- No se instalaron paquetes.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Validaciones:** lint 0 errores, typecheck limpio, build exitoso (24 rutas).

FASE 5.8 corrigió el routing de provider en label creation (ver sección siguiente).

## Estado FASE 5.8 — Routing de provider correcto y multi-provider seguro

Objetivo:

- Eliminar hardcode de `"shipstation"` en creación de label.
- La guía se compra con el provider del rate seleccionado, no con uno hardcodeado.
- Providers skeleton retornan 501 en `/api/labels` sin fallback silencioso.
- UI muestra error controlado para providers todavía no implementados.

**Archivos modificados:**
- `lib/logistics/types.ts`: `RateResult` += `providerRateId?` (ID interno del rate por provider).
- `lib/services/apiClient.ts`: `SSLabelBody` → `CreateLabelBody` (provider genérico), `SSLabelResult` → `CreateLabelResult`, `apiCreateSSLabel` → `apiCreateLabel`.
- `components/CreateGuideForm.tsx`:
  - `handleConfirmed()`: usa `selectedApiRate.provider` en vez de hardcodear `"shipstation"`. Si provider es skeleton (shippo/easypost/easyship), muestra error controlado sin llamar al API.
  - `AvailableRatesList`: usa `rate.tags` del servidor (rateRanking) cuando están disponibles; agrega badge "Recomendado"; key de item incluye `provider` para evitar colisiones entre providers.
- `app/api/labels/route.ts`: guard explícito para shippo/easypost/easyship → 501 sin fallback a ShipStation.
- Adapters skeleton (ShippoAdapter, EasyPostAdapter, EasyshipAdapter): parámetros `_input` → `_` para suprimir warnings de lint.

**Comportamiento:**
- ShipStation: flujo de label real sin cambios.
- Providers skeleton: UI muestra "Esta opción todavía no está disponible para generar guía." Nunca intenta llamar al API.
- `/api/labels`: si recibe provider shippo/easypost/easyship, devuelve 501 (doble barrera).
- Tags de tarifa: se renderizan desde `rate.tags` del servidor cuando están disponibles.

**No cambiado:**
- Modelo matemático final sigue pendiente.
- Mobile no fue tocado.
- No se instalaron paquetes.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Validaciones:** lint 0 errores, typecheck limpio, build exitoso.

**Pendiente (fase posterior):**
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Definir modelo matemático final de ranking y margen.

FASE 6 (mobile al backend seguro) es el siguiente paso.

## Estado FASE 5.9 — Pricing engine rentable, deduplicación inteligente y fee de pago

Objetivo:

- Construir el motor inicial de pricing real con margen rentable.
- Deduplicar rates equivalentes de distintos providers, conservando el más barato internamente.
- Sumar fee de procesamiento de pago al precio final (no lo absorbe ShipFlow).
- Mejorar las cards de tarifas al estilo cotizador profesional.
- Mostrar desglose claro de precio en el modal de confirmación.

**Modelo de pricing aprobado:**

```
platform_markup = max(0.99, provider_cost * 0.06)
subtotal        = provider_cost + platform_markup
payment_fee     = subtotal * 0.029 + 0.30
customer_price  = subtotal + payment_fee
```

Ejemplos:
- provider_cost $3.00 → markup $0.99 → subtotal $3.99 → fee $0.42 → total $4.41
- provider_cost $100.00 → markup $6.00 → subtotal $106.00 → fee $3.37 → total $109.37

**Archivos creados:**
- `lib/logistics/rateDeduplication.ts`: `deduplicateRates()` — agrupa rates por (carrier normalizado, servicio normalizado, días estimados); conserva el rate con menor `providerCost`; el provider ganador y su metadata interna se preservan para crear label.

**Archivos modificados:**
- `lib/logistics/types.ts`: `PricingBreakdown` extendido con `subtotal`, `paymentFee` (requeridos) y `markupPercentage`, `markupMinimum`, `paymentFeePercentage`, `paymentFeeFixed` (opcionales — snapshot de config).
- `lib/logistics/pricing.ts`: Reescrito con `calculatePlatformMarkup()`, `calculatePaymentFee()`, `calculateCustomerPrice()` (pricing completo con fee). `applyMarkup()` conservado para retrocompatibilidad en adapters (devuelve pricing.paymentFee = 0).
- `lib/logistics/rateAggregator.ts`: Pipeline extendido: raw rates → reprice (calculateCustomerPrice) → deduplicateRates → rankRates. Los adapters siguen devolviendo costo crudo; el aggregator aplica el modelo de pricing completo.
- `lib/logistics/rateRanking.ts`: Ranking con score ponderado: `score = normalizedPrice * 0.65 + normalizedSpeed * 0.35`. cheapest = menor customerPrice; fastest = menor días (si distinto de cheapest); recommended = menor score (solo si no tiene ya cheapest ni fastest).
- `lib/services/apiClient.ts`: `CreateLabelBody` += `platformMarkup?`, `paymentFee?` (informacionales; el backend los ignora por ahora — storage de payment_fee pendiente de migración de schema).
- `components/CreateGuideForm.tsx`:
  - `handleConfirmed()`: pasa `platformMarkup` y `paymentFee` al API junto con `expectedCost` (precio final completo).
  - `AvailableRatesList`: nuevo diseño de cards — badges arriba ("Nuestra recomendación", "El costo más bajo", "Lo más rápido"), nombre de carrier mapeado a display (UPS/FedEx/USPS/DHL), entrega en días formateada ("Entrega en N días"), precio grande.
  - `ConfirmModal`: muestra desglose de precio (Envío + Cargo de servicio ShipFlow + Cargo de procesamiento de pago + Total) cuando `pricing.paymentFee > 0`.
  - Nuevas funciones locales: `displayCarrier()` (mapea carrier code a nombre visible), `formatDelivery()` (formatea estimatedTime a "Entrega en N días").

**Comportamiento del pipeline de rates (modo best_available):**
```
provider adapters → providerCost (raw, sin markup)
aggregateRates()  → reprice via calculateCustomerPrice (markup + payment_fee)
                 → deduplicateRates (un rate por carrier/servicio/días, el más barato gana)
                 → rankRates (cheapest / fastest / recommended con score)
                 → { rates con pricing completo, tags, proveedor ganador oculto }
```

**Provider interno oculto:**
- El usuario nunca ve "shipstation", "shippo", "easypost", "easyship", "internal", "mock".
- `displayCarrier()` mapea carrier codes a nombres públicos (UPS, FedEx, USPS via Stamps.com...).
- El proveedor ganador se conserva en `rate.provider` para routing interno en label creation.

**Storage de paymentFee:**
- `paymentFee` se calcula y muestra al usuario, pero no se almacena como columna separada en DB (el schema actual tiene `customer_price` que ya lo incluye).
- Pendiente: añadir columna `payment_fee` en migración futura cuando sea necesario para auditoría/contabilidad.

**No cambiado:**
- Flujo de label creation ShipStation real sin cambios.
- Adapters skeleton sin llamadas reales nuevas.
- Mobile no fue tocado.
- No se instalaron paquetes.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Validaciones:** lint 0 errores, 16 warnings (mismos de antes), typecheck limpio, build exitoso (24 rutas).

**Pendiente (fase posterior):**
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Mover constantes de pricing a configuración DB/admin.
- FASE 6: mobile al backend seguro.

## Estado FASE 5.10 — Persistencia financiera de pricing

Objetivo:

- Crear la base financiera correcta para reportes, auditoría y pagos reales.
- Persistir el desglose completo de pricing en columnas separadas en `shipments`.
- Actualizar la RPC atomica para guardar los nuevos campos.
- Mostrar el desglose en la guía imprimible cuando existen los nuevos campos.
- Mantener compatibilidad con instalaciones sin migración aplicada.

**Modelo de pricing (shipflow_v1):**
```
provider_cost    = costo real del carrier/provider (crudo)
platform_markup  = max(0.99, provider_cost * 6%)  — margen ShipFlow
pricing_subtotal = provider_cost + platform_markup (antes del cargo de pago)
payment_fee      = pricing_subtotal * 2.9% + $0.30 — no lo absorbe ShipFlow; se traslada al cliente
customer_price   = pricing_subtotal + payment_fee  — total cobrado al cliente
```

**Nuevas columnas en `public.shipments` (migración 20260515):**
- `payment_fee numeric(10,2) not null default 0` — cargo de procesamiento trasladado al cliente.
- `pricing_subtotal numeric(10,2)` — provider_cost + platform_markup antes del fee.
- `pricing_model text` — identificador de la fórmula usada (e.g. `shipflow_v1`).
- `pricing_breakdown jsonb not null default '{}'` — snapshot completo del cálculo en el momento de compra.

**Columnas defensivas agregadas si no existen (para instalaciones legacy sin FASE 1C):**
- `provider_cost`, `platform_markup`, `customer_price`.

**RPC actualizada — `create_label_shipment_transaction`:**
- Nuevos parámetros: `p_payment_fee`, `p_pricing_subtotal`, `p_pricing_model`, `p_pricing_breakdown` (todos con defaults para retrocompatibilidad).
- Nuevas validaciones: `payment_fee >= 0`, `customer_price >= provider_cost` si aplica.
- Balance movement incluye ahora `paymentFee` y `pricingModel` en metadata.

**Void/Refund (sin cambios):**
- `void_label_refund_transaction` usa `p_refund_amount = customer_price` (precio total incluyendo fee).
- El reembolso al saldo interno es el total completo que pagó el cliente.
- No hay riesgo de doble refund (protegido por check de idempotencia existente).

**Archivos creados:**
- `supabase/migrations/20260515_add_pricing_breakdown_to_shipments.sql` — nuevas columnas + RPC actualizada.

**Archivos modificados:**
- `supabase/schema.sql`: Nuevas columnas en `CREATE TABLE` canónico y en bloque `ADD COLUMN IF NOT EXISTS`.
- `lib/types.ts`: `Envio` += `providerCost?`, `platformMarkup?`, `paymentFee?`, `pricingSubtotal?`, `pricingModel?`, `pricingBreakdown?`.
- `lib/server/shipments/createInternalShipment.ts`:
  - `ShipmentRow` += nuevas columnas.
  - `fromShipmentRow()` mapea `payment_fee → paymentFee`, `pricing_subtotal → pricingSubtotal`, `pricing_model → pricingModel`, `pricing_breakdown → pricingBreakdown`, `provider_cost → providerCost`, `platform_markup → platformMarkup`.
  - `createInternalShipment()` persiste `payment_fee`, `pricing_subtotal`, `pricing_model`, `pricing_breakdown` en `logisticsShipmentFields`.
- `lib/server/shipments/createShipStationShipment.ts`:
  - `ShipStationLabelBody` += `platformMarkup?`, `paymentFee?`, `pricingSubtotal?`, `pricingModel?`, `pricingBreakdown?`.
  - `buildRpcParams()` calcula fallback con `calculateCustomerPrice()` si body no trae los campos; pasa `p_payment_fee`, `p_pricing_subtotal`, `p_pricing_model`, `p_pricing_breakdown` al RPC.
- `lib/services/apiClient.ts`: `CreateLabelBody` += `pricingSubtotal?`, `pricingModel?`, `pricingBreakdown?`.
- `components/CreateGuideForm.tsx`: `handleConfirmed()` pasa `pricingSubtotal`, `pricingModel`, `pricingBreakdown` al API.
- `components/PrintableGuide.tsx`: `PricingBlock` component — muestra desglose completo (Shipping cost + ShipFlow service charge + Payment processing + Total) si `paymentFee > 0 && providerCost != null`; fallback a solo "Total paid" si no hay datos de desglose.

**Flujo completo UI → API → RPC → DB:**
```
handleConfirmed() (CreateGuideForm)
→ apiCreateLabel({ ..., platformMarkup, paymentFee, pricingSubtotal, pricingModel, pricingBreakdown })
→ POST /api/labels
→ createShipStationShipment() o createInternalShipment()
→ buildRpcParams() (o logisticsShipmentFields para internal)
→ create_label_shipment_transaction RPC / Supabase insert
→ shipments: { payment_fee, pricing_subtotal, pricing_model, pricing_breakdown }
```

**Compatibilidad con migración no aplicada:**
- Para internal/mock: el fallback `isMissingSchemaColumnError` omite todos los campos `logisticsShipmentFields` y hace insert legacy. Funciona sin migración.
- Para ShipStation real: la RPC falla explícitamente si no está aplicada (503 claro). No hay fallback inseguro después de comprar un label real.
- Los nuevos parámetros de la RPC tienen defaults → la función SQL es retrocompatible si se llama desde código anterior.

**No cambiado:**
- Motor de pricing de FASE 5.9 sin cambios.
- Mobile no fue tocado.
- No se instalaron paquetes.
- No se ejecutaron migraciones.
- No se hizo commit ni deploy.

**Validaciones:** lint 0 errores, 16 warnings (pre-existentes en adapters skeleton), typecheck limpio, build exitoso (24 rutas).

**Pendiente (fase posterior):**
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Mover constantes de pricing a configuración DB/admin.
- FASE 6: mobile al backend seguro.

## Estado FASE 5.11 — Dirección inteligente, Google Places y bloqueo de cotizaciones falsas

Objetivo:

- Reemplazar campos de dirección sueltos por un componente estructurado reutilizable.
- Integrar Google Places Autocomplete opcionalmente (con fallback manual sin API key).
- Bloquear cotizaciones en línea si Supabase o los providers no están configurados.
- Exponer un endpoint público de estado de configuración para diagnóstico en UI.
- Mostrar mensajes claros de error de configuración en lugar de tarifas falsas.

**Tipo nuevo en `lib/types.ts`:**
- `StructuredAddress` — dirección postal completa con campos: `name`, `phone`, `company`, `street1`, `street2`, `city`, `state`, `postalCode`, `country`, `latitude`, `longitude`, `formattedAddress`, `placeId`, `source` ("manual" | "google_places" | "map_pin"), `validationStatus` ("complete" | "incomplete" | "needs_review").

**Variable de entorno nueva (`.env.example`):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```
- Si está vacía: formulario manual limpio sin dependencias externas.
- Si está configurada: habilita Google Places Autocomplete en `AddressInput`.
- La key debe restringirse por dominio HTTP en Google Cloud Console antes de usar en producción.
- Requiere: Maps JavaScript API + Places API habilitados en el proyecto de Google Cloud.

**Endpoint nuevo — `GET /api/config/status` (público, sin auth):**
```json
{
  "supabaseConfigured": boolean,
  "serviceRoleConfigured": boolean,
  "ratesConfigured": boolean,
  "googleMapsConfigured": boolean,
  "activeRateProviders": number
}
```
- Solo devuelve booleans. Nunca revela valores de secrets ni keys.
- Usado por `/crear-guia` para saber si debe permitir cotización real.

**Función nueva en `lib/services/apiClient.ts`:**
- `apiGetConfigStatus(): Promise<ConfigStatus>` — GET público sin token. En caso de error retorna todos `false` para no mostrar UI de cotización real.

**Componente nuevo — `components/AddressInput.tsx`:**
- Sirve tanto para Remitente como para Destinatario.
- Props: `sectionLabel`, `value: StructuredAddress`, `onChange`, `requirePostal?`, `errors?`.
- Campos: Nombre, Teléfono, [Buscar dirección si Google Maps key], Calle, Apt/Suite, Ciudad, Estado, ZIP, País.
- Con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`:
  - Carga script de Google Maps JS una sola vez (idempotente: `window.__gMapsLoaded`).
  - Inicializa `google.maps.places.Autocomplete` en el campo de búsqueda.
  - Al seleccionar: parsea `address_components` y llena campos automáticamente.
  - Si faltan campos tras autocompletar: `validationStatus = "needs_review"`, muestra aviso.
  - Si todos los campos están presentes: `validationStatus = "complete"`, badge verde.
- Sin `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: formulario manual limpio, mismos campos, sin búsqueda.
- No instala paquetes. Los tipos de Google Maps se declaran inline con `declare global`.

**`components/CreateGuideForm.tsx` — refactorizado:**
- `FormState` usa `origin: StructuredAddress` y `destination: StructuredAddress` en lugar de campos sueltos.
- Integra `AddressInput` en ambos modos (standard y online).
- Fetch de `apiGetConfigStatus()` en mount. Resultados en estado `configStatus`.
- Banners de error si Supabase no está configurado o no hay providers activos (solo en modo online).
- Botón "Buscar tarifas" deshabilitado si `showConfigWarning` (Supabase ausente).
- Hint "Tarifa estimada según dirección y paquete ingresados." visible debajo del listado de tarifas.
- Aviso inline si faltan ZIP de origen o destino al intentar generar guía.
- En `handleFetchRates()`: si Supabase o rates no configurados → error inmediato sin llamar API.
- Si el error de la API menciona "supabase" o "not configured" → mensaje claro de configuración.
- Validaciones de dirección separadas: `validateAddress(addr, prefix, strict)`.
  - `strict = true` (para generar label): requiere `postalCode` y `state`.
  - `strict = false` (para buscar rates): solo requiere `city`.

**Mapa/pin:**
- No implementado en FASE 5.11. Prioridad fue autocomplete + validación estructurada.
- `AddressMapPicker` documentado como pendiente para fase posterior.

**Compatibilidad:**
- Sin Google Maps key: formulario funciona igual que antes (manual).
- Sin Supabase: modo standard sigue funcionando (cotización local con couriers). Solo modo online queda bloqueado.

**Archivos creados:**
- `components/AddressInput.tsx`
- `app/api/config/status/route.ts`

**Archivos modificados:**
- `lib/types.ts`: + `StructuredAddress`, `AddressSource`, `AddressValidationStatus`.
- `lib/services/apiClient.ts`: + `ConfigStatus` type y `apiGetConfigStatus()`.
- `components/CreateGuideForm.tsx`: refactorizado completo.
- `.env.example`: + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

**Validaciones:** lint 0 errores, typecheck limpio, build exitoso (25 rutas).

**Pendiente (fase posterior):**
- `AddressMapPicker` con selección de pin en mapa y reverse geocoding.
- Activar segundo provider real de rates.
- Mover constantes de pricing a configuración DB/admin.
- FASE 6: mobile al backend seguro.

## Estado FASE 5.12 — EasyPost rates reales

**Objetivo:** Activar EasyPost como segundo provider real de rates (cotizaciones solamente).

**Archivos modificados:**
- `lib/logistics/adapters/EasyPostAdapter.ts`: `getRates()` implementado con llamada real a `POST https://api.easypost.com/v2/shipments`. `createLabel()` y `voidLabel()` siguen lanzando `ProviderUnavailableError`.
- `lib/logistics/providerCapabilities.ts`: `supportsLabels: false`, `supportsVoid: false` para EasyPost.

**EasyPost API:**
- Base URL: `https://api.easypost.com/v2`
- Autenticación: Basic Auth con `EASYPOST_API_KEY` como username, password vacío: `base64("key:")`.
- Endpoint: `POST /shipments` → crea un Shipment (sin comprar label) y devuelve `rates[]`.
- Peso: requiere onzas. Conversión interna: lb×16, oz×1, kg×35.274.
- Dimensiones: pulgadas. Conversión interna: cm/2.54.
- Dirección: usa campo `zip` (no `postalCode`).

**Campos requeridos para rates EasyPost:**
- `origin.postalCode` y `destination.postalCode` (mapeados a `zip`).
- `parcel.weight > 0`.

**Normalización de rates:**
- `provider: "easypost"`, `providerRateId: rate.id`.
- `courierId/courierName = rate.carrier` (USPS, UPS, FedEx, etc. — devuelto por EasyPost).
- `serviceCode/serviceName = rate.service`.
- `providerCost = parseFloat(rate.rate)`.
- `estimatedTime = "${delivery_days} day(s)"` si disponible.
- Pasan por el pipeline completo: `repriceRate → deduplicateRates → rankRates`.

**Flujo multi-provider con EasyPost activo:**
```
POST /api/rates { mode: "best_available" }
→ RateAggregator consulta ShipStation + EasyPost en paralelo (Promise.allSettled)
→ Si EasyPost falla, ShipStation sigue respondiendo y viceversa
→ repriceRate() aplica markup + payment_fee a cada rate
→ deduplicateRates() elige el proveedor más barato por carrier/servicio/días
→ rankRates() asigna tags cheapest/fastest/recommended
→ UI muestra carrier real (USPS, UPS, FedEx, DHL), precio total, entrega estimada
→ Provider nunca visible en UI
```

**Bloqueo de labels EasyPost:**
- `CreateGuideForm.handleConfirmed()` verifica `selectedApiRate.provider === "easypost"` y muestra:
  "Esta opción todavía no está disponible para generar guía. Selecciona otra tarifa."
- `/api/labels` devuelve 501 si `provider: "easypost"` en el body.
- No se compra nada.

**Variable requerida:**
```text
EASYPOST_API_KEY=   # server-side only; nunca NEXT_PUBLIC
```

**Validaciones:** lint 0 errores, typecheck limpio, build exitoso.

**Pendiente (fase posterior):**
- `EasyPostAdapter.createLabel()` — labels reales con EasyPost.
- `EasyPostAdapter.voidLabel()`.
- Activar Shippo como tercer provider o labels multi-provider.

---

## Estado FASE 5.13 — Auth UX: verificación de correo

**Problema resuelto:** Usuarios no verificados podían llegar a `/crear-guia` y recibir errores de API confusos.

**Solución implementada:**

**Detección de email no verificado:**
- `Usuario.emailVerified?: boolean` — campo nuevo en `lib/types.ts`.
- `authService.ts` → `loginUser()`, `createUser()`, `getCurrentUser()` leen `user.email_confirmed_at` de Supabase y propagan `emailVerified`.
- `AuthContext` expone `emailVerified: boolean` (falso si no está autenticado o no verificado).
- `lib/services/authStatus.ts` — helper cliente para re-consultar estado (`getEmailVerificationStatus()`) y reenviar email (`resendVerificationEmail(email)`).

**Flujo de login / registro:**
- Registro → siempre redirige a `/verifica-tu-correo` (email_confirmed_at es null en registro nuevo).
- Login + email no verificado → redirige a `/verifica-tu-correo`.
- Login + email verificado → continúa a `?next` o `/dashboard` como antes.

**Página `/verifica-tu-correo`:**
- Muestra correo del usuario (obtenido de `supabase.auth.getUser()`).
- Botón "Ya verifiqué mi correo" → re-consulta estado → si verificado, redirige a `/crear-guia`; si no, muestra mensaje amigable.
- Botón "Reenviar correo" → llama a `supabase.auth.resend({ type: "signup", email })`.
- Rate limit del reenvío maneja error de Supabase con mensaje amigable.
- Si no hay sesión, redirige a `/login`. Si ya está verificado, redirige a `/dashboard`.

**Bloqueo en `CreateGuideForm`:**
- Si `!authLoading && !emailVerified`, muestra card "Verifica tu correo primero" con botón a `/verifica-tu-correo`.
- Si la API devuelve `EMAIL_NOT_VERIFIED` (desincronización de estado), redirige a `/verifica-tu-correo`.

**Bloqueo en backend (todos los endpoints protegidos):**
```
requireVerifiedUser(request)  // en lib/server/supabaseServer.ts
→ requireSupabaseUser()       // valida sesión como antes
→ if (!user.email_confirmed_at) throw new Response("EMAIL_NOT_VERIFIED", { status: 403 })
```
Endpoints protegidos: `/api/rates`, `/api/labels`, `/api/labels/[id]/void`, `/api/balance`, `/api/shipments`, `/api/shipments/[id]`.

**Error code en cliente:**
- `apiClient.ts` exporta `isEmailNotVerifiedError(error)`.
- El `apiFetch` lanza `new Error("EMAIL_NOT_VERIFIED")` cuando el servidor responde 403 con ese código.

**Cómo configurar en Supabase Auth:**
- En el dashboard de Supabase > Authentication > Email Templates: verifica que esté habilitado "Confirm email" en las settings.
- Si `"Email confirmations"` está desactivado en Settings > Auth, todos los usuarios quedan verificados inmediatamente (ok para desarrollo).
- En producción se recomienda activar la confirmación de email.

**Validaciones:** lint 0 errores, typecheck limpio, build exitoso.

**Pendiente (fase posterior):**
- Labels multi-provider (selección automática del proveedor ganador de deduplicación).
- Activar Shippo rates reales.

## Estado FASE 5.14 — Cotizador premium con mapa/pin y mejor UX de dirección

**Archivos nuevos:**
- `shipflow-web/lib/googleMapsUtils.ts`: `loadGoogleMapsScript()` y `parseAddressComponents()` — utilidades compartidas entre `AddressInput` y `AddressMapPicker`. Usan `(window as any)` internamente para acceso a globals de Google Maps sin dependencias npm.
- `shipflow-web/components/AddressMapPicker.tsx`: componente "use client" con mapa interactivo. Carga Google Maps JS, muestra pin arrastrable, hace reverse geocoding al mover el pin o hacer clic en el mapa. Devuelve `StructuredAddress` parcial. Fallback visible si no carga.

**Archivos modificados:**
- `shipflow-web/components/AddressInput.tsx`:
  - Importa `loadGoogleMapsScript` y `parseAddressComponents` desde `lib/googleMapsUtils.ts` (ya no duplica la lógica).
  - Con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: muestra dos pestañas — **"Buscar dirección"** (Places Autocomplete) y **"Seleccionar en mapa"** (AddressMapPicker).
  - Sin key: solo formulario manual, sin cambios en funcionalidad.
  - Al seleccionar en mapa: llena street1, city, state, postalCode, country; conserva name/phone/company/street2 del usuario.
  - Badge de validación en pestaña "Buscar dirección" cuando `validationStatus === "needs_review"`.

- `shipflow-web/components/CreateGuideForm.tsx`:
  - `validateOnlineRates()`: ahora requiere `state` además de `city` para origen y destino.
  - `validateOnlineLabel()`: ahora requiere `street1` para el remitente también.
  - ConfigAlert de "sin integraciones": ya no menciona nombres internos de providers.
  - Aviso suave de ZIP antes del botón "Buscar tarifas" (no bloquea, solo informa).
  - Aviso de dirección incompleta antes del botón "Generar guía" (paso 2) ahora chequea también `street1`.
  - Nuevo componente `AddressSummary`: muestra ciudad/estado/ZIP + badge "Completa ✓" (verde), "Revisar" (ámbar) o "Incompleta" (gris) después de cada `AddressInput` en ambos modos.

**Flujo con mapa:**
1. Usuario abre "Seleccionar en mapa" → ve mapa centrado en coords previas o New York.
2. Hace clic en el mapa o arrastra el pin → se llama `Geocoder.geocode({ location })`.
3. Si el geocoder devuelve `OK`: parsea `address_components` → llena street1, city, state, postalCode, country, lat, lng, formattedAddress, placeId.
4. Si faltan campos postales: `validationStatus = "needs_review"` → badge "Revisar".
5. Si todos los campos están presentes: `validationStatus = "complete"` → badge "Completa ✓".
6. El usuario puede cambiar a la pestaña manual y editar cualquier campo individualmente.

**Sin Google Maps key:**
- Solo formulario manual.
- No se muestra nada del mapa ni de las pestañas.
- Funcionalidad idéntica a antes de FASE 5.14.

**Validaciones:**
- Antes de rates: city + state + country requeridos. ZIP opcional pero con advertencia.
- Antes de label: street1 + city + state + postalCode + country en remitente y destinatario. Bloqueo con mensaje claro.

**Mensajes de usuario usados:**
- "Selecciona en el mapa o escribe la dirección..."
- "Revisa los datos postales antes de continuar."
- "El mapa ayuda a ubicar, pero la guía necesita dirección postal completa."
- "Completa la dirección postal antes de generar la guía: calle, ciudad, estado, ZIP y país son obligatorios."
- "El ZIP / Código postal mejora la precisión de la cotización. Puedes continuar sin él..."

**No se usaron en mensajes de usuario:**
- ShipStation, EasyPost, Shippo, Easyship, internal, provider, demo.

**Validaciones:** lint, typecheck, build exitosos.

## Estado FASE 5.15 — Shippo rates reales (cotizaciones solamente)

**Objetivo:** Activar Shippo como tercer provider real de rates, solo cotizaciones. Labels siguen bloqueadas.

**Archivos modificados:**
- `lib/logistics/adapters/ShippoAdapter.ts`: `getRates()` implementado con llamada real a `POST https://api.goshippo.com/shipments/` con `async: false`. `createLabel()` y `voidLabel()` siguen lanzando `ProviderUnavailableError`.
- `lib/logistics/providerCapabilities.ts`: `supportsLabels: false`, `supportsVoid: false` para Shippo (corregidos; estaban como `true` por error en skeleton).
- `.env.example`: comentario de `SHIPPO_API_KEY` actualizado para indicar que rates están activos.

**Shippo API:**
- Base URL: `https://api.goshippo.com`
- Autenticación: `Authorization: ShippoToken <SHIPPO_API_KEY>` (diferente de Basic Auth; nunca exponer con NEXT_PUBLIC).
- Endpoint: `POST /shipments/` con `async: false` → crea un Shipment (sin comprar label) y devuelve `rates[]` inmediatamente.
- Peso: directo (`mass_unit`: "lb", "oz", "kg").
- Dimensiones: directo (`distance_unit`: "in", "cm").
- Dirección: usa `zip` (no `postalCode`).

**Campos requeridos para rates Shippo:**
- `origin.postalCode` y `destination.postalCode` (mapeados a `zip`).
- `parcel.weight > 0`.
- `street1` opcional (pasa como string vacío si no está disponible).

**Normalización de rates:**
- `provider: "shippo"`, `providerRateId: rate.object_id`.
- `courierId/courierName = rate.provider` (USPS, UPS, FedEx, DHL — devuelto por Shippo).
- `serviceCode = rate.servicelevel.token` (e.g. "usps_priority", "ups_ground").
- `serviceName = rate.servicelevel.name` (e.g. "Priority Mail", "UPS Ground").
- `providerCost = parseFloat(rate.amount)`.
- `estimatedTime = "${estimated_days} day(s)"` si disponible.
- Pasan por el pipeline completo: `repriceRate → deduplicateRates → rankRates`.

**Flujo multi-provider con Shippo activo:**
```
POST /api/rates { mode: "best_available" }
→ RateAggregator consulta ShipStation + EasyPost + Shippo en paralelo (Promise.allSettled)
→ Si Shippo falla, los demás siguen respondiendo
→ repriceRate() aplica markup + payment_fee a cada rate
→ deduplicateRates() elige el proveedor más barato por carrier/servicio/días
→ rankRates() asigna tags cheapest/fastest/recommended
→ UI muestra carrier real (USPS, UPS, FedEx, DHL), precio total, entrega estimada
→ Provider nunca visible en UI
```

**Bloqueo de labels Shippo:**
- `CreateGuideForm.handleConfirmed()` verifica `selectedApiRate.provider === "shippo"` y muestra:
  "Esta opción todavía no está disponible para generar guía. Selecciona otra tarifa."
- `/api/labels` devuelve 501 si `provider: "shippo"` en el body.
- No se compra nada.

**Variable requerida:**
```text
SHIPPO_API_KEY=   # server-side only; nunca NEXT_PUBLIC
```

**Validaciones:** lint, typecheck, build exitosos.

**Pendiente (fase posterior):**
- `ShippoAdapter.createLabel()` y `voidLabel()` — labels reales con Shippo.
- Labels multi-provider (selección automática del proveedor ganador de deduplicación).
- `EasyPostAdapter.createLabel()` — labels reales con EasyPost.

## Estado FASE 5.16 — Cotizador con flujo único y dirección fácil

**Objetivo:** dejar `/crear-guia` como cotizador único de tarifas reales, sin precios locales visibles.

**Cambios principales:**
- `CreateGuideForm.tsx`: se eliminó el selector de tipo de cotización y el comparador local de `couriers`.
- Antes de ver tarifas solo queda un botón principal: **"Cotizar envío"**.
- El formulario siempre llama `/api/rates` con `mode: "best_available"`.
- Las tarifas visibles se filtran para no mostrar resultados `internal`/`mock`.
- Paquete completo requerido: peso, largo, ancho y alto con defaults `1`; unidades `lb` e `in`.
- Validación previa bloquea la llamada si faltan calle, ciudad, estado, ZIP o dimensiones.

**Dirección:**
- `AddressInput.tsx`: input principal para buscar o pegar dirección completa.
- Sin Google Maps key: parser local intenta separar calle, ciudad, estado y ZIP en formatos comunes de USA.
- Con Google Maps key: Places Autocomplete restringido a Estados Unidos y botón visible **"Seleccionar en mapa"**.
- Los campos manuales quedan colapsados por defecto bajo **"Editar datos manualmente"**.
- País fijo: Estados Unidos.
- Estado: select de códigos USA.

**Errores:**
- Si no hay integraciones activas: mensaje de configuración claro.
- Si falta dirección: mensaje específico de calle, ciudad, estado y ZIP.
- Si falta paquete: mensaje específico de peso y dimensiones.
- Si las integraciones no devuelven tarifas: mensaje orientado a revisar dirección, ZIP y dimensiones.

**No cambiado:**
- Mobile no fue tocado.
- Pricing engine FASE 5.9 no cambió.
- RateAggregator, EasyPost, Shippo y ShipStation se mantienen.
- No se ejecutaron migraciones, deploy ni commits.

## Estado FASE 5.17 — Revisión final web y cierre FASE 5

**Objetivo:** revisar la integración web completa antes de pasar a mobile/deploy.

**Resultado:**
- `/crear-guia` queda con un solo flujo de cotización real y sin cotización local visible.
- No hay botón de generar guía antes de seleccionar una tarifa.
- `AddressInput` conserva datos de contacto al seleccionar Places y mantiene fallback sin Google Maps.
- Copy visible pendiente en navegación, envíos y guía imprimible fue normalizado a español.
- `/api/rates` sigue protegido con `requireVerifiedUser`, valida US-only, dirección completa y dimensiones positivas.
- `/api/config/status` solo expone booleans/counts, no nombres de integraciones ni secretos.
- `/api/labels` mantiene guard para tarifas sin compra de labels implementada y evita fallback silencioso.
- `createShipStationShipment` valida que `expectedCost` no sea menor que `pricingBreakdown.providerCost`.

**Pendiente posterior a FASE 5:**
- Labels multi-provider.
- Pagos reales.
- Storage permanente de PDFs de labels.
- Mobile conectado al backend seguro.
- Deploy final.

## Estado FASE 5.18 — Corrección de adapters reales de rates

**Objetivo:** alinear los adapters con pruebas directas confirmadas por API para que `/api/rates` devuelva tarifas reales desde proveedores configurados.

**Cambios principales:**
- `ShipStationAdapter` ahora soporta `SHIPSTATION_API_MODE=shipengine`.
  - Usa `GET /carriers` y `POST /rates` en `https://api.shipengine.com/v1`.
  - Autentica con header `API-Key`.
  - En modo ShipEngine no exige `SHIPSTATION_API_SECRET`.
  - Los rates ShipEngine quedan marcados `supportsLabels: false` porque la compra de labels ShipEngine no está implementada todavía.
- `ShippoAdapter` conserva `POST /shipments/` con `async: false` y HTTP 201 como éxito.
- `EasyshipAdapter` dejó de ser skeleton para rates:
  - Usa `POST {EASYSHIP_BASE_URL}/2024-09/rates`.
  - Autentica con Bearer token.
  - Incluye item con `hs_code: "610910"` y no manda `courier_selection`.
- `providerCapabilities` cuenta como activos:
  - ShipEngine/ShipStation si `SHIPSTATION_API_MODE=shipengine` y existe `SHIPSTATION_API_KEY`.
  - Shippo si existe `SHIPPO_API_KEY`.
  - Easyship si existen `EASYSHIP_API_KEY` y `EASYSHIP_BASE_URL`.
  - EasyPost solo si existe `EASYPOST_API_KEY`.
- `/api/rates` devuelve error claro si no hay integraciones activas o si todos los providers fallan/no devuelven rates.
- La UI bloquea generación de guía si el rate trae `supportsLabels: false`.

**No cambiado:**
- No se implementó compra de labels ShipEngine, Shippo, Easyship ni EasyPost.
- No se tocaron mobile, deploy, migraciones ni pricing engine.
- No se muestran providers internos al usuario; la UI sigue mostrando carrier/servicio/precio.
