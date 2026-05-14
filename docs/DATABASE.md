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
- Backend/server insertara eventos en fases futuras.

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
