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

### FASE 4B - Labels reales (pendiente)

Tareas pendientes:

- Implementar `ShipStationAdapter.createLabel()` real.
- Guardar `provider_label_id` y `label_url` en `shipments`.
- Descontar balance de forma transaccional (RPC SQL atomica).
- Idempotencia persistida.
- Validar saldo antes de comprar.

### FASE 4C - Void/cancel real (pendiente)

Tareas pendientes:

- Implementar `ShipStationAdapter.voidLabel()` real.
- Refund a balance si aplica.
- Actualizar `label_status` en DB.

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
