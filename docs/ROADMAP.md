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

Resultado esperado:

- UI desacoplada de proveedores.
- ShipStation como primer adapter.
- Otros proveedores posibles despues.

## FASE 4 - ShipStation real

Objetivo:

- Integrar ShipStation para rates y labels reales.

Tareas:

- Configurar secretos server-side.
- Implementar adapter ShipStation.
- Obtener rates.
- Crear labels.
- Guardar provider IDs.
- Guardar label URL.
- Calcular markup.
- Descontar balance de forma segura.

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
