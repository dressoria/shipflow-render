# Deployment

## Estado actual de infraestructura

Actualmente el proyecto no tiene configuracion de despliegue propia para VM.

No existe:

- `Dockerfile`.
- `docker-compose.yml`.
- Configuracion de Nginx.
- Configuracion SSL.
- Documentacion de deploy a servidor.

Existe:

- Scripts de build/start en `shipflow-web`.
- Scripts Expo en `shipflow-mobile`.
- README internos con instrucciones basicas.
- `shipflow-web/.env.example` con placeholders sin secretos reales.
- `shipflow-mobile/.env.example` con placeholders sin secretos reales.

## Objetivo futuro

Desplegar `shipflow-web` en una VM por SSH usando:

- Docker.
- docker-compose.
- Nginx como reverse proxy.
- SSL.
- Variables de entorno server-side.

Mobile se debe manejar con flujo Expo/EAS o builds nativos; no se despliega en la VM igual que la web.

## Variables de entorno necesarias

Web publicas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   # OPCIONAL — habilita Google Places Autocomplete y mapa con pin en /crear-guia
                                   # Si está vacía el formulario funciona con parser local y edición manual
                                   # Con key: aparece "Seleccionar en mapa" y Places Autocomplete en el formulario
                                   # El mapa usa Geocoder para reverse geocoding; no necesita librería npm adicional
                                   # Restringir por HTTP referrer en Google Cloud Console antes de producción
                                   # Requiere: Maps JavaScript API + Places API habilitados en el proyecto de Google Cloud
```

Web privadas:

```text
SUPABASE_SERVICE_ROLE_KEY        # REQUERIDA para RPC atomica y webhooks
INTERNAL_API_SECRET
ADMIN_EMAILS                     # fallback temporal beta; preferir profiles.role = admin
ENABLE_REAL_LABEL_PURCHASE=false # guard server-side; activar solo para prueba sandbox controlada
ENABLE_REAL_LABEL_VOID=false     # guard server-side; activar solo para prueba sandbox controlada
SHIPSTATION_API_MODE             # opcional; usar shipengine para API ShipEngine/ShipStation sandbox
SHIPSTATION_API_KEY              # REQUERIDA para rates/labels/void/webhooks
SHIPSTATION_API_SECRET           # requerida solo en modo ShipStation V1 legacy (Basic Auth key:secret)
SHIPSTATION_BASE_URL             # V1: https://ssapi.shipstation.com; ShipEngine: https://api.shipengine.com/v1
SHIPSTATION_WEBHOOK_SECRET       # REQUERIDA para autenticar webhooks entrantes; generar con: openssl rand -hex 32
EASYPOST_API_KEY                 # opcional; activa rates reales en el cotizador
SHIPPO_API_KEY                   # opcional; activa rates reales en el cotizador
EASYSHIP_API_KEY                 # opcional; activa rates reales Easyship
EASYSHIP_BASE_URL                # requerida junto a EASYSHIP_API_KEY; sandbox: https://public-api-sandbox.easyship.com
PAYMENT_PROVIDER_SECRET
WEBHOOK_PAYMENT_SECRET
STRIPE_SECRET_KEY                # futuro: server-side, no implementado todavia
STRIPE_WEBHOOK_SECRET            # futuro: server-side, requerido para verificar webhooks Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # futuro: publishable key publica, unica variable Stripe NEXT_PUBLIC
STRIPE_PRICE_ID_10               # futuro opcional si se usan precios fijos
STRIPE_PRICE_ID_25               # futuro opcional
STRIPE_PRICE_ID_50               # futuro opcional
STRIPE_PRICE_ID_100              # futuro opcional
```

Para que el cotizador muestre tarifas debe existir al menos una integración de cotización real configurada en servidor. `/api/config/status` expone solo booleans y `activeRateProviders`, nunca nombres ni secretos.

FASE 5.18 deja los adapters de rates alineados con ShipEngine/ShipStation sandbox, Shippo test y Easyship sandbox. FASE 5.29 prepara staging sin deploy. Antes de producción sigue pendiente validar `npm run lint`, `npm run typecheck` y `npm run build`, configurar variables reales solo en servidor y completar QA visual/manual de staging.

Nota sobre webhooks: ShipStation requiere HTTPS para enviar webhooks. El servidor staging/produccion debe tener SSL configurado antes de registrar la URL del webhook en ShipStation Dashboard.

URL del webhook que registrar en ShipStation:
```
https://TU_DOMINIO/api/webhooks/shipstation?secret=EL_VALOR_DE_SHIPSTATION_WEBHOOK_SECRET
```

Tracking carriers actuales:

```text
USPS_API_URL
USPS_API_KEY
USPS_TRACKING_API_URL
USPS_TRACKING_API_KEY
UPS_API_URL
UPS_API_KEY
UPS_TRACKING_API_URL
UPS_TRACKING_API_KEY
FEDEX_API_URL
FEDEX_API_KEY
FEDEX_TRACKING_API_URL
FEDEX_TRACKING_API_KEY
DHL_API_URL
DHL_API_KEY
DHL_TRACKING_API_URL
DHL_TRACKING_API_KEY
```

Mobile publicas:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_TRACKING_API_URL
```

## Archivos env locales

Para desarrollo local:

```bash
cp shipflow-web/.env.example shipflow-web/.env.local
cp shipflow-mobile/.env.example shipflow-mobile/.env
```

No escribir valores reales en los archivos `.env.example`.

En servidor Docker/VM, las variables reales deben vivir en el `.env` del servidor, secretos del proveedor de infraestructura, o el mecanismo de secrets elegido. No deben ir a GitHub.

## Que debe ir en servidor

- API keys privadas de ShipStation/proveedores.
- Secretos de webhooks.
- Variables de runtime de Next.js.
- Configuracion de dominio/SSL.
- Logs de aplicacion.

## Que no debe ir al repo

- API keys reales.
- Secrets de webhooks.
- Service role key.
- Certificados privados.
- Dumps de base de datos con datos reales.
- Archivos `.env` reales.
- `.env.local` con credenciales reales.

## Plan futuro de deploy

FASE 7 propuesta:

1. Crear `.env.example` para web sin valores reales.
2. Crear Dockerfile para `shipflow-web`.
3. Crear `docker-compose.yml`.
4. Configurar Nginx reverse proxy.
5. Configurar SSL.
6. Definir healthcheck.
7. Documentar comandos SSH.
8. Probar build local.
9. Probar deploy en staging antes de produccion.

## FASE 5.29 — Staging deploy preparation

Esta fase prepara staging, pero no ejecuta deploy.

### Preflight local

Desde `shipflow-web`:

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

En el repo root:

```bash
git status --short
```

Confirmar:

- `.env.local` no aparece en `git status`.
- No hay secrets en archivos versionados.
- `shipflow-web/.env.example` contiene placeholders seguros.
- `ENABLE_REAL_LABEL_PURCHASE=false` y `ENABLE_REAL_LABEL_VOID=false` por defecto.
- No hay cambios sin revisar antes de crear PR/deploy.

### Variables de staging

Staging debe usar solo sandbox/test keys:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://staging.example.com
NODE_ENV=production

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

SHIPSTATION_API_MODE=shipengine
SHIPSTATION_API_KEY=TEST_...
SHIPSTATION_API_SECRET=
SHIPSTATION_BASE_URL=https://api.shipengine.com/v1
SHIPSTATION_WEBHOOK_SECRET=

SHIPPO_API_KEY=shippo_test_...
EASYSHIP_API_KEY=sand_...
EASYSHIP_BASE_URL=https://public-api-sandbox.easyship.com
EASYPOST_API_KEY=

ENABLE_REAL_LABEL_PURCHASE=false
ENABLE_REAL_LABEL_VOID=false
ADMIN_EMAILS=admin@example.com
```

No usar `NEXT_PUBLIC_` para keys privadas de providers, service role, webhooks o pagos.

Required for staging beta:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para validar Places/mapa en beta
- `SHIPSTATION_API_MODE=shipengine`
- `SHIPSTATION_API_KEY=TEST_...`
- `SHIPSTATION_BASE_URL=https://api.shipengine.com/v1`
- `SHIPPO_API_KEY=shippo_test_...`
- `EASYSHIP_API_KEY=sand_...`
- `EASYSHIP_BASE_URL=https://public-api-sandbox.easyship.com`
- `ADMIN_EMAILS` o `profiles.role = admin`
- `ENABLE_REAL_LABEL_PURCHASE=false`
- `ENABLE_REAL_LABEL_VOID=false`

Optional/pending:

- `EASYPOST_API_KEY`
- `SHIPSTATION_API_SECRET` en modo ShipEngine debe quedar vacio
- Payment variables, hasta integrar Stripe/pagos reales
- Stripe futuro: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y price IDs opcionales. No configurarlas con live keys hasta que la fase de billing este implementada.

### Supabase migration/RPC checklist

Aplicar en staging, en orden, desde SQL Editor o proceso controlado:

```text
shipflow-web/supabase/migrations/20260514_shipflow_security_logistics_foundation.sql
shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql
shipflow-web/supabase/migrations/20260515_add_pricing_breakdown_to_shipments.sql
shipflow-web/supabase/migrations/20260517_harden_label_transaction_rpc.sql
```

No resetear la DB. No aplicar contra producción desde una sesion local improvisada.

#### SQL de verificacion

Columnas clave de `shipments`:

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

Firma endurecida de `create_label_shipment_transaction`:

```sql
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_label_shipment_transaction';
```

Debe incluir:

```text
p_provider_rate_id
p_label_url
p_label_status
p_payment_status
```

Existencia de `void_label_refund_transaction`:

```sql
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'void_label_refund_transaction';
```

Existencia de `audit_logs`:

```sql
select to_regclass('public.audit_logs') as audit_logs_table;
```

Constraint de `balance_movements.type`:

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.balance_movements'::regclass
  and conname = 'balance_movements_type_check';
```

Debe permitir:

```text
recharge, debit, refund, adjustment, fee
```

### Health check despues de staging deploy

Sin activar compras ni voids:

1. Abrir `/`.
2. Probar `/login`, `/registro`, `/verifica-tu-correo`.
3. Abrir `/api/config/status` y confirmar:
   - `ratesConfigured`
   - `activeRateProviders`
   - `labelPurchaseEnabled: false`
   - `labelVoidEnabled: false`
4. Abrir `/dashboard`.
5. Abrir `/crear-guia`.
6. Abrir `/envios`.
7. Abrir `/tracking`.
8. Abrir `/saldo`.
9. Abrir `/admin` con admin autorizado.
10. Confirmar que usuario no admin recibe bloqueo seguro.

### Staging test plan

Guards apagados:

- `labelPurchaseEnabled=false`.
- `labelVoidEnabled=false`.
- Rates funcionan.
- Purchase label muestra bloqueo seguro.
- Void muestra bloqueo seguro.

Rates:

```text
From: 350 5th Ave, New York, NY 10118
To: 700-798 Borello Way, Mountain View, CA 94041
Package: 1 lb, 6 x 4 x 2 in
```

Esperado:

- Rates reales de alguno de los providers configurados.
- Sin Dummy/Mock/Internal visible.
- Carrier/service limpios.
- Pricing breakdown en ingles.

Admin:

- Admin entra a `/admin`.
- No admin recibe 403.
- Admin ve shipments, balance movements y audit.
- Manual adjustment solo si se decide probar con monto pequeno y razon clara.

Label sandbox controlado:

- Solo si el equipo decide probarlo.
- Activar temporalmente `ENABLE_REAL_LABEL_PURCHASE=true`.
- Comprar una sola label ShipEngine TEST.
- Verificar PDF `SAMPLE`, tracking, debit y audit.
- Volver a `ENABLE_REAL_LABEL_PURCHASE=false`.

Void sandbox controlado:

- Solo si existe una label SAMPLE recien comprada.
- Activar temporalmente `ENABLE_REAL_LABEL_VOID=true`.
- Ejecutar void una sola vez.
- Verificar refund, status y audit.
- Volver a `ENABLE_REAL_LABEL_VOID=false`.

Responsive:

- 390px.
- 430px.
- 768px.
- Desktop.

Rutas: `/dashboard`, `/crear-guia`, `/envios`, `/guia/<tracking>`, `/tracking`, `/saldo`, `/admin`, `/admin/envios`, `/admin/saldo`, `/admin/audit`.

### Riesgos y rollback

Si rates fallan:

- Revisar provider env vars server-side.
- Confirmar `SHIPSTATION_API_MODE=shipengine`.
- Confirmar sandbox keys y base URLs.
- Ver `/api/config/status`.

Si label purchase aparece deshabilitado:

- Es esperado si `ENABLE_REAL_LABEL_PURCHASE=false`.
- No activar salvo prueba sandbox controlada.

Si purchase falla por RPC:

- Verificar `20260517_harden_label_transaction_rpc.sql`.
- Ejecutar SQL de firma.
- Revisar audit logs/reconciliation.

Si balance falla:

- Verificar `balance_movements_type_check`.
- Verificar RPCs.
- Revisar movimientos duplicados por idempotencia.

Si admin falla:

- Revisar `ADMIN_EMAILS`.
- Revisar `profiles.role = admin`.
- Confirmar usuario con email verificado.

Si Google Maps falla:

- Revisar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Revisar restricciones de HTTP referrer.
- Confirmar Maps JavaScript API y Places API.

Rollback inmediato:

- Apagar `ENABLE_REAL_LABEL_PURCHASE`.
- Apagar `ENABLE_REAL_LABEL_VOID`.
- Revertir deploy staging.
- No usar production/live labels.
- Revisar `/admin/audit` y logs server-side.

## FASE 5.31 — Staging deploy execution handoff

Esta fase prepara la ejecucion real de staging, pero Codex no ejecuta deploy externo ni manipula credenciales de hosting.

### Local pre-deploy ejecutable

Desde `shipflow-web`:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run start
```

Antes de pedir deploy:

```bash
git diff --check
git status --short
```

Confirmar:

- `.env.local` no esta versionado.
- `.env.example` no contiene valores reales.
- `ENABLE_REAL_LABEL_PURCHASE=false`.
- `ENABLE_REAL_LABEL_VOID=false`.
- No hay cambios sin revisar antes del deploy/PR.

### Platform handoff

Configurar el proyecto con root directory `shipflow-web`.

Render/VM/Coolify:

```bash
npm install
npm run build
npm run start
```

Vercel:

- Root directory: `shipflow-web`.
- Build command: `npm run build`.
- Environment variables: usar la lista de staging de este documento.
- No configurar keys live ni pagos reales.

### Supabase staging antes de abrir labels/voids

Ejecutar en Supabase staging el bloque "SQL de verificacion" de esta pagina y confirmar:

- Columnas clave de `shipments`.
- Firma endurecida de `create_label_shipment_transaction`.
- Existencia de `void_label_refund_transaction`.
- Existencia de `audit_logs`.
- Constraint de `balance_movements.type`.
- Admin configurado por `ADMIN_EMAILS` o `profiles.role = admin`.

Si falta algo, detener pruebas de purchase/void y corregir Supabase staging antes de continuar.

### Post-deploy health check 5.31

Con purchase/void apagados:

1. Abrir `/`.
2. Probar `/login` y `/registro`.
3. Abrir `/api/config/status`.
4. Confirmar `labelPurchaseEnabled: false`.
5. Confirmar `labelVoidEnabled: false`.
6. Abrir `/dashboard`.
7. Abrir `/crear-guia`.
8. Cotizar NY -> Mountain View con paquete 1 lb, 6 x 4 x 2 in.
9. Confirmar rates reales sin Dummy/Mock/Internal.
10. Abrir `/envios`, `/tracking`, `/saldo`, `/admin` y `/admin/audit`.
11. Confirmar admin guard para usuario no admin.

### Visual QA staging

Revisar desktop y responsive:

- 390px.
- 430px.
- 768px.
- Desktop.

Rutas:

- `/dashboard`
- `/crear-guia`
- `/envios`
- `/guia/<tracking>`
- `/tracking`
- `/saldo`
- `/admin`
- `/admin/envios`
- `/admin/saldo`
- `/admin/audit`

Confirmar:

- Sin overflow horizontal inesperado.
- Modals caben y tienen scroll interno cuando aplica.
- Rates son tocables.
- Tablas admin tienen scroll o layout usable.
- UI en ingles.
- No aparece Supabase, fallback, demo, raw provider response ni secrets.

### Controlled sandbox tests opcionales

No ejecutar por defecto.

Label sandbox:

1. Activar temporalmente `ENABLE_REAL_LABEL_PURCHASE=true`.
2. Reiniciar staging.
3. Comprar una sola label ShipEngine TEST.
4. Confirmar PDF `SAMPLE`, shipment, tracking, balance debit y audit.
5. Volver a `ENABLE_REAL_LABEL_PURCHASE=false`.

Void sandbox:

1. Solo si existe una label SAMPLE comprada en staging.
2. Activar temporalmente `ENABLE_REAL_LABEL_VOID=true`.
3. Ejecutar void una sola vez.
4. Confirmar `label_status=voided`, `payment_status=refunded`, refund de balance y audit.
5. Volver a `ENABLE_REAL_LABEL_VOID=false`.

## FASE 5.32 — Stripe/payment recharge design

Stripe no esta implementado todavia. Esta seccion define el flujo futuro de recarga de balance.

### Flujo recomendado

1. Usuario autenticado entra a `/saldo`.
2. Hace clic en `Add funds`.
3. Selecciona monto fijo: `$10`, `$25`, `$50` o `$100`.
4. Frontend llama `POST /api/billing/checkout-session`.
5. Backend valida sesion, email verificado, monto permitido, moneda `USD` y limites beta.
6. Backend crea Stripe Checkout Session.
7. Usuario paga en Stripe.
8. Stripe llama `POST /api/webhooks/stripe`.
9. Backend verifica firma con `STRIPE_WEBHOOK_SECRET`.
10. Webhook idempotente crea `balance_movement` tipo `recharge`.
11. Usuario vuelve a `/saldo?recharge=success`.
12. La UI vuelve a leer `/api/balance`; la success URL no acredita saldo.

### Reglas operativas

- El frontend nunca acredita saldo.
- No confiar en `success_url` para acreditar.
- No aceptar `userId` confiable desde cliente.
- Monto y currency se validan server-side.
- Webhook idempotente por `stripe_event_id`, `checkout_session_id` y/o `payment_intent_id`.
- Si Stripe cobro pero DB fallo, registrar evento critico de reconciliacion y no intentar doble credito automatico.
- Recomendacion beta: montos fijos, minimo `$10`, maximo `$500`, sin custom amount al inicio.

### UI futura `/saldo`

`Add funds` abrira modal:

- Titulo: `Choose amount`.
- Opciones: `$10`, `$25`, `$50`, `$100`.
- Texto: `Funds are added after payment confirmation from Stripe.`
- Accion: `Continue to secure checkout`.

Estados:

- Success: `Payment received. Your balance will update once confirmed.`
- Canceled: `Payment canceled. No funds were added.`
- Pending: `Payment is still being confirmed.`

### Variables futuras

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID_10=
STRIPE_PRICE_ID_25=
STRIPE_PRICE_ID_50=
STRIPE_PRICE_ID_100=
```

No usar live keys hasta completar implementacion, webhook, migracion y QA.

## FASE 5.33 — Stripe Checkout sandbox implementation

Stripe Checkout queda implementado para sandbox/test, pero requiere migracion y variables antes de probar.

### Migracion requerida

Aplicar manualmente en Supabase test/staging:

```text
shipflow-web/supabase/migrations/20260519_add_payment_recharges.sql
```

Verificacion:

```sql
select to_regclass('public.payment_recharges') as payment_recharges_table;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payment_recharges'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.payment_recharges'::regclass;
```

### Variables requeridas para test

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

No usar `sk_live` ni `pk_live`.

### Endpoints

- `POST /api/billing/checkout-session`
- `POST /api/webhooks/stripe`

### Prueba sandbox

1. Aplicar migracion en Supabase test/staging.
2. Configurar Stripe test keys y webhook secret.
3. Configurar webhook endpoint en Stripe Dashboard o Stripe CLI apuntando a `/api/webhooks/stripe`.
4. Abrir `/saldo`.
5. Click `Add funds`.
6. Seleccionar `$10`.
7. Completar Checkout con una test card de Stripe.
8. Confirmar que webhook procesa `checkout.session.completed`.
9. Verificar `payment_recharges.status = paid`.
10. Verificar `balance_movements.type = recharge`.
11. Verificar saldo actualizado en `/saldo`.
12. Reenviar el evento desde Stripe y confirmar que no se duplica saldo.

### Reglas de seguridad

- La success URL no acredita saldo.
- El frontend no crea `balance_movements`.
- Si el webhook falla despues de pago confirmado, revisar `/admin/audit` y `payment_recharges` antes de reintentar manualmente.

## FASE 5.34 — Stripe sandbox verification and recharge QA

No usar Stripe live. No aplicar migracion automaticamente desde Codex.

### Stripe CLI local

Instalar/usar Stripe CLI segun el entorno local y luego:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copiar manualmente el `whsec_...` mostrado por Stripe CLI a `STRIPE_WEBHOOK_SECRET` en el entorno local ignorado por Git. No pegarlo en docs, commits ni chats.

En otra terminal:

```bash
cd shipflow-web
npm run dev
```

Abrir:

```text
http://localhost:3000/saldo
```

### Variables test requeridas

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### QA de Checkout

- Usuario sin sesion: debe responder 401/403.
- Usuario sin email verificado: debe bloquearse si Supabase marca email no verificado.
- `amount = 10`, `25`, `50`, `100`: crea Checkout Session.
- `amount = 1`, `500`, string manipulado o valor no numerico: bloqueado.
- Currency no viene del frontend; backend fuerza `usd`.
- Respuesta publica: solo `checkoutUrl`.
- No se crea `balance_movement` en este endpoint.

### QA de Webhook

- Firma invalida: rechazar 400 y registrar `payment_recharge_signature_failed` sin secrets.
- Evento desconocido: responder OK/no-op.
- `checkout.session.completed` con `payment_status = paid`: acreditar saldo.
- `checkout.session.expired`: marcar recarga `canceled` si sigue `pending`.
- `payment_intent.payment_failed`: marcar recarga `failed` si sigue `pending`.
- Amount/currency mismatch: no acreditar y registrar `payment_recharge_amount_mismatch`.
- Session inexistente en DB: no acreditar y registrar `payment_recharge_db_failed`.
- DB failure despues de pago confirmado: registrar critical y devolver 500 para retry Stripe.

### QA de idempotencia

Reenviar el mismo evento desde Stripe Dashboard/CLI:

- No debe crear un segundo `balance_movements`.
- `payment_recharges.balance_movement_id` debe seguir apuntando al mismo movimiento.
- Audit debe registrar `payment_recharge_duplicate_ignored`.

SQL rapido para confirmar:

```sql
select count(*) as recharge_movements, coalesce(sum(amount), 0) as total_recharged
from public.balance_movements
where type = 'recharge'
  and reference_type = 'stripe_checkout'
  and reference_id = '<PAYMENT_INTENT_OR_SESSION_ID>';
```

### Test card

Usar tarjeta Stripe test:

```text
4242 4242 4242 4242
Fecha futura
CVC cualquiera
ZIP cualquiera
```

### Lo que no se debe hacer

- No usar `sk_live` ni `pk_live`.
- No confiar en `/saldo?recharge=success` para acreditar saldo.
- No crear saldo desde frontend.
- No reenviar eventos repetidamente sin revisar idempotencia y audit.

### Resultado sandbox validado

FASE 5.37 confirma una prueba sandbox exitosa ejecutada con humano:

- Stripe Checkout test funciono.
- Stripe CLI recibio eventos.
- `/api/webhooks/stripe` respondio 200.
- Se creo `Payment recharge +$10.00`.
- El saldo subio por `balance_movements type = recharge`.
- La success URL no acredito saldo.
- El webhook verificado fue la fuente de verdad.

Mantener pendiente antes de produccion:

- Refunds de recarga.
- Disputes/chargebacks.
- Balance reversal.
- Reconciliation workflow formal para pagos.

## FASE 5.35 — Controlled Stripe sandbox test

Codex no debe ejecutar pagos ni leer `.env.local`. Esta prueba requiere accion del humano.

### Gate antes de Checkout

No iniciar Checkout hasta confirmar:

1. Migracion `20260519_add_payment_recharges.sql` aplicada en Supabase test/staging.
2. Variables test configuradas manualmente:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
3. `npm run dev` corriendo.
4. Stripe CLI escuchando:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

5. `/api/config/status` devuelve:

```json
{
  "stripeRechargeConfigured": true,
  "stripeRechargeEnabled": true
}
```

Si alguno es `false`, detenerse y revisar configuracion sin imprimir valores.

### SQL antes de pagar

```sql
select to_regclass('public.payment_recharges') as payment_recharges_table;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.payment_recharges'::regclass
order by conname;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.balance_movements'::regclass
  and conname = 'balance_movements_type_check';
```

### Test $10

1. Abrir `/saldo`.
2. Click `Add funds`.
3. Seleccionar `$10`.
4. Completar Stripe Checkout con test card `4242 4242 4242 4242`.
5. Esperar webhook `checkout.session.completed`.
6. Volver a `/saldo?recharge=success`.

La success URL solo muestra mensaje; el saldo sube solo por webhook.

### SQL despues del pago

```sql
select id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
       stripe_event_id, amount, currency, status, balance_movement_id,
       created_at, updated_at
from public.payment_recharges
order by created_at desc
limit 5;

select id, user_id, concept, amount, type, reference_type,
       reference_id, idempotency_key, created_at
from public.balance_movements
where type = 'recharge'
order by created_at desc
limit 5;

select coalesce(sum(amount), 0) as available_balance
from public.balance_movements
where user_id = '<USER_ID>';
```

Esperado:

- `payment_recharges.status = paid`.
- `amount = 10`.
- `currency = usd`.
- Stripe session, payment intent, event y balance movement no null.
- Un solo `balance_movements` con `type = recharge`, `concept = Payment recharge`, `amount = 10`.

### Duplicado/idempotencia

Reenviar el mismo evento desde Stripe Dashboard/CLI.

Verificar:

```sql
select count(*) as movement_count, coalesce(sum(amount), 0) as total_amount
from public.balance_movements
where type = 'recharge'
  and reference_type = 'stripe_checkout'
  and reference_id = '<PAYMENT_INTENT_OR_SESSION_ID>';
```

Esperado:

- `movement_count = 1`.
- `total_amount = 10`.
- Audit registra `payment_recharge_duplicate_ignored` o maneja el reenvio como idempotente seguro.

## Consideraciones de produccion

Antes de produccion:

- Corregir RLS.
- Mover operaciones sensibles al backend.
- Agregar rate limiting.
- Agregar logs/auditoria.
- Validar webhooks.
- Separar variables publicas y privadas.

## FASE 5.38 — Stripe refunds, disputes y reversals: notas de produccion

Antes de activar Stripe live, ademas de los checks anteriores, confirmar:

Migraciones pendientes para refunds/disputes:

```sql
-- 1. Ampliar payment_recharges.status para disputes
ALTER TABLE public.payment_recharges
  DROP CONSTRAINT IF EXISTS payment_recharges_status_check;
ALTER TABLE public.payment_recharges
  ADD CONSTRAINT payment_recharges_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'canceled', 'refunded',
                    'disputed', 'dispute_won', 'dispute_lost'));

-- 2. Crear payment_reversals (ver DATABASE.md para schema completo)
-- 3. Agregar profiles.account_status para bloqueo por dispute
```

No aplicar estas migraciones hasta que los handlers de webhook esten implementados y probados en sandbox.

Webhook events que deben estar implementados antes de live:

- `charge.refunded` — refund de recarga
- `charge.dispute.created` — hold de saldo
- `charge.dispute.closed` — cierre de dispute (won/lost)

QA de refunds antes de live:

```bash
# Crear refund de prueba con Stripe CLI
stripe refunds create --payment-intent pi_... --amount 1000

# Reenviar evento para probar idempotencia
stripe events resend evt_...
```

Verificar post-refund en Supabase:

```sql
-- Un solo balance_movement de adjustment negativo
select id, concept, amount, type, idempotency_key, metadata
from public.balance_movements
where user_id = '<user_id>'
  and type = 'adjustment'
order by created_at desc
limit 5;

-- payment_recharges actualizado a refunded
select id, status, metadata
from public.payment_recharges
where user_id = '<user_id>'
order by created_at desc
limit 5;

-- audit event registrado
select action, metadata
from public.audit_logs
where action like 'payment_refund%'
order by created_at desc
limit 5;
```

Politica de negative balance en produccion:

- Si `GET /api/balance` devuelve `availableBalance < 0`: bloquear `/api/labels` con 402.
- Si se registra `payment_negative_balance_created`: notificar al equipo de soporte.
- No restaurar balance negativo automaticamente; requiere decision admin documentada.
- Todo ajuste admin post-dispute debe tener `reason` obligatorio y quedar en audit.
- No habilitar dinero real hasta que balance sea seguro.

## FASE 5.38A — Auth session, email verification y wrong-user state

### Problema corregido

Despues del deploy Docker en la VM, la app cargaba en https://shipflow.appsolux.com pero mostraba sesion equivocada, no enviaba correos de verificacion y la pagina `/verifica-tu-correo` redireccionaba prematuramente a `/login`.

Causas encontradas:

1. Variables `NEXT_PUBLIC_*` se hornean en el build Docker. Si el build usaba `.env.local` de desarrollo (con URL/key de un proyecto Supabase diferente), produccion apuntaba al proyecto equivocado.
2. `signUp()` y `resend()` no pasaban `emailRedirectTo`. Supabase usaba el Site URL del dashboard, que puede ser `localhost`.
3. `/verifica-tu-correo` llamaba `supabase.auth.getUser()` directamente. Al llegar desde el link de verificacion con `?code=`, el exchange PKCE estaba en vuelo y `getUser()` retornaba null, causando redirect a `/login`.
4. `AuthContext` usaba `window.setTimeout` + `onAuthStateChange` en modo Supabase — doble llamada con race condition; `setLoading(false)` nunca se llamaba desde `onAuthStateChange`.
5. `ProtectedRoute` solo revisaba si `user` existia, no `emailVerified` — usuario sin verificar podia entrar al dashboard y recibir 403 en las APIs.
6. `AuthCard` redireccionaba al dashboard sin revisar `emailVerified`.
7. `shipments/create` usaba `requireSupabaseUser` en lugar de `requireVerifiedUser`.

### Variables criticas para deploy correcto

Estas variables deben estar correctas en el servidor antes de hacer el build Docker:

```text
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://shipflow.appsolux.com
```

IMPORTANTE: `NEXT_PUBLIC_*` se hornean en tiempo de build. Un cambio en el servidor no tiene efecto hasta reconstruir el contenedor. El contenedor debe construirse con las variables correctas del entorno de produccion.

Para sendiflash.com:

```text
NEXT_PUBLIC_APP_URL=https://sendiflash.com
```

### Supabase Auth — configuracion requerida

En Supabase Dashboard > Authentication > URL Configuration:

**Site URL** (elegir uno):
```
https://sendiflash.com
```

**Redirect URLs permitidas** (agregar todas):
```
https://sendiflash.com
https://sendiflash.com/login
https://sendiflash.com/dashboard
https://sendiflash.com/verifica-tu-correo
https://shipflow.appsolux.com
https://shipflow.appsolux.com/login
https://shipflow.appsolux.com/dashboard
https://shipflow.appsolux.com/verifica-tu-correo
http://localhost:3000
http://localhost:3000/verifica-tu-correo
```

Sin estas entradas, Supabase rechaza el redirect del link de verificacion y el login OAuth falla.

### SMTP — configuracion requerida

Sin SMTP configurado, Supabase usa su servidor interno con rate limit muy bajo. Los correos de verificacion no llegan o tardan.

Configurar en Supabase Dashboard > Authentication > Email:

- **Custom SMTP**: habilitado
- **Sender name**: ShipFlow (o Sendiflash)
- **Sender email**: `no-reply@sendiflash.com`
- **SMTP Host**: `smtp.resend.com`
- **SMTP Port**: `465`
- **Username**: `resend`
- **Password**: API key de Resend (no exponerla en docs ni commits)

Con Resend:
1. Crear cuenta en resend.com
2. Verificar el dominio `sendiflash.com`
3. Generar API key
4. Configurarla como Password en Supabase Custom SMTP

### Confirmacion manual de usuario en beta (sin SMTP)

Mientras SMTP no este listo, el equipo puede confirmar usuarios manualmente:

1. Ir a Supabase Dashboard > Authentication > Users.
2. Buscar el usuario por email.
3. Hacer clic en el usuario.
4. Hacer clic en "Send magic link" o editar directamente el campo `email_confirmed_at`.
5. El usuario ya puede iniciar sesion sin verificar por correo.

Alternativa via SQL:

```sql
-- Solo para beta/testing controlado. No usar en produccion con usuarios reales.
update auth.users
set email_confirmed_at = now()
where email = 'usuario@ejemplo.com';
```

### Flujo de auth corregido

Despues de FASE 5.38A:

1. **Register**: crea usuario en Supabase, `emailRedirectTo` apunta a `NEXT_PUBLIC_APP_URL/verifica-tu-correo`. Redirige a `/verifica-tu-correo`.
2. **Email de verificacion**: el link contiene `?code=XXXX`. El cliente Supabase lo detecta automaticamente con `detectSessionInUrl: true`.
3. **/verifica-tu-correo**: si `?code=` esta presente, espera el exchange PKCE via `onAuthStateChange` en lugar de llamar `getUser()` inmediatamente. Si `?error=`, muestra mensaje. Permite resend y sign-out.
4. **Login**: si `emailVerified = false`, redirige a `/verifica-tu-correo`. Si `emailVerified = true`, redirige al dashboard.
5. **ProtectedRoute**: si `user` existe pero `emailVerified = false`, redirige a `/verifica-tu-correo`.
6. **Logout**: llama `supabase.auth.signOut()`, limpia estado React y redirige a `/login`.
7. **APIs**: todas las rutas sensibles usan `requireVerifiedUser()` server-side.

### Health check post-deploy 5.38A

Sin SMTP activo, confirmar usuario manualmente y luego:

1. Abrir `https://shipflow.appsolux.com/` o `https://sendiflash.com/`.
2. Cerrar sesion.
3. Crear cuenta nueva.
4. Confirmar que aparece `/verifica-tu-correo` con el email correcto.
5. Confirmar usuario manualmente desde Supabase Dashboard.
6. Hacer clic en "I already verified my email".
7. Confirmar redirect a `/dashboard` con el usuario correcto.
8. Abrir `/api/config/status` y confirmar `labelPurchaseEnabled: false`.
9. Navegar a `/saldo` y confirmar balance del usuario correcto.
10. Cerrar sesion, confirmar redirect a `/login` y limpieza de estado.
