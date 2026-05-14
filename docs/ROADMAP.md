# Roadmap ShipFlow

## FASE 0 - Documentacion base

Objetivo:

- Crear contexto tecnico estable.
- Documentar arquitectura actual.
- Documentar riesgos.
- Documentar plan de integracion logistica.
- Ahorrar tokens en futuros chats.

Estado:

- En progreso/completada con los documentos base.

## FASE 1 - Seguridad, RLS, base y dinero

Objetivo:

- Corregir riesgos criticos antes de conectar proveedores reales.

Tareas:

- Bloquear escalacion de `role`.
- Corregir policies de `profiles`.
- Impedir recargas arbitrarias en `balance_movements`.
- Definir ledger financiero seguro.
- Preparar campos de provider, status e idempotencia.
- Revisar RLS de `shipments`, `tracking_events` y `couriers`.
- Definir reglas para admin.

Estado:

- FASE 1A: preparada en SQL.
- FASE 1B: endpoint web para crear guia interna.
- FASE 1C: migracion incremental para base logistica, idempotencia, webhooks y auditoria.
- FASE 1D: migracion revisada y checklist de aplicacion manual preparado.
- Pendiente: aplicar migracion en Supabase con backup, probar RLS y crear RPC transaccional.

## FASE 2 - Backend API real

Objetivo:

- Mover operaciones sensibles a backend.

Endpoints esperados:

- `GET /api/shipments`
- `GET /api/shipments/[id]`
- `POST /api/rates`
- `POST /api/labels`
- `POST /api/labels/[id]/void`
- `GET /api/balance`
- Endpoints seguros de pagos/recargas si aplica.

Reglas:

- Validar sesion.
- Validar permisos.
- Calcular precios server-side.
- Usar transacciones.
- Usar idempotencia.

Estado:

- Endpoints internos de shipments, rates, labels, void interno y balance preparados con logica local/mock.
- `POST /api/tracking` endurecido con carrier allowlist y auth opcional compatible.
- Pendiente: RPC transaccional, pagos/recargas reales y migracion mobile.

## FASE 3 - Logistics adapters

Objetivo:

- Crear capa de adapters para proveedores logisticos.

Propuesta:

```text
shipflow-web/lib/logistics
├── adapters
├── registry.ts
├── pricing.ts
├── types.ts
└── errors.ts
```

Estado:

- UI desacoplada de proveedores.
- `MockAdapter`/internal creado y conectado a rates/labels internas.
- `ShipStationAdapter` creado solo como skeleton sin llamadas reales.
- `registry.ts`, `pricing.ts`, `types.ts` y `errors.ts` creados.
- ShipStation real queda para FASE 4.
- Otros proveedores posibles despues.

## FASE 4 - ShipStation real

Objetivo:

- Integrar ShipStation para rates y labels reales.

### FASE 4A - Rates reales (completada)

Tareas completadas:

- `ShipStationAdapter.getRates()` implementado con llamada real a ShipStation V1 API.
- Autenticacion Basic Auth server-side desde `SHIPSTATION_API_KEY` y `SHIPSTATION_API_SECRET`.
- Normalizacion de respuesta a `RateResult[]` con pricing breakdown.
- Manejo de errores: auth, rate limit, payload invalido, timeout, sin rates.
- `/api/rates` acepta `provider: "shipstation"` en el body para usar rates reales.
- Default sigue siendo internal/mock.
- `createLabel`, `voidLabel`, `trackShipment` devuelven `NOT_IMPLEMENTED` (501).
- Nuevas clases de error: `ProviderAuthError`, `ProviderRateLimitError`, `InvalidPayloadError`.

ADVERTENCIA: No usar en produccion con cobros hasta completar FASE 4B (labels reales, balance transaccional).

### FASE 4B - Labels reales (completada)

Tareas completadas:

- `ShipStationAdapter.createLabel()` implementado usando ShipStation V1 API.
  - Flujo: `POST /orders/createorder` (idempotente via orderKey) → `POST /orders/createlabelfororder`.
  - Mismo base URL y auth que FASE 4A (V1 legacy: ssapi.shipstation.com, Basic Auth).
  - Normaliza respuesta a `LabelResult` con `providerShipmentId`, `providerLabelId`, `providerServiceCode`.
  - `labelUrl = null`: ShipStation V1 no devuelve URL directa, solo `labelData` en base64.
- `LabelResult` y `CreateLabelInput` ampliados con campos de provider.
- `ShipmentRow` ampliado con todos los campos de provider de FASE 1C.
- Nuevo `createShipStationShipment.ts` con validacion, idempotencia, balance check, persistencia secuencial y manejo de errores criticos.
- `/api/labels` acepta `provider: "shipstation"` y ejecuta el flujo real.
- Nuevo migration SQL `20260514_create_label_transaction_rpc.sql` con RPC atomica preparada (no ejecutada).

Deuda tecnica:

- Inserts secuenciales (no atomicos); activar la RPC para atomicidad real.
- `labelUrl` siempre null para ShipStation V1.
- NO usar con cobros reales hasta activar la RPC y verificar con pruebas manuales.

ADVERTENCIA: Esta fase puede comprar labels reales en ShipStation si `SHIPSTATION_API_KEY` esta configurada. Probar solo con cuentas de prueba hasta completar la RPC atomica.

### FASE 4C - Void/cancel real

Renombrada a FASE 4D.

### FASE 4D - Transaccion atomica, labelData y void/refund real (completada)

Tareas completadas:

- `createShipStationShipment.ts` reescrito para usar la RPC `create_label_shipment_transaction` via `service_role`. No vuelve a inserts secuenciales para provider shipstation.
- `SUPABASE_SERVICE_ROLE_KEY` ahora requerida en backend; se verifica ANTES de comprar el label.
- `createServiceSupabaseClient()` e `isServiceRoleConfigured` agregados a `supabaseServer.ts`.
- `isRpcNotFoundError()` agregado a `apiResponse.ts`.
- `ShipStationAdapter.voidLabel()` implementado: `POST /shipments/{shipmentId}/voidlabel` en ShipStation V1. Maneja 401/403/404/429/5xx.
- `VoidLabelInput` ampliado con `providerShipmentId?` para void sin ambiguedad.
- `LabelResult` ampliado con `labelData?` (base64 PDF de V1; no almacenado en DB).
- `ShipStationShipmentResult` ampliado con `labelData`.
- Migration `20260514_create_label_transaction_rpc.sql` mejorada: agrega `p_label_format`, validacion `p_customer_price > 0`, y nueva funcion `void_label_refund_transaction`.
- `/api/labels/[id]/void` actualizado: maneja provider shipstation via void SS + RPC refund atomico.
- `.env.example` actualizado con `SHIPFLOW_LABELS_BUCKET` y `SHIPFLOW_LABELS_PUBLIC_BASE_URL`.

Pendiente antes de produccion:

- Aplicar migration SQL manualmente en Supabase.
- Configurar `SUPABASE_SERVICE_ROLE_KEY` en servidor.
- Probar flujo completo con cuenta ShipStation de prueba.
- Supabase Storage para label PDFs permanentes (futuro).

### FASE 4E — Validacion real controlada (completada)

Objetivo:

- Preparar proceso seguro de aplicacion de migraciones y prueba real controlada con ShipStation.

Tareas completadas:

- Revision de migraciones (orden, dependencias, seguridad, permisos RPC).
- Identificado requisito: `balance_movements.id` debe ser tipo `text` para la RPC.
- Nuevo checklist: `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`.
  - Pre-checks: backup, entorno, variables, tipo de columna, cuenta de prueba ShipStation.
  - Orden de aplicacion: FASE 1C primero, luego FASE 4D RPC.
  - Verificaciones SQL post-migracion: columnas, funciones, permisos, RLS, policies.
  - Pruebas API paso a paso: balance, rates, saldo insuficiente, label real, idempotencia, void, idempotencia de void.
  - Curls de ejemplo con placeholders (sin secretos reales).
  - Tabla de errores esperados.
  - Checklist de aprobacion antes de produccion.

No se ejecutaron migraciones. No se modifico codigo.

ADVERTENCIA: No usar en produccion hasta completar el checklist de FASE 4E.

## FASE 5 - Tracking/webhooks reales

Objetivo:

- Sincronizar estados reales.

Tareas:

- Crear `/api/webhooks/shipstation`.
- Validar firma/secreto.
- Guardar `webhook_events`.
- Actualizar tracking events.
- Actualizar label/shipment status.
- Mantener idempotencia.

## FASE 6 - Mobile backend seguro

Objetivo:

- Evitar que mobile haga operaciones sensibles directo contra Supabase.

Tareas:

- Agregar `EXPO_PUBLIC_API_BASE_URL`.
- Cambiar create label para usar backend.
- Cambiar rates para usar backend.
- Cambiar void/cancel si aplica.
- Mantener Supabase Auth o intercambiar token con backend.

## FASE 7 - Docker + servidor + Nginx + SSL

Objetivo:

- Preparar despliegue en VM por SSH.

Tareas:

- Dockerfile.
- docker-compose.
- Nginx reverse proxy.
- SSL.
- Variables de entorno.
- Healthcheck.
- Logs.
- Runbook de deploy.

## Prioridad recomendada

No conectar ShipStation antes de completar FASE 1 y FASE 2. El orden correcto reduce riesgo de dinero falso, labels duplicadas, secrets expuestos y estados inconsistentes.
