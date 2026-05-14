# Checklist FASE 1D - Aplicar migracion 1C

Esta guia describe como aplicar manualmente la migracion:

```text
shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql
```

No aplicar contra produccion sin backup y confirmacion explicita.

## Antes de aplicar

1. Confirmar si el entorno es local, staging o produccion.
2. Exportar backup de la base o snapshot del proyecto Supabase.
3. Guardar copia de `schema.sql` actual si se modifico manualmente desde Supabase.
4. Revisar duplicados de idempotencia si la columna ya existe:

```sql
select user_id, idempotency_key, count(*)
from public.shipments
where idempotency_key is not null
group by user_id, idempotency_key
having count(*) > 1;
```

5. Revisar movimientos con monto cero, porque la migracion agrega `amount <> 0`:

```sql
select *
from public.balance_movements
where amount = 0;
```

6. Revisar roles existentes:

```sql
select id, email, role
from public.profiles
order by created_at desc;
```

## Aplicacion con Supabase CLI

Opcion local/staging con CLI:

```bash
cd shipflow-web
supabase db push
```

Si se quiere aplicar un archivo especifico contra una base vinculada, revisar primero el proyecto vinculado y usar el flujo oficial de Supabase CLI para ese entorno. No ejecutar contra produccion sin confirmar proyecto y backup.

## Aplicacion manual en Supabase SQL Editor

1. Abrir Supabase Dashboard.
2. Entrar al proyecto correcto.
3. Abrir SQL Editor.
4. Pegar el contenido completo de:

```text
shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql
```

5. Ejecutar una vez.
6. Guardar el resultado/log de ejecucion.

La migracion usa `if not exists`, `drop policy if exists`, `drop constraint if exists` y `create or replace function` para ser tolerante a estados previos conocidos.

## Verificaciones SQL despues de aplicar

Confirmar columnas nuevas:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
and table_name = 'shipments'
and column_name in (
  'provider',
  'provider_shipment_id',
  'provider_label_id',
  'provider_rate_id',
  'provider_service_code',
  'label_url',
  'label_format',
  'payment_status',
  'label_status',
  'provider_cost',
  'platform_markup',
  'customer_price',
  'currency',
  'idempotency_key',
  'metadata'
)
order by column_name;
```

Confirmar tablas internas:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('webhook_events', 'audit_logs');
```

Confirmar RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
and tablename in (
  'profiles',
  'shipments',
  'balance_movements',
  'tracking_events',
  'couriers',
  'webhook_events',
  'audit_logs'
);
```

Confirmar policies principales:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
and tablename in (
  'profiles',
  'shipments',
  'balance_movements',
  'tracking_events',
  'couriers',
  'webhook_events',
  'audit_logs'
)
order by tablename, policyname;
```

Confirmar tipos de movimientos historicos:

```sql
select type, count(*), sum(amount)
from public.balance_movements
group by type
order by type;
```

## Pruebas manuales de app

1. Registrar o iniciar sesion como usuario normal.
2. Intentar crear guia con saldo insuficiente: debe fallar con error claro.
3. Crear guia con saldo suficiente.
4. Verificar que se creo un registro en `shipments`.
5. Verificar que se creo un `tracking_event` inicial.
6. Verificar que se creo un `balance_movement` negativo con:
   - `type = 'debit'`
   - `reference_type = 'shipment'`
   - `shipment_id` del envio
   - `idempotency_key`
7. Intentar insertar un `balance_movement` positivo desde cliente/anon: debe fallar.
8. Intentar cambiar `profiles.role` a `admin` como usuario normal: debe fallar.
9. Confirmar que un admin real sigue viendo el panel admin.
10. Probar tracking existente y confirmar que el fallback sigue marcado como fallback.

## Rollback razonable

Preferencia: restaurar backup/snapshot si algo falla en produccion.

Rollback parcial posible en staging/local:

```sql
drop table if exists public.webhook_events;
drop table if exists public.audit_logs;

drop index if exists shipments_user_id_idempotency_key_unique_idx;
drop index if exists shipments_idempotency_key_idx;
```

No se recomienda borrar columnas agregadas en produccion sin revisar dependencias y datos creados despues de aplicar la migracion.

## Pendiente despues de aplicar

- Crear RPC transaccional para shipment + tracking_event + balance_movement.
- Mover mobile a backend seguro.
- Crear endpoints reales `/api/rates` y `/api/labels`.
- Conectar ShipStation solo despues de completar seguridad/base/API.
- Implementar webhooks con validacion de firma/secreto.
