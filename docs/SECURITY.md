# Seguridad ShipFlow

## Estado actual

ShipFlow usa Supabase Auth y Supabase RLS como principal barrera de seguridad. La app web protege rutas con componentes client-side y mobile muestra pantallas segun el estado de sesion.

Esto es suficiente para prototipo, pero no es suficiente para produccion con dinero real, labels reales o API keys de proveedores logisticos.

## Riesgos criticos actuales y estado FASE 1A

### Escalacion de rol/admin

Riesgo original: la policy `profiles_update_own` permitia que un usuario actualizara su propio perfil completo. Si no se restringia el campo `role`, un usuario podia cambiar su rol a `admin`.

Riesgo:

- Acceso a datos de otros usuarios.
- Manipulacion de couriers/tarifas.
- Acceso a vistas admin.

Estado FASE 1A:

- Se preparo en `schema.sql` un trigger `protect_profile_admin_fields` que impide a usuarios normales cambiar `role`, `id`, `created_at` y email.
- `profiles_insert_own` queda restringida a inserts propios con `role = user`.
- Se agrego policy `profiles_update_admin` para permitir gestion admin controlada por `is_admin()`.
- Pendiente: aplicar estos cambios mediante migracion controlada en Supabase.

### Balance manipulable

Riesgo original: la policy `balance_movements_insert_own` permitia insertar movimientos propios. Como el balance es la suma de movimientos, un usuario podia insertar montos positivos sin pago real.

Riesgo:

- Saldo falso.
- Emision futura de labels sin cobro real.
- Descuadres financieros.

Estado FASE 1A:

- Se reemplazo la policy por `balance_movements_insert_negative_own`.
- Temporalmente solo se permiten movimientos negativos propios desde cliente para mantener compatibilidad con la creacion interna de guias.
- Recargas positivas desde cliente quedan bloqueadas.
- Pendiente: mover todo balance a backend transaccional en FASE 1B/2.

### Operaciones sensibles desde cliente

Estado FASE 1B:

- Web ya crea guias internas mediante `POST /api/shipments/create` cuando Supabase esta activo.
- El endpoint valida token Bearer de Supabase, recalcula tarifa, valida saldo y crea los registros sensibles desde servidor.
- El fallback `localStorage` sigue existiendo solo para modo demo/desarrollo cuando Supabase no esta configurado.

Pendiente: mobile todavia puede insertar directamente:

- `shipments`
- `balance_movements`
- `tracking_events`

Riesgo pendiente:

- Precios manipulados.
- Envios falsos.
- Tracking falso.
- Balance alterado.
- Falta de control transaccional.

### Falta de transacciones atomicas

Crear guia web ahora pasa por backend, pero el endpoint inserta shipment, tracking event y balance movement como operaciones secuenciales con Supabase JS.

Riesgo pendiente:

- Shipment creado sin descuento.
- Balance descontado sin shipment valido.
- Tracking event incompleto.

Pendiente:

- Crear una funcion SQL/RPC transaccional o una capa backend con rollback controlado.
- Agregar idempotencia persistida antes de labels reales.

### Endpoint tracking publico

`POST /api/tracking` no valida sesion ni aplica rate limit.

Riesgo:

- Abuso del endpoint.
- Consumo de cuotas de carriers.
- Exposicion indirecta de integraciones externas.

Estado FASE 2:

- Si `POST /api/tracking` recibe Bearer token, valida la sesion con Supabase.
- Para no romper web/mobile actuales, sigue permitiendo llamadas sin token.
- Ahora valida carrier contra lista permitida: USPS, UPS, FedEx y DHL.
- Sigue pendiente rate limiting real.

## Reglas de secretos

- Nada sensible en `NEXT_PUBLIC_*`.
- Nada sensible en `EXPO_PUBLIC_*`.
- API keys de ShipStation, Shippo, EasyPost, ShipEngine o carriers directos deben vivir solo en servidor.
- No guardar secretos reales en el repo.
- No usar `service_role` en frontend ni mobile.
- Si se usa service role en backend futuro, limitarlo a rutas server-side y auditar operaciones.

Archivos de ejemplo:

- `shipflow-web/.env.example` contiene nombres de variables y placeholders vacios para web/backend.
- `shipflow-mobile/.env.example` contiene solo variables publicas Expo.
- Para desarrollo local, copiar a archivos ignorados:

```bash
cp shipflow-web/.env.example shipflow-web/.env.local
cp shipflow-mobile/.env.example shipflow-mobile/.env
```

Reglas especificas:

- `SUPABASE_SERVICE_ROLE_KEY`, `SHIPSTATION_API_KEY`, `SHIPSTATION_API_SECRET`, carrier keys, secretos internos y secretos de pagos/webhooks son solo backend/servidor.
- ShipStation nunca debe configurarse en mobile ni con `NEXT_PUBLIC_*` o `EXPO_PUBLIC_*`.
- En Docker/VM, las variables reales deben estar en `.env` del servidor o secrets de infraestructura, no en GitHub.

## RLS recomendado

Principios:

- Usuarios pueden leer sus propios datos.
- Usuarios no deben poder modificar su `role`.
- Balance debe ser append-only desde backend autorizado, no desde cliente.
- Labels y shipments reales deben ser creados por backend.
- Admin debe estar controlado por roles que el usuario no pueda autoasignarse.
- Tracking events de proveedor deben venir de backend/webhooks validados.

Acciones futuras para FASE 1:

- Aplicar la migracion FASE 1A en Supabase.
- Verificar que usuarios normales no puedan cambiar `role`.
- Verificar que usuarios normales no puedan insertar movimientos positivos.
- Definir tipos de movimientos de balance.
- Agregar referencias a shipment/payment donde aplique.
- Revisar policies de `tracking_events`.
- Revisar policies de `shipments`.

## Backend obligatorio para labels, balance y pagos

Antes de conectar ShipStation:

- Crear label interna web ya empieza a ocurrir en backend con `POST /api/labels`; `POST /api/shipments/create` queda como compatibilidad.
- El backend debe validar sesion.
- El backend debe calcular precio final.
- El backend debe validar saldo o pago.
- Pendiente: el backend debe crear registros en una transaccion real.
- El backend debe llamar al proveedor logistico.
- El backend debe guardar provider IDs y label URL.

## Idempotencia

Crear labels reales debe usar `idempotency_key`.

Objetivo:

- Evitar labels duplicadas por reintentos.
- Evitar doble cobro de balance.
- Permitir reintentos seguros ante errores de red.

Estado FASE 1C:

- La migracion agrega `idempotency_key` en `shipments` y `balance_movements`.
- `shipments` tiene un indice unico parcial por `user_id + idempotency_key`.
- `POST /api/shipments/create` acepta/genera `idempotencyKey` y devuelve el shipment existente si la columna ya existe y la key coincide.
- Si la migracion no esta aplicada, el endpoint mantiene compatibilidad legacy y la idempotencia persistida queda pendiente.

## Rate limiting

Endpoints futuros sensibles deben tener rate limiting:

- `/api/tracking`
- `/api/rates`
- `/api/labels`
- `/api/labels/[id]/void`
- `/api/webhooks/*`

## Webhooks seguros

Webhooks de ShipStation/proveedores deben:

- Validar firma o secreto compartido.
- Guardar payload original en `webhook_events`.
- Ser idempotentes.
- No confiar ciegamente en datos externos.
- Actualizar estados de forma controlada.

Estado FASE 1C:

- La migracion crea `webhook_events` para guardar payloads y estado de procesamiento.
- Usuarios normales no leen `webhook_events`; admin puede leer via `is_admin()`.
- Aun no existe endpoint webhook ni validacion de firma porque ShipStation sigue pendiente.

## Que corregir en FASE 1

Prioridad:

1. FASE 1A preparada en SQL: bloquear escalacion de `role`.
2. FASE 1A preparada en SQL: bloquear recargas positivas directas desde cliente.
3. FASE 1B preparada en web: crear guia interna se mueve a endpoint backend.
4. Aplicar y probar la migracion FASE 1A en Supabase.
5. Crear transaccion SQL/RPC para shipment + tracking + balance.
6. Agregar campos/estructura para idempotencia y provider IDs.
7. Revisar RLS de `shipments`, `tracking_events` y `couriers`.
8. Documentar variables privadas y publicas.
9. Preparar base para endpoints seguros de FASE 2.

## Notas de compatibilidad FASE 1A

- La app actual puede seguir creando guias internas porque aun se permiten movimientos negativos propios.
- La accion de recargar saldo desde cliente/Supabase ya no debe considerarse soportada para entornos con estas policies.
- Balance real sigue pendiente y no debe usarse con dinero real.
- ShipStation no debe conectarse hasta completar seguridad/base/API.

## Notas de compatibilidad FASE 1B

- La creacion web con Supabase activo requiere sesion valida.
- El endpoint bloquea la creacion si el saldo calculado desde `balance_movements` es insuficiente.
- El precio enviado por frontend no es confiable; el backend recalcula con couriers activos.
- No se agrego `SUPABASE_SERVICE_ROLE_KEY`; el endpoint usa anon key publica del servidor mas token Bearer del usuario para respetar RLS.
- El flujo todavia no compra labels reales.

## Notas FASE 1C

- Se preparo la base para pricing real: `provider_cost`, `platform_markup`, `customer_price` y `currency`.
- Se preparo auditoria con `audit_logs`.
- No se preparo RPC transaccional en esta fase; queda recomendado para FASE 1D/2.
- ShipStation no debe conectarse hasta aplicar/verificar la migracion y completar el backend transaccional.

## Notas FASE 1D

- La migracion `20260514_shipflow_security_logistics_foundation.sql` fue revisada para aplicacion manual.
- Se agrego `docs/MIGRATION_1D_CHECKLIST.md` con pasos de backup, aplicacion y pruebas.
- La migracion activa RLS en tablas existentes y recrea policies principales esperadas.
- Usuarios normales no deben poder cambiar `role`, insertar saldo positivo, leer `webhook_events` ni leer `audit_logs`.
- Las policies `shipments_insert_own`, `shipments_update_own` y `tracking_events_insert_own` siguen siendo temporales por compatibilidad, especialmente hasta migrar mobile al backend seguro.
- La migracion no fue ejecutada por Codex. Debe aplicarse manualmente en Supabase despues de backup/snapshot.
- La RPC transaccional sigue pendiente; no usar dinero real ni labels reales hasta completarla.

## Notas FASE 2

- Se agregaron endpoints backend autenticados para shipments, rates, labels y balance.
- `POST /api/rates` y `POST /api/labels` recalculan precios server-side con logica interna/mock.
- `GET /api/balance` solo lee balance; no existe endpoint de recarga.
- `POST /api/labels/[id]/void` no hace refund real ni void externo.
- La logica compartida vive en `lib/server/shipments/createInternalShipment.ts`.
- No se uso `SUPABASE_SERVICE_ROLE_KEY`; las rutas usan anon key server-side mas Bearer token para respetar RLS.
- Riesgo pendiente: `POST /api/labels` todavia no es transaccional por RPC.
- Riesgo pendiente: mobile sigue con operaciones sensibles directas hasta FASE 6.

## Notas FASE 4B

- `POST /api/labels` con `provider: "shipstation"` compra labels reales en ShipStation si las credenciales estan configuradas. No usar en produccion hasta aplicar la RPC atomica.
- La validacion de saldo se hace antes de llamar a ShipStation. Si el saldo es insuficiente, se devuelve error 402 sin comprar.
- Si ShipStation compra el label pero la persistencia falla, se devuelve un error 500 critico con el tracking number y provider IDs para recuperacion manual. Esto es una deuda tecnica hasta activar la RPC.
- Los inserts de shipment, tracking_event y balance_movement son secuenciales. Una falla en el balance_movement insert significa que el usuario tiene un label sin cobro (error critico).
- La idempotencia funciona a dos niveles: (1) Supabase: si existe shipment con mismo user_id+idempotency_key y label_status=purchased, se devuelve el existente. (2) ShipStation: el orderKey = idempotencyKey, por lo que ShipStation actualiza la orden existente si se repite.
- El `serviceCode` debe venir de una llamada previa a `/api/rates` con ShipStation. No se puede crear una label sin el serviceCode.
- `labelUrl` siempre es null para ShipStation V1 (devuelve base64 `labelData`, no URL).
- NO usar con dinero real hasta activar la RPC `create_label_shipment_transaction` y verificar con pruebas manuales.
- La RPC preparada en `migrations/20260514_create_label_transaction_rpc.sql` solo puede ser ejecutada por `service_role`. Requiere `SUPABASE_SERVICE_ROLE_KEY` en el backend para activarla.
