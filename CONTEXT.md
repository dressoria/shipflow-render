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
- No existe adapter pattern formal.
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

- No conectar ShipStation todavia.
- No ejecutar migraciones automaticamente.
- No cambiar componentes ni servicios durante esta fase.
- No instalar paquetes.
- No crear Dockerfile todavia.
- No mover operaciones reales de dinero sin corregir RLS y backend.
- No poner API keys reales en el repositorio.

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
- El backend recalcula la tarifa local/mock usando `calculateShippingRate`.
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
