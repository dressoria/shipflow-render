# Base de datos

## Estado actual

La base actual esta definida principalmente en:

- `shipflow-web/supabase/schema.sql`
- `shipflow-web/supabase/tracking_events_update.sql`
- `shipflow-web/supabase/seed.sql`

Motor:

- Supabase/PostgreSQL.

Auth:

- Supabase Auth.

## Tablas actuales

### profiles

Campos principales:

- `id`
- `email`
- `business_name`
- `role`
- `created_at`
- `updated_at`

Relacion:

- `id` referencia `auth.users(id)`.

Riesgo actual:

- FASE 1A preparada en SQL: trigger `protect_profile_admin_fields` impide que usuarios normales cambien `role`, `id`, `created_at` y email.
- FASE 1A preparada en SQL: `profiles_insert_own` solo permite crear perfiles propios con `role = user`.
- Pendiente: aplicar migracion controlada en Supabase.

### shipments

Campos principales:

- `id`
- `user_id`
- `tracking_number`
- `sender_name`
- `sender_phone`
- `origin_city`
- `recipient_name`
- `recipient_phone`
- `destination_city`
- `destination_address`
- `weight`
- `product_type`
- `courier`
- `shipping_subtotal`
- `cash_on_delivery_commission`
- `total`
- `cash_on_delivery`
- `cash_amount`
- `status`
- `value`
- `provider`
- `provider_shipment_id`
- `provider_label_id`
- `provider_rate_id`
- `provider_service_code`
- `label_url`
- `label_format`
- `payment_status`
- `label_status`
- `provider_cost`
- `platform_markup`
- `customer_price`
- `currency`
- `idempotency_key`
- `metadata`
- `created_at`
- `updated_at`

Relacion:

- `user_id` referencia `auth.users(id)`.

Riesgos actuales:

- FASE 1C preparada en SQL: provider IDs, label URL, estados, pricing, metadata e idempotencia ya estan en `schema.sql` y en la migracion incremental.
- Pendiente: aplicar migracion controlada en Supabase.
- FASE 1B web: crear guia interna con Supabase activo ahora usa `POST /api/shipments/create`.
- Pendiente: mobile todavia inserta directo contra Supabase.

### balance_movements

Campos principales:

- `id`
- `user_id`
- `concept`
- `amount`
- `type`
- `reference_type`
- `reference_id`
- `shipment_id`
- `idempotency_key`
- `metadata`
- `created_by`
- `created_at`

Relacion:

- `user_id` referencia `auth.users(id)`.

Riesgos actuales:

- Balance es suma de movimientos.
- FASE 1A preparada en SQL: usuarios ya no pueden insertar movimientos positivos directos; solo movimientos negativos propios quedan permitidos temporalmente.
- FASE 1B web: el endpoint valida saldo suficiente antes de insertar el movimiento negativo de guia.
- FASE 1C preparada en SQL: agrega tipo, referencias, `shipment_id`, idempotencia y metadata.
- No hay reversos formales.
- No hay auditoria suficiente.

Modelo operativo FASE 5.23:

- `recharge`: amount positivo. Representa saldo agregado al balance. En produccion futura debe venir solo de webhook de pago confirmado; en sandbox puede existir como `Test balance top-up` manual.
- `debit`: amount negativo. Representa compra de carrier label y debe tener `shipment_id`/referencia cuando aplique.
- `refund`: amount positivo. Representa devolucion por void confirmado por el provider y debe evitar duplicados por `shipment_id`/idempotencia.
- `adjustment`: ajuste manual/admin, positivo o negativo. Debe requerir operador autorizado y metadata/auditoria en una fase admin.
- `fee`: cargo separado si se decide modelarlo fuera del precio final. Actualmente el pricing de label incluye fees dentro de `customer_price`, asi que no se usa para compra normal.

`GET /api/balance` es solo lectura y devuelve:

- `availableBalance`
- `currency`
- `movements`
- `totals.totalRecharged`
- `totals.totalSpent`
- `totals.totalRefunded`
- `totals.totalAdjustments`
- `totals.totalFees`

No existe endpoint publico para crear recargas. Cualquier recarga real futura debe nacer de webhook de proveedor de pago, no de confirmacion del cliente.

### Admin support reads

FASE 5.24 agrega lecturas admin read-only sobre datos existentes, sin migracion:

- `profiles`: fuente primaria para `role = admin`, email y nombre de usuario.
- `shipments`: soporte puede ver tracking, owner, carrier/service, label/payment status, total y `label_url` si existe.
- `balance_movements`: soporte puede revisar debits, refunds, recharges manuales de prueba y referencias a shipment.

No se agregaron tablas nuevas. La reconciliation queue, manual adjustments y audit operacional persistente quedan para fases futuras.

### Manual adjustments

FASE 5.25 usa la tabla existente `balance_movements` para ajustes manuales admin:

- `type = adjustment`
- `concept = Manual adjustment`
- `amount`: positivo o negativo, nunca cero.
- `reference_type = admin_manual_adjustment`
- `reference_id = idempotency_key`
- `idempotency_key = admin-adjustment:<key>`
- `created_by = auth.users.id` del admin.
- `metadata`: `adminUserId`, `adminEmail`, `reason`, `note`, `createdFrom`, `timestamp`, `balanceBefore`, `balanceAfter`.

No requiere migracion porque `type`, `reference_type`, `reference_id`, `idempotency_key`, `metadata` y `created_by` ya existen. FASE futura deberia mover auditoria sensible a `audit_logs` formal y RBAC granular.

### Stripe recharge design — FASE 5.32

Stripe no esta implementado todavia. La recarga real de saldo debe conservar el ledger actual:

- `balance_movements.type = recharge`
- `concept = Payment recharge`
- `amount`: positivo.
- `reference_type = stripe_checkout`
- `reference_id`: `stripe_checkout_session_id` o `stripe_payment_intent_id`.
- `idempotency_key`: preferir `stripe_event_id`; alternativa `stripe_payment_intent_id` si se disena asi.
- `metadata`: solo datos sanitizados como amount, currency, Stripe ids no secretos y estado de conciliacion.

El frontend nunca debe crear este movimiento. Solo `POST /api/webhooks/stripe`, despues de verificar firma Stripe, puede acreditar saldo.

Tabla futura recomendada: `payment_recharges`.

```text
id uuid primary key
user_id uuid not null references auth.users(id)
stripe_checkout_session_id text unique not null
stripe_payment_intent_id text unique null
amount numeric not null
currency text not null default 'usd'
status text not null check (status in ('pending', 'paid', 'failed', 'canceled', 'refunded'))
balance_movement_id uuid null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Razon para una tabla dedicada:

- Mantener estado `pending` antes de que exista movimiento de balance.
- Conciliar pagos donde Stripe cobro pero DB fallo.
- Evitar duplicados por `checkout_session_id`, `payment_intent_id` y `stripe_event_id`.
- Separar "intento/pago" de "ledger financiero acreditado".

Migracion futura necesaria:

- Crear `payment_recharges`.
- Agregar indices unicos para `stripe_checkout_session_id` y `stripe_payment_intent_id`.
- Opcional: indice/constraint unico para Stripe event IDs si no se usa `audit_logs`/`webhook_events`.
- No cambiar `balance_movements.type`; `recharge` ya existe.

### Stripe recharge implementation — FASE 5.33

Se preparo la migracion `shipflow-web/supabase/migrations/20260519_add_payment_recharges.sql`.

Notas:

- No fue aplicada automaticamente.
- `payment_recharges.balance_movement_id` referencia `balance_movements(id)` como `text`, porque el ledger actual usa IDs tipo `MOV-...`.
- RLS permite a usuarios leer sus propias recargas y a admin leer todas mediante `public.is_admin()`.
- No existen policies de insert/update/delete para usuarios; writes solo por backend con `service_role`.
- `status` permitido: `pending`, `paid`, `failed`, `canceled`, `refunded`.
- `currency` queda limitado a `usd`.

Relación con ledger:

- `payment_recharges` registra el estado operativo de Stripe.
- `balance_movements` sigue siendo la fuente de verdad del saldo disponible.
- El webhook `checkout.session.completed` crea exactamente un movimiento `recharge` idempotente por Stripe event.

#### SQL de verificacion FASE 5.34

Ejecutar en Supabase SQL Editor despues de aplicar la migracion en test/staging:

```sql
select to_regclass('public.payment_recharges') as payment_recharges_table;
```

Columnas esperadas:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payment_recharges'
order by ordinal_position;
```

Constraints:

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.payment_recharges'::regclass
order by conname;
```

Indices:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'payment_recharges'
order by indexname;
```

RLS y policies:

```sql
select relrowsecurity
from pg_class
where oid = 'public.payment_recharges'::regclass;

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'payment_recharges'
order by policyname;
```

Verificacion post-pago sandbox:

```sql
select id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
       stripe_event_id, amount, currency, status, balance_movement_id,
       created_at, updated_at
from public.payment_recharges
order by created_at desc
limit 10;

select id, user_id, concept, amount, type, reference_type,
       reference_id, idempotency_key, created_at
from public.balance_movements
where type = 'recharge'
order by created_at desc
limit 10;
```

FASE 5.37 valido en sandbox que el movimiento visible queda como:

- `concept = Payment recharge`
- `type = recharge`
- `amount = 10.00`
- fuente de acreditacion: webhook Stripe verificado

Pendiente de modelo futuro:

- refunds de recarga deben crear movimientos reversales/refunds separados, no editar historico.
- disputes/chargebacks deben quedar en tabla de pagos y audit/reconciliation antes de afectar saldo.
- si se bloquea saldo disputado, definir columna/ledger separado para balance disponible vs retenido.

### tracking_events

Campos principales base:

- `id`
- `shipment_id`
- `user_id`
- `tracking_number`
- `title`
- `description`
- `status`
- `created_at`

Campos agregados por update:

- `courier`
- `status_label`
- `location`
- `event_date`
- `source`
- `is_real`

Relacion:

- `shipment_id` referencia `shipments(id)`.
- `user_id` referencia `auth.users(id)`.

Riesgos actuales:

- Eventos pueden ser insertados desde cliente.
- No hay validacion fuerte de fuente.
- No hay tabla de webhooks.
- No actualiza automaticamente `shipments.status`.

### couriers

Campos principales:

- `id`
- `nombre`
- `activo`
- `logo_url`
- `cobertura`
- `precio_base`
- `precio_por_kg`
- `permite_contra_entrega`
- `comision_contra_entrega`
- `tiempo_estimado`
- `notas`
- `created_at`
- `updated_at`

Riesgos actuales:

- Tarifas son locales, no de proveedor.
- Si un usuario se escala a admin podria manipular couriers/tarifas.
- No hay relacion con provider real.

### webhook_events

Tabla preparada en FASE 1C para webhooks futuros.

Campos principales:

- `id`
- `provider`
- `event_id`
- `event_type`
- `shipment_id`
- `tracking_number`
- `payload`
- `received_at`
- `processed_at`
- `status`
- `error`

Notas:

- `shipment_id` es `text` porque `shipments.id` existe hoy como `text`.
- Usuarios normales no leen esta tabla.
- Admin puede leer via `is_admin()`.
- `event_id` es SHA-256 de `provider:resource_type:resource_url` (64 chars hex). Opaco e idempotente.
- El indice unico parcial `webhook_events_provider_event_id_unique_idx` garantiza que el mismo evento de ShipStation no se procese dos veces.
- `payload` almacena campos clave extraidos del evento (no el payload completo para evitar datos sensibles en la DB).
- Backend usa `service_role` para insertar; usuarios normales no tienen INSERT ni UPDATE en esta tabla.

Estado FASE 5:

- `POST /api/webhooks/shipstation` ya escribe en esta tabla.
- Flujo: `status = received` → proceso → `status = processed` o `status = failed`.
- Si no se encuentra un shipment relacionado: `status = processed`, `shipment_id = null`.
- Si ocurre un error en procesamiento: `status = failed`, `error` contiene el mensaje (max 500 chars).

### audit_logs

Tabla preparada en FASE 1C para auditoria.

Campos principales:

- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `ip_address`
- `user_agent`
- `created_at`

Notas:

- Usuarios normales no modifican esta tabla.
- Admin puede leer via `is_admin()`.
- Backend/server insertara eventos de auditoria en fases futuras.

Uso FASE 5.26:

- No se requiere migracion nueva.
- `action` se usa como `event_type`.
- `entity_type` acepta valores operativos como `shipment`, `balance_movement`, `admin`, `provider`, `auth`.
- `entity_id` apunta al shipment, balance movement o usuario cuando aplica.
- `metadata` contiene campos sanitizados:
  - `severity`: `info`, `warning`, `error`, `critical`.
  - `actorEmail`
  - `userId`
  - `provider`
  - `trackingNumber`
  - `idempotencyKey`
  - `requestId`
  - `message`
  - detalles operativos sin secrets.

Eventos principales:

- `label_purchase_started`
- `label_purchase_succeeded`
- `label_purchase_failed`
- `label_purchase_db_persist_failed`
- `label_void_started`
- `label_void_succeeded`
- `label_void_failed`
- `label_void_refund_failed`
- `balance_adjustment_created`
- `balance_adjustment_rejected`
- `admin_access_denied`
- `idempotency_conflict`
- `label_url_missing`

Pendiente de una fase futura: tabla de reconciliation dedicada con estado, asignacion, comentarios, resolucion y timestamps de cierre.

## Indices actuales conocidos

- `shipments_user_id_idx`
- `shipments_tracking_number_idx`
- `shipments_idempotency_key_idx`
- `shipments_user_id_idempotency_key_unique_idx`
- `shipments_provider_idx`
- `shipments_provider_label_id_idx`
- `shipments_label_status_idx`
- `shipments_payment_status_idx`
- `shipments_created_at_idx`
- `balance_movements_user_id_idx`
- `balance_movements_shipment_id_idx`
- `balance_movements_idempotency_key_idx`
- `balance_movements_created_at_idx`
- `tracking_events_tracking_number_idx`
- `tracking_events_event_date_idx`
- `tracking_events_is_real_idx`
- `couriers_activo_idx`
- `webhook_events_provider_event_id_unique_idx`
- `webhook_events_shipment_id_idx`
- `webhook_events_tracking_number_idx`
- `webhook_events_received_at_idx`
- `webhook_events_status_idx`
- `audit_logs_actor_user_id_idx`
- `audit_logs_action_idx`
- `audit_logs_entity_idx`
- `audit_logs_created_at_idx`

## RLS actual y problemas

RLS esta activado en:

- `profiles`
- `shipments`
- `balance_movements`
- `tracking_events`
- `couriers`

Problemas:

- FASE 1A preparada en SQL: `profiles_update_own` queda protegido por trigger contra escalacion de `role`.
- FASE 1A preparada en SQL: `balance_movements_insert_own` fue reemplazada por `balance_movements_insert_negative_own`.
- FASE 1B web: la UI web de crear guia deja de usar insert directo para Supabase activo.
- Pendiente: `shipments_insert_own` sigue existiendo para compatibilidad y mobile aun puede crear shipments sin backend transaccional.
- `tracking_events_insert_own` permite insertar eventos desde cliente.
- `webhook_events` y `audit_logs` quedan con lectura admin; inserts quedan para backend/server.
- Admin depende de `is_admin()`, pero `role` debe protegerse mejor.

## Campos/tablas faltantes

Para integracion real con ShipStation/proveedores faltan:

- `rates` o `quotes`.
- `labels`.
- Tabla formal `labels`; algunos campos de label/provider ya fueron preparados en `shipments`.
- `refunds` o `reversals`.
- Referencias entre balance movements y shipments/payments.

## Recomendacion para FASE 1

Antes de ShipStation:

1. Aplicar y probar la migracion FASE 1A en Supabase.
2. Confirmar que usuarios normales no pueden cambiar `role`.
3. Confirmar que usuarios normales no pueden insertar balance positivo.
4. Definir ledger seguro para dinero.
5. Preparar campos de provider e idempotencia.
6. Revisar RLS de tracking y shipments.
7. Separar datos internos de datos del proveedor.

## Cambios SQL preparados en FASE 1A

En `schema.sql`:

- Nueva funcion `protect_profile_admin_fields()`.
- Nuevo trigger `protect_profile_admin_fields` sobre `profiles`.
- `profiles_insert_own` restringida a `role = user`.
- Nueva policy `profiles_update_admin`.
- Reemplazo de `balance_movements_insert_own` por `balance_movements_insert_negative_own`.

Estos cambios aun no equivalen a una migracion ejecutada. Deben aplicarse de forma controlada en Supabase.

## Cambios de flujo preparados en FASE 1B

En web:

- Nuevo endpoint `POST /api/shipments/create`.
- El endpoint valida usuario con token Supabase.
- El endpoint recalcula tarifa local con `couriers`.
- El endpoint suma `balance_movements` para validar saldo.
- El endpoint crea `shipments`, `tracking_events` y `balance_movements`.

Deuda tecnica:

- No existe transaccion atomica SQL aplicada.
- `idempotency_key` queda preparado en schema/migracion 1C, pero no existe en la DB real hasta aplicar la migracion.
- No existe tabla `labels`.
- No existe relacion formal entre `balance_movements` y `shipments`.

## Migracion incremental FASE 1C

Archivo creado:

- `shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql`

Incluye:

- Seguridad de profiles de FASE 1A.
- Campos logisticos en `shipments`.
- Idempotencia parcial por `user_id + idempotency_key`.
- Mejoras del ledger `balance_movements`.
- Integracion de columnas de `tracking_events_update.sql`.
- Tabla `webhook_events`.
- Tabla `audit_logs`.
- Indices y constraints.
- RLS de lectura admin para tablas internas.

No fue ejecutada. Debe aplicarse manualmente y probarse en Supabase.

## Validacion FASE 1D

La migracion 1C fue revisada para soportar datos historicos actuales:

- `shipments` existentes reciben defaults seguros para `payment_status = 'unpaid'`, `label_status = 'internal'`, `platform_markup = 0`, `currency = 'USD'` y `metadata = '{}'`.
- `balance_movements` existentes reciben `type`; los movimientos positivos se marcan como `recharge` y los negativos como `debit` durante la migracion.
- `tracking_events` existentes reciben `event_date = created_at` cuando falta.
- `profiles`, `couriers` y policies principales se recrean de forma idempotente.
- El indice unico parcial `shipments_user_id_idempotency_key_unique_idx` se crea solo si no hay duplicados no nulos de `user_id + idempotency_key`.

Runbook de aplicacion:

- `docs/MIGRATION_1D_CHECKLIST.md`

La migracion sigue sin ejecutarse automaticamente. Debe aplicarse manualmente en Supabase despues de backup/snapshot y verificacion del entorno.

## Transaccion atomica

No se ejecuto RPC transaccional en FASE 1C/1D. En FASE 4B se preparo y en FASE 4D se mejoro el archivo:

- `shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql`

Contiene dos funciones SQL:

### create_label_shipment_transaction

Crea en una sola transaccion atomica:

- validar idempotencia (devuelve existente si ya esta purchased),
- validar balance (`p_customer_price > 0` requerido),
- crear shipment con todos los campos de provider, incluyendo `label_format`,
- crear tracking_event inicial (source=shipstation, is_real=true),
- insertar balance_movement de tipo debit.

Parametros nuevos en FASE 4D: `p_label_format text DEFAULT null`.

### void_label_refund_transaction

Procesa void/refund en una sola transaccion atomica:

- validar que shipment pertenece al usuario,
- validar que `label_status = purchased`,
- idempotencia: si ya existe movement de tipo `refund`, no duplica,
- update `label_status = voided`, `payment_status = refunded`,
- insertar balance_movement positivo de tipo `refund`.

Ambas funciones:

- `SECURITY DEFINER` — corre con privilegios del owner, bypassa RLS.
- `REVOKE ALL FROM public` + `GRANT EXECUTE TO service_role` — solo callable desde el backend con service_role key.

Estado: preparadas pero NO ejecutadas. Deben aplicarse manualmente en Supabase despues de aplicar FASE 1C, hacer backup/snapshot y verificar con pruebas manuales.

`createShipStationShipment.ts` (FASE 4D): verifica `SUPABASE_SERVICE_ROLE_KEY` ANTES de comprar el label, luego usa `create_label_shipment_transaction` via cliente service_role. No vuelve a inserts secuenciales.

## Estado para labels reales FASE 5.20B

El schema preparado ya contiene campos suficientes para una primera implementacion de labels ShipEngine:

- `provider`
- `provider_shipment_id`
- `provider_label_id`
- `provider_rate_id`
- `provider_service_code`
- `label_url`
- `label_format`
- `payment_status`
- `label_status`
- `provider_cost`
- `platform_markup`
- `customer_price`
- `payment_fee`
- `pricing_subtotal`
- `pricing_model`
- `pricing_breakdown`
- `currency`
- `idempotency_key`
- `metadata`

Tambien existen/estan preparadas:

- `tracking_events` para evento inicial y actualizaciones.
- `balance_movements` con `shipment_id`, `reference_type`, `reference_id`, `idempotency_key`, `type`, `metadata`.
- `webhook_events` y `audit_logs`.
- RPCs transaccionales preparadas para crear label + shipment + tracking + debit, y void + refund.

Pendiente para la fase de labels reales:

- Confirmar que las migraciones 1C, pricing y RPC estan aplicadas en la DB real.
- Decidir si `provider_rate_id` debe llenarse desde `ShipEngine rate_id` en la RPC actual; hoy el RPC preparado puede requerir ajuste para aceptar `p_provider_rate_id`.
- Definir retention/storage de PDF real (`label_url` via storage permanente vs respuesta inmediata).
- Mantener `ENABLE_REAL_LABEL_PURCHASE` apagado hasta completar FASE 5.20C.

## Nota FASE 5.20C

La implementacion ShipEngine sandbox usa la RPC existente para el estado critico y luego completa con `service_role`:

- `provider_rate_id`
- `label_url`

Motivo: la firma existente de `create_label_shipment_transaction` no aceptaba `p_provider_rate_id` ni `p_label_url`. FASE 5.20D preparo una migracion para agregar esos parametros y persistirlos dentro de la transaccion atomica.

## Nota FASE 5.20D

Se creo la migracion incremental:

- `shipflow-web/supabase/migrations/20260517_harden_label_transaction_rpc.sql`

Estado: lista para revision/aplicacion manual, no ejecutada por Codex.

Nueva firma/contrato de `create_label_shipment_transaction`:

- Conserva los parametros existentes de shipment, provider, pricing e idempotencia.
- Agrega parametros opcionales al final:
  - `p_provider_rate_id text default null`
  - `p_label_url text default null`
  - `p_label_status text default 'purchased'`
  - `p_payment_status text default 'paid'`

La funcion persiste en una sola transaccion:

- `shipments.provider_rate_id`
- `shipments.label_url`
- `shipments.label_status`
- `shipments.payment_status`
- `tracking_events` inicial
- `balance_movements` debit con metadata de provider/rate/label

Idempotencia:

- Busca shipment existente por `user_id + idempotency_key`.
- Si ya esta `purchased`, retorna el shipment existente.
- Si existe un estado incompleto, levanta `IDEMPOTENCY_CONFLICT`.

Aplicacion:

- Aplicar manualmente despues de backup/snapshot.
- No activar `ENABLE_REAL_LABEL_PURCHASE=true` para pruebas sandbox hasta que esta migracion este aplicada en la DB real.

## Nota FASE 5.29 — Staging database checklist

Antes de staging, confirmar que estas migraciones estan aplicadas:

```text
20260514_shipflow_security_logistics_foundation.sql
20260514_create_label_transaction_rpc.sql
20260515_add_pricing_breakdown_to_shipments.sql
20260517_harden_label_transaction_rpc.sql
```

SQL de verificacion recomendado:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'shipments'
  and column_name in (
    'provider_rate_id',
    'label_url',
    'label_status',
    'payment_status',
    'pricing_breakdown',
    'provider_label_id',
    'provider_shipment_id'
  )
order by column_name;
```

```sql
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_label_shipment_transaction',
    'void_label_refund_transaction'
  )
order by p.proname;
```

La firma de `create_label_shipment_transaction` debe incluir:

- `p_provider_rate_id`
- `p_label_url`
- `p_label_status`
- `p_payment_status`

```sql
select to_regclass('public.audit_logs') as audit_logs_table;
```

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.balance_movements'::regclass
  and conname = 'balance_movements_type_check';
```

`balance_movements_type_check` debe permitir:

- `recharge`
- `debit`
- `refund`
- `adjustment`
- `fee`

No aplicar migraciones contra produccion desde una sesion local improvisada. No resetear DB.
