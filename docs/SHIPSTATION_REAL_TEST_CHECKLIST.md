# FASE 4E — Checklist de prueba real controlada ShipStation

Esta guia describe como aplicar las migraciones y probar el flujo completo de labels ShipStation
de forma segura y controlada.

NO aplicar en produccion publica hasta completar todos los puntos.
NO commitear `.env.local`.
NO ejecutar migraciones automaticamente; aplicar manualmente con confirmacion explicita.

---

## A. Pre-check antes de aplicar cualquier cosa

### 1. Confirmar entorno

```sql
-- Ejecutar en Supabase SQL Editor para confirmar proyecto
select current_database(), current_user, version();
```

Verificar que el resultado corresponde al proyecto de desarrollo/staging, no produccion.

### 2. Exportar backup o snapshot

- En Supabase Dashboard → Settings → Database → Backups: crear un backup manual.
- O usar Supabase CLI si esta vinculado al proyecto:

```bash
supabase db dump --file backup_before_fase4e.sql
```

Guardar el archivo fuera del repositorio.

### 3. Verificar que `.env.local` no esta en git

```bash
cd shipflow-web
git status --short | grep env
```

El resultado NO debe mostrar `.env.local`. Si aparece, agregar `.env.local` a `.gitignore` antes de continuar.

### 4. Confirmar variables requeridas en `.env.local`

El archivo `shipflow-web/.env.local` debe contener (sin quotes, sin espacios extras):

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — NUNCA en NEXT_PUBLIC_>
SHIPSTATION_API_KEY=<api key de ShipStation>
SHIPSTATION_API_SECRET=<api secret de ShipStation>
SHIPSTATION_BASE_URL=https://ssapi.shipstation.com
```

Verificar que NO hay prefijo `NEXT_PUBLIC_` en ninguna de las claves privadas.

### 5. Verificar que ShipStation API key es de cuenta de prueba

En ShipStation: Settings → Account → API Settings.
Confirmar que la cuenta tiene saldo de prueba o que se usara un carrier sandbox.

### 6. Pre-verificar si la migracion 1C ya fue aplicada

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'shipments'
  and column_name = 'idempotency_key';
```

Si retorna una fila, la migracion 1C ya esta aplicada — saltar al paso B.2.
Si no retorna nada, aplicar primero la migracion 1C (paso B.1).

### 7. Pre-verificar tipo de `balance_movements.id`

IMPORTANTE: La RPC inserta en `balance_movements` con `id = 'MOV-' || gen_random_uuid()::text`.
Requiere que `balance_movements.id` sea tipo `text`, no `uuid`.

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'balance_movements'
  and column_name = 'id';
```

Si `data_type = 'text'`: correcto, continuar.
Si `data_type = 'uuid'`: la RPC fallara al insertar. Notificar al operador antes de continuar.
En ese caso, editar la funcion RPC en el archivo SQL para usar `gen_random_uuid()` directamente
en lugar de `'MOV-' || gen_random_uuid()::text`.

---

## B. Aplicar migraciones (en orden)

### B.1 Aplicar migracion FASE 1C (si no esta aplicada)

Archivo: `shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql`

En Supabase SQL Editor:

1. Abrir el proyecto correcto en Supabase Dashboard.
2. Ir a SQL Editor.
3. Pegar el contenido completo del archivo.
4. Ejecutar.
5. Verificar que no hay errores en el log.

Con Supabase CLI (si el proyecto esta vinculado):

```bash
supabase db push
```

### B.2 Aplicar migracion FASE 4D (RPC atomica)

Archivo: `shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql`

PREREQUISITO: La migracion FASE 1C debe estar aplicada antes de este paso.

En Supabase SQL Editor:

1. Pegar el contenido completo del archivo.
2. Ejecutar.
3. Verificar que no hay errores.

---

## C. Verificaciones SQL post-migracion

Ejecutar en Supabase SQL Editor despues de aplicar ambas migraciones.

### C.1 Columnas en shipments

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'shipments'
  and column_name in (
    'provider', 'provider_shipment_id', 'provider_label_id',
    'provider_rate_id', 'provider_service_code',
    'label_url', 'label_format',
    'payment_status', 'label_status',
    'provider_cost', 'platform_markup', 'customer_price', 'currency',
    'idempotency_key', 'metadata'
  )
order by column_name;
```

Deben aparecer las 15 columnas.

### C.2 Columnas en balance_movements

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'balance_movements'
  and column_name in (
    'type', 'reference_type', 'reference_id',
    'shipment_id', 'idempotency_key', 'metadata', 'created_by'
  )
order by column_name;
```

Deben aparecer las 7 columnas.

### C.3 Tablas internas

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('webhook_events', 'audit_logs')
order by table_name;
```

Deben aparecer ambas tablas.

### C.4 Funciones RPC

```sql
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_label_shipment_transaction',
    'void_label_refund_transaction'
  )
order by routine_name;
```

Deben aparecer las dos funciones.

### C.5 Permisos de las funciones RPC

```sql
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'create_label_shipment_transaction',
    'void_label_refund_transaction'
  )
order by routine_name, grantee;
```

Solo `service_role` debe tener `EXECUTE`. No debe aparecer `public` ni `anon` ni `authenticated`.

### C.6 RLS activado

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'shipments', 'balance_movements',
    'tracking_events', 'couriers', 'webhook_events', 'audit_logs'
  )
order by tablename;
```

Todas deben tener `rowsecurity = true`.

### C.7 Policies principales

```sql
select tablename, policyname, cmd, permissive
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'shipments', 'balance_movements',
    'tracking_events', 'couriers', 'webhook_events', 'audit_logs'
  )
order by tablename, policyname;
```

Verificar que existan:
- `balance_movements_insert_negative_own` (solo movimientos negativos propios desde cliente)
- `shipments_select_own`
- `shipments_insert_own` (temporal, pendiente de migracion mobile)
- `profiles_update_own` + trigger `protect_profile_admin_fields`
- `webhook_events_select_admin`
- `audit_logs_select_admin`

### C.8 Verificar tipos historicos en balance_movements

```sql
select type, count(*), sum(amount)
from public.balance_movements
group by type
order by type;
```

Los movimientos historicos positivos deben ser `recharge`, los negativos `debit`.
No deben existir filas con `type = null`.

### C.9 Verificar duplicados de idempotency_key

```sql
select user_id, idempotency_key, count(*)
from public.shipments
where idempotency_key is not null
group by user_id, idempotency_key
having count(*) > 1;
```

No debe retornar ninguna fila. Si retorna filas, hay datos duplicados que impiden el indice unico.

---

## D. Prueba API local (paso a paso)

### D.0 Iniciar servidor local

```bash
cd shipflow-web
npm run dev
```

El servidor debe arrancar en `http://localhost:3000` sin errores.
Confirmar en los logs que no hay errores de conexion a Supabase.

### D.1 Login y obtener Bearer token

1. Abrir `http://localhost:3000/login` en el navegador.
2. Iniciar sesion con un usuario de prueba (no admin, no produccion).
3. Obtener el Bearer token desde las DevTools del navegador:
   - En Chrome: Application → Local Storage → buscar `sb-<project>-auth-token` → copiar `access_token`.
   - O ejecutar en la consola del navegador:
     ```javascript
     JSON.parse(localStorage.getItem('sb-<proyecto>-auth-token')).access_token
     ```
   - Guardar como `<SUPABASE_BEARER_TOKEN>` para los curls siguientes.

### D.2 Verificar balance disponible

```bash
curl -s -X GET http://localhost:3000/api/balance \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  | jq .
```

Respuesta esperada:
```json
{ "balance": 0, "movements": [] }
```

Si el balance es 0 o negativo, el proximo paso (crear label) debe fallar con saldo insuficiente.

### D.3 Cargar saldo de prueba de forma controlada

Para agregar saldo de prueba, insertar directamente en Supabase SQL Editor
(el endpoint de balance no tiene recarga; recargas positivas deben venir de backend/admin):

```sql
-- Reemplazar <USER_ID> con el UUID del usuario de prueba.
-- Reemplazar el amount con el valor a acreditar (p.ej. 50.00).
insert into public.balance_movements (
  id, user_id, concept, amount, type, created_by
) values (
  'MOV-TEST-' || gen_random_uuid()::text,
  '<USER_ID>',
  'Test recharge for FASE 4E testing',
  50.00,
  'recharge',
  '<USER_ID>'
);
```

Verificar con `/api/balance` que el saldo se refleja correctamente.

### D.4 Obtener rates de ShipStation

```bash
curl -s -X POST http://localhost:3000/api/rates \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "shipstation",
    "origin": {
      "city": "Austin",
      "state": "TX",
      "postalCode": "78701",
      "country": "US"
    },
    "destination": {
      "city": "Miami",
      "state": "FL",
      "postalCode": "33101",
      "country": "US"
    },
    "parcel": {
      "weight": 1.0,
      "weightUnit": "lb"
    },
    "courier": "stamps_com"
  }' \
  | jq .
```

Respuesta esperada: array de rates con `serviceCode`, `serviceName`, `customerPrice`.
Copiar `serviceCode` de la opcion elegida para el paso D.5.

### D.5 Probar saldo insuficiente (ANTES de cargar saldo)

Si el saldo es 0, repetir este paso ANTES del paso D.3 para confirmar el bloqueo:

```bash
curl -s -X POST http://localhost:3000/api/labels \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "shipstation",
    "origin": {
      "city": "Austin",
      "state": "TX",
      "postalCode": "78701",
      "country": "US"
    },
    "destination": {
      "city": "Miami",
      "state": "FL",
      "postalCode": "33101",
      "country": "US"
    },
    "parcel": { "weight": 1.0, "weightUnit": "lb" },
    "carrierCode": "stamps_com",
    "serviceCode": "usps_priority_mail",
    "expectedCost": 10.00,
    "idempotencyKey": "<UUID_IDEMPOTENCY_KEY>"
  }' \
  | jq .
```

Respuesta esperada: HTTP 402, mensaje de saldo insuficiente. NO debe comprar label en ShipStation.

### D.6 Crear label real (primera vez)

Generar un UUID para `idempotencyKey` (guardar para el paso de idempotencia):

```bash
# En macOS/Linux generar UUID:
uuidgen
# Ejemplo: 550e8400-e29b-41d4-a716-446655440000
```

```bash
curl -s -X POST http://localhost:3000/api/labels \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "shipstation",
    "origin": {
      "city": "Austin",
      "state": "TX",
      "postalCode": "78701",
      "country": "US"
    },
    "destination": {
      "city": "Miami",
      "state": "FL",
      "postalCode": "33101",
      "country": "US"
    },
    "parcel": { "weight": 1.0, "weightUnit": "lb" },
    "carrierCode": "stamps_com",
    "serviceCode": "<serviceCode-de-D.4>",
    "expectedCost": <customerPrice-de-D.4>,
    "idempotencyKey": "<UUID_IDEMPOTENCY_KEY>",
    "senderName": "Test Sender",
    "senderPhone": "5121234567",
    "recipientName": "Test Recipient",
    "recipientPhone": "3051234567",
    "productType": "Package",
    "labelFormat": "pdf"
  }' \
  | jq .
```

Respuesta esperada (HTTP 201):
```json
{
  "shipment": { "id": "...", "trackingNumber": "...", ... },
  "trackingNumber": "9400...",
  "labelStatus": "purchased",
  "labelData": "<base64 PDF>",
  "providerShipmentId": "...",
  "providerLabelId": "...",
  "customerPrice": 7.50,
  "currency": "USD",
  "message": "..."
}
```

IMPORTANTE: Guardar `labelData` inmediatamente. No se recupera en reintentos idempotentes.
Guardar `shipment.id` como `<SHIPMENT_ID>` para el paso de void.
Guardar `providerShipmentId` para verificacion.

### D.7 Verificar persistencia en Supabase

```sql
-- Reemplazar <USER_ID> y <TRACKING_NUMBER>
select id, tracking_number, label_status, payment_status,
       provider, provider_shipment_id, customer_price, idempotency_key
from public.shipments
where user_id = '<USER_ID>'
order by created_at desc
limit 5;
```

El shipment debe tener:
- `label_status = 'purchased'`
- `payment_status = 'paid'`
- `provider = 'shipstation'`
- `provider_shipment_id` con el ID numerico de ShipStation
- `customer_price` con el costo real

```sql
-- Verificar tracking_event inicial
select title, description, source, is_real, created_at
from public.tracking_events
where shipment_id = '<SHIPMENT_ID>'
order by created_at desc;
```

Debe haber un evento con `source = 'shipstation'` y `is_real = true`.

```sql
-- Verificar debit en balance
select concept, amount, type, reference_id, created_at
from public.balance_movements
where user_id = '<USER_ID>'
order by created_at desc
limit 5;
```

Debe haber un movimiento con `type = 'debit'`, `amount` negativo igual al costo.

### D.8 Probar idempotencia (mismo idempotencyKey)

```bash
# Repetir exactamente el mismo curl del paso D.6 con el mismo idempotencyKey.
curl -s -X POST http://localhost:3000/api/labels \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "shipstation",
    ...
    "idempotencyKey": "<MISMO_UUID_QUE_D6>"
  }' \
  | jq .
```

Respuesta esperada: HTTP 201, mismo trackingNumber, `labelData: null` (no recuperable).
NO debe haber segunda compra en ShipStation ni segundo debit en balance.

Verificar en Supabase que sigue habiendo solo un shipment y un balance_movement para ese idempotencyKey.

### D.9 Probar void de label

```bash
curl -s -X POST http://localhost:3000/api/labels/<SHIPMENT_ID>/void \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  | jq .
```

Respuesta esperada (HTTP 200):
```json
{
  "shipment": { "id": "...", "labelStatus": "voided", ... },
  "labelStatus": "voided",
  "refunded": true,
  "message": "ShipStation label voided successfully."
}
```

### D.10 Verificar refund en balance

```sql
select concept, amount, type, reference_id, created_at
from public.balance_movements
where user_id = '<USER_ID>'
order by created_at desc
limit 5;
```

Debe haber un movimiento con `type = 'refund'`, `amount` positivo igual al costo.

```sql
-- Verificar label_status voided
select id, label_status, payment_status
from public.shipments
where id = '<SHIPMENT_ID>';
```

Debe tener `label_status = 'voided'` y `payment_status = 'refunded'`.

### D.11 Probar idempotencia de void (repetir void)

```bash
# Repetir el mismo curl de D.9.
curl -s -X POST http://localhost:3000/api/labels/<SHIPMENT_ID>/void \
  -H "Authorization: Bearer <SUPABASE_BEARER_TOKEN>" \
  | jq .
```

Respuesta esperada: HTTP 409 (ya voided) o HTTP 200 con mensaje "already voided and refunded".
NO debe haber segundo refund en balance.

Verificar en Supabase que solo existe un movimiento de tipo `refund` para el shipment.

---

## E. Errores esperados y como interpretarlos

| Escenario | HTTP | Respuesta esperada |
|-----------|------|--------------------|
| `SUPABASE_SERVICE_ROLE_KEY` no configurado | 503 | "ShipStation labels require SUPABASE_SERVICE_ROLE_KEY..." |
| Migracion 1C no aplicada (falta `idempotency_key`) | 503 | "ShipStation labels require the logistics migration..." |
| RPC no aplicada (falta funcion SQL) | 500 | "Apply migration 20260514_create_label_transaction_rpc.sql..." + recovery info |
| Saldo insuficiente | 402 | "Insufficient balance..." |
| Bearer token invalido o expirado | 401 | "Unauthorized" o similar |
| `carrierCode` o `serviceCode` faltante | 400 | "carrierCode is required..." |
| `postalCode` faltante | 400 | "postalCode is required..." |
| ShipStation auth invalida (API key mala) | 401 | "ShipStation credentials are invalid or missing." |
| ShipStation rate limit | 429 | "ShipStation rate limit reached..." |
| Label ya voided | 409 | "Label is already voided." |
| Label sin `label_status = purchased` | 409 | "Cannot void a label with status '...'." |
| Void exitoso pero RPC de refund no aplicada | 500 | "Label voided in ShipStation but refund RPC is not applied..." |

En el caso de error 500 con "CRITICAL" y recovery info: el label YA fue comprado en ShipStation.
El recovery info contiene `trackingNumber`, `providerShipmentId`, `providerLabelId`, `serviceCode`,
`carrierCode` y `actualCost`. Guardar y notificar al operador para reconciliacion manual.

---

## F. Que NO hacer durante las pruebas

- No usar addresses reales de personas para los primeros tests (usar datos ficticios de prueba).
- No hacer multiples requests de labels sin `idempotencyKey` — cada uno comprara una label nueva en ShipStation.
- No cerrar la ventana del navegador antes de guardar `labelData` de la respuesta.
- No commitear `.env.local` en ningun momento.
- No probar en produccion publica hasta haber completado todos los pasos en staging/dev.
- No llamar al endpoint de labels sin `SUPABASE_SERVICE_ROLE_KEY` configurado — fallara con 503 antes de comprar.
- No aplicar la migracion sin haber tomado backup.
- No ignorar errores 500 con "CRITICAL" en los logs — requieren atencion inmediata.

---

## G. Que verificar en ShipStation Dashboard

Despues de crear un label exitoso, confirmar en ShipStation:

1. Settings → Account → Shipments: debe aparecer el envio creado.
2. El `tracking_number` en la respuesta debe coincidir con el de ShipStation.
3. Despues de void: el envio debe aparecer como "Voided" en ShipStation.

---

## H. Balance de prueba: limpieza post-test

Despues de completar las pruebas, limpiar el saldo de prueba insertado manualmente:

```sql
-- Eliminar solo los movimientos de tipo 'recharge' con concept de test.
-- Verificar primero antes de borrar.
select * from public.balance_movements
where user_id = '<USER_ID>'
  and concept like '%Test recharge%';

-- Solo si estas seguro:
delete from public.balance_movements
where user_id = '<USER_ID>'
  and concept like '%Test recharge%';
```

---

## I. Checklist de aprobacion para pasar a produccion

Completar todas las casillas antes de habilitar ShipStation en produccion:

- [ ] Backup tomado antes de aplicar migraciones.
- [ ] Migracion FASE 1C aplicada exitosamente.
- [ ] Migracion FASE 4D (RPC) aplicada exitosamente.
- [ ] SQL C.4 confirma que ambas funciones RPC existen.
- [ ] SQL C.5 confirma que solo `service_role` tiene EXECUTE.
- [ ] SQL C.6 confirma RLS activado en todas las tablas.
- [ ] Prueba D.5 confirma que saldo insuficiente bloquea compra.
- [ ] Prueba D.6 confirma label real comprada correctamente.
- [ ] Prueba D.7 confirma shipment, tracking_event y balance_movement creados atomicamente.
- [ ] Prueba D.8 confirma que el mismo idempotencyKey no duplica label ni balance.
- [ ] Prueba D.9 confirma void exitoso en ShipStation.
- [ ] Prueba D.10 confirma refund positivo en balance_movements.
- [ ] Prueba D.11 confirma que void repetido no duplica refund.
- [ ] `labelData` base64 guardado por el cliente inmediatamente.
- [ ] `.env.local` no aparece en `git status`.
- [ ] Todos los errores esperados de la tabla E verificados.
- [ ] FASE 5 (webhooks) planificada para sincronizacion automatica de estados.
