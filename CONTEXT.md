# Contexto ShipFlow

Este archivo es el punto de partida para futuros chats con Codex. Resume el estado tecnico actual de ShipFlow y las reglas para avanzar sin perder contexto.

## Resumen del proyecto

ShipFlow es una plataforma de envios enfocada principalmente en Estados Unidos. El objetivo del producto es permitir que usuarios coticen envios, creen guias/labels, hagan tracking, manejen balance y que la plataforma agregue un margen pequeno por guia, por ejemplo USD 0.25 o USD 0.50.

La integracion logistica prioritaria futura es ShipStation. Despues se espera poder conectar otros proveedores como Shippo, EasyPost, ShipEngine o integraciones directas con USPS, UPS, FedEx y DHL.

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

Demo/simulado:

- Crear guia NO compra una label real.
- Las guias usan tracking interno tipo `SF-...`.
- Las tarifas se calculan localmente desde `couriers`, no desde un proveedor real.
- La label web es imprimible/visual, no una label oficial del carrier.
- El PDF mobile es generado localmente, no emitido por ShipStation ni por un carrier.
- El balance no esta conectado a pagos reales.
- No existe ShipStation todavia.
- Existe una primera capa `lib/logistics` con Adapter Pattern internal/mock; ShipStation solo esta preparado como skeleton sin llamadas reales.
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
- Default de `/api/rates` sigue siendo internal/mock usando couriers de Supabase.

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
