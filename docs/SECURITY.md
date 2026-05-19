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
- ShipEngine/ShipStation sandbox usa `SHIPSTATION_API_MODE=shipengine` y header server-side `API-Key`; esta key nunca debe exponerse en `NEXT_PUBLIC_*`.

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

Estado FASE 5:

- `POST /api/webhooks/shipstation` implementado.
- Valida secreto en tiempo constante (anti-timing-attack) contra `SHIPSTATION_WEBHOOK_SECRET`.
- Acepta secreto por header `x-shipflow-webhook-secret` (preferido, no loggeado por Nginx por defecto) o query `?secret=` (compatible con ShipStation V1 que no soporta headers personalizados).
- Usa `SUPABASE_SERVICE_ROLE_KEY` para todas las operaciones de DB (bypass RLS controlado).
- Si `SUPABASE_SERVICE_ROLE_KEY` no esta configurado, devuelve 200 sin persistir (evita retries infinitos de ShipStation) y loguea el error en servidor.
- El payload almacenado en `webhook_events` no incluye `resource_url` (podria contener secretos en query params de SS).
- No se loguea el payload completo ni el secreto en ningun nivel.
- El `event_id` es SHA-256 de `provider:resource_type:resource_url` — opaco, no revela datos del proveedor.

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

- `POST /api/labels` con `provider: "shipstation"` compra labels reales en ShipStation si las credenciales estan configuradas.
- La validacion de saldo se hace antes de llamar a ShipStation. Si el saldo es insuficiente, se devuelve error 402 sin comprar.
- Los inserts de shipment, tracking_event y balance_movement eran secuenciales en FASE 4B. Reemplazados por RPC atomica en FASE 4D.

## Notas FASE 4E

- FASE 4E no modifica codigo ni RLS. Prepara el proceso seguro de aplicacion y prueba.
- Checklist de prueba real: `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`.
- Incluye verificacion de permisos de RPCs (solo `service_role` debe tener EXECUTE).
- Incluye verificacion de tipo de `balance_movements.id` antes de aplicar migracion RPC.
- No usar con dinero real hasta completar el checklist completo y verificar todos los pasos.
- FASE 5 (webhooks) viene despues del checklist de FASE 4E.

## Notas FASE 5

- `POST /api/webhooks/shipstation` no requiere Bearer token de usuario — es un endpoint publico con secreto compartido.
- `SHIPSTATION_WEBHOOK_SECRET` debe generarse con `openssl rand -hex 32` y mantenerse solo en el servidor. No commitearlo.
- La URL del webhook en ShipStation contiene el secreto en query param; tratar como secreto de API.
- Si se usa un proxy (Nginx, Cloudflare Worker) se puede inyectar el secreto como header en lugar de query param.
- Todos los writes a `webhook_events`, `shipments` y `tracking_events` desde webhooks usan service_role (no el cliente del usuario).
- La deduplicacion previene que un mismo evento de ShipStation actualice el shipment y el tracking mas de una vez.
- El endpoint devuelve 200 para eventos duplicados o sin shipment relacionado — esto es intencional para que ShipStation no reintente innecesariamente.
- No se insertan `balance_movements` desde webhooks. Los refunds solo ocurren via `POST /api/labels/[id]/void` con confirmacion del operador.

## Notas FASE 5.23 — Balance y recargas

- `GET /api/balance` permanece como endpoint autenticado de solo lectura; filtra por usuario y no devuelve movimientos de otras cuentas.
- No existe endpoint publico de recarga. `Add funds` en UI solo muestra un mensaje de beta y no crea `balance_movements`.
- Las recargas positivas desde cliente siguen bloqueadas por RLS/policies; un usuario no debe poder autoacreditar saldo.
- Modelo de ledger:
  - `recharge`: amount positivo, solo futuro webhook de pago confirmado o top-up manual controlado en sandbox.
  - `debit`: amount negativo, compra de label.
  - `refund`: amount positivo, void confirmado por provider.
  - `adjustment`: correccion manual/admin con permisos fuertes.
  - `fee`: cargo separado si se modela fuera del precio final.
- Stripe futuro:
  - El frontend nunca acredita balance por una pantalla de exito.
  - Solo un webhook verificado debe crear `balance_movement` tipo `recharge`.
  - La idempotencia debe usar Stripe event id/payment intent id.
  - Si pago confirma pero DB falla, se requiere reconciliacion operativa antes de permitir doble credito.
- FASE 5.24 debe definir panel admin/support para ajustes manuales, auditoria y permisos de operadores.

## Notas FASE 5.24 — Admin support panel

- El panel admin ya no depende solo del guard de frontend.
- Endpoints protegidos:
  - `GET /api/admin/access`
  - `GET /api/admin/overview`
  - `GET /api/admin/shipments`
  - `GET /api/admin/balance-movements`
- Cada endpoint valida:
  1. Bearer token valido.
  2. Email verificado.
  3. Admin server-side por `profiles.role = 'admin'` o allowlist temporal `ADMIN_EMAILS`.
  4. Solo despues crea cliente `service_role` para lecturas cross-user.
- `ADMIN_EMAILS` es server-side, nunca `NEXT_PUBLIC`, y solo debe usarse como fallback temporal de beta.
- Los endpoints admin no devuelven secrets, service role, raw provider responses ni metadata sensible.
- El panel es read-only durante beta:
  - No compra labels.
  - No ejecuta void.
  - No crea recargas.
  - No permite manual adjustments todavia.
- La seccion de couriers se muestra read-only para evitar cambios de pricing/catalogo desde soporte beta.
- Futuro recomendado: RBAC formal en DB, audit logs persistentes, permisos por accion y reconciliation queue.

## Notas FASE 5.25 — Manual balance adjustments

- `POST /api/admin/balance-adjustments` es una accion admin beta, no una recarga de pago.
- Requiere Bearer token, email verificado y admin server-side (`profiles.role = admin` o `ADMIN_EMAILS` temporal).
- El endpoint usa `service_role` solo despues del guard admin.
- Validaciones:
  - usuario destino debe existir.
  - `amount` debe ser distinto de cero.
  - limite absoluto beta: `$500`.
  - `reason` obligatorio.
  - `note` opcional con longitud limitada.
  - ajuste negativo no puede dejar saldo final bajo cero.
- Idempotencia:
  - `idempotency_key = admin-adjustment:<key>`.
  - Si llega la misma key para el mismo usuario, devuelve el movimiento existente y no duplica saldo.
- Auditoria basica:
  - `created_by` guarda el admin user id.
  - `metadata` guarda `adminUserId`, `adminEmail`, `reason`, `note`, `createdFrom`, timestamp, balance before y balance after.
- La UI normal de usuario no muestra metadata/admin details; solo muestra `Manual adjustment`.
- Pendiente: `audit_logs` formal, RBAC granular por accion, aprobaciones para ajustes grandes y reconciliation queue persistente.

## Notas FASE 5.26 — Audit/reconciliation foundation

- Se usa `audit_logs` existente; no se agrego migracion.
- Helper server-side: `lib/server/auditLog.ts`.
- El helper sanitiza metadata:
  - redacta keys con nombres sensibles (`secret`, `token`, `key`, `authorization`, `password`, `service_role`).
  - trunca strings largos.
  - limita profundidad de objetos/arrays.
- Eventos registrados:
  - label purchase started/succeeded/failed.
  - label purchase DB persist failed con severity `critical`.
  - label URL missing.
  - void started/succeeded/failed.
  - void refund failed con severity `critical`.
  - manual adjustment created/rejected.
  - idempotency conflicts.
  - admin access denied.
- La UI admin de auditoria es read-only y protegida por admin guard server-side.
- No se guardan raw provider responses completos ni secrets.
- Si audit logging falla, no rompe el flujo principal; se registra error sanitizado server-side.
- Pendiente: reconciliation queue formal con estados, asignacion, resolucion y auditoria de cierre.

## Notas FASE 4D

- `createShipStationShipment.ts` ahora verifica `SUPABASE_SERVICE_ROLE_KEY` ANTES de comprar el label. Si no esta configurado, retorna 503 sin comprar nada.
- La persistencia usa `create_label_shipment_transaction` RPC via cliente service_role. No hay fallback a inserts secuenciales para provider shipstation.
- Si la RPC no existe (migration no aplicada) y el label ya fue comprado: se devuelve error 500 critico con recovery info (trackingNumber, providerShipmentId, actualCost). Operador debe resolver manualmente y aplicar la migration.
- `labelData` (base64 PDF de ShipStation V1) se devuelve en la respuesta inmediata. No se guarda en la DB. El cliente debe guardarlo de inmediato para impresion; no es recuperable en reintentos idempotentes.
- La idempotencia funciona a dos niveles: (1) Supabase pre-check via `idempotency_key`; (2) ShipStation `orderKey = idempotencyKey`. Si la RPC retorna `existing`, se devuelve el shipment guardado con `labelData: null`.
- Void de labels ShipStation: se llama SS void PRIMERO, luego RPC `void_label_refund_transaction` para atomicamente actualizar `label_status = voided` y crear `balance_movement` tipo `refund` con amount positivo.
- Si SS void falla: no se modifica el balance.
- Si SS void tiene exito pero la RPC falla: se actualiza `label_status = voided` via cliente de usuario como fallback minimo, pero se retorna error 500 para que el operador investigue.
- `void_label_refund_transaction` es idempotente: si ya existe un movement de tipo `refund` para el shipment, no duplica.
- `SUPABASE_SERVICE_ROLE_KEY` es una clave muy sensible. Solo debe existir en el entorno del servidor. Nunca en variables `NEXT_PUBLIC_*` ni en el cliente.
- Las dos RPCs (`create_label_shipment_transaction`, `void_label_refund_transaction`) son `SECURITY DEFINER` y solo ejecutables por `service_role`. Nunca desde el cliente.
- NO usar con dinero real hasta aplicar la migration `20260514_create_label_transaction_rpc.sql` y verificar con pruebas manuales completas.

## Verificación de email (FASE 5.13)

Usuarios no verificados (sin `email_confirmed_at` en Supabase Auth) no pueden acceder a ningún endpoint sensible.

**Regla:** `requireVerifiedUser(request)` en `lib/server/supabaseServer.ts` chequea `user.email_confirmed_at` tras validar el JWT. Si el campo no existe, responde 403 con `error: "EMAIL_NOT_VERIFIED"`.

**Endpoints protegidos:** `/api/rates`, `/api/labels`, `/api/labels/[id]/void`, `/api/balance`, `/api/shipments`, `/api/shipments/[id]`.

**Endpoints NO protegidos por verificación de email:**
- `/api/config/status` — público, sin auth.
- `/api/tracking` — consulta de tracking, sin auth requerida.
- `/api/webhooks/shipstation` — autenticado por HMAC, no por JWT.

**UI:** `CreateGuideForm` bloquea el formulario si `!emailVerified`. `AuthCard` redirige a `/verifica-tu-correo` al detectar usuario no verificado. La página de verificación permite reenvío de email con rate limit amigable.

**Configuración en Supabase:**
- Dashboard > Authentication > Providers > Email > "Confirm email": activar en producción.
- Si está desactivado (desarrollo): todos los usuarios quedan verificados inmediatamente.
- Nunca activar "Auto Confirm" en producción.

## Notas FASE 5.17

- `/api/rates`, `/api/labels`, `/api/balance`, `/api/shipments` y `/api/shipments/[id]` siguen protegidos por `requireVerifiedUser`.
- `/api/config/status` sigue siendo público, pero solo devuelve booleans/counts.
- El cliente no muestra nombres internos de integraciones ni secrets.
- Antes de comprar una guía, `createShipStationShipment` valida saldo y rechaza payloads donde `expectedCost < providerCost`.
- `labelData` solo se mantiene en memoria para descarga inmediata; no se guarda en localStorage.

## Notas FASE 5.20B — Guard de labels reales

- La compra/generación real de labels queda bloqueada por defecto con `ENABLE_REAL_LABEL_PURCHASE`.
- Si `ENABLE_REAL_LABEL_PURCHASE !== "true"`, `/api/labels` responde `403` antes de parsear body, llamar providers, descontar balance o crear shipments.
- No usar `ENABLE_REAL_LABEL_PURCHASE=true` en local/servidor hasta implementar y probar una fase explicita de labels reales.
- El primer provider objetivo sera ShipEngine. En modo `SHIPSTATION_API_MODE=shipengine`, `ShipEngineLabelAdapter` aun es stub y falla de forma controlada.
- Shippo y Easyship siguen rates-only; no deben poder comprar labels ni hacer void.
- El backend debe revalidar rate/precio/saldo antes de comprar labels. El frontend solo envia una seleccion/snapshot, no una fuente confiable de precio.
- Void/refund solo debe ejecutarse si existe un label real `label_status = purchased` y el provider soporta void confirmado.

## Notas FASE 5.20C — Compra sandbox ShipEngine

- El guard `ENABLE_REAL_LABEL_PURCHASE` permanece obligatorio y se evalua antes de cualquier compra.
- El unico flujo habilitable es ShipEngine sandbox (`SHIPSTATION_API_MODE=shipengine`).
- ShipStation V1 legacy queda bloqueado para evitar compras accidentales fuera del provider objetivo.
- Antes de comprar, el backend reconsulta ShipEngine rates y selecciona un rate compatible. Si no hay match seguro, responde 409 y no compra.
- El balance se valida con pricing calculado en servidor. Si ShipEngine falla, no se descuenta.
- Si ShipEngine compra pero la RPC falla, se retorna error critico con informacion de recuperacion sanitizada. No se exponen tokens.
- Limitacion original de 5.20C: `provider_rate_id` y `label_url` se actualizaban despues de la RPC por limitacion de la firma. FASE 5.20D preparo la migracion para persistirlos dentro de la transaccion.

## Notas FASE 5.20D — Persistencia atomica antes de prueba sandbox

- Se preparo la migracion `20260517_harden_label_transaction_rpc.sql`, pero no se ejecuto.
- La RPC endurecida recibe `p_provider_rate_id`, `p_label_url`, `p_label_status` y `p_payment_status`.
- El backend hace un preflight de la RPC con esos parametros antes de llamar ShipEngine. Si la migracion no esta aplicada, responde 503 sin comprar label.
- La compra ShipEngine ya no depende de un update posterior para `provider_rate_id` o `label_url`; esos campos deben persistirse dentro de la RPC.
- Si existe un `idempotency_key` con shipment `purchased`, se devuelve existente. Si existe un estado incompleto, se bloquea con 409 para evitar doble compra.
- Si ShipEngine compra pero la DB/RPC falla, se registra un log server-side sanitizado con `requestId` y datos de reconciliacion no sensibles. La respuesta al usuario no incluye raw provider response.
- Void/refund ShipEngine sigue bloqueado hasta implementar confirmacion real del provider; no se toca balance si void no esta confirmado.

## Notas FASE 5.20F — Label oficial vs resumen interno

- `label_url` es la unica URL que debe tratarse como label oficial del carrier.
- La pagina interna `/guia/[trackingNumber]` es solo `Shipment summary`; no debe presentarse como carrier label.
- El cliente no recibe raw provider response ni secrets, solo campos seguros como tracking number, label URL, carrier, service y total.
- Void/refund ShipEngine permanece deshabilitado; no hay refund sin confirmacion real del provider.
- Si `label_url` falta, la UI no muestra botones rotos ni inventa PDFs.

## Notas FASE 5.20G — QA de labels y edge cases

- El boton final de compra se deshabilita inmediatamente y muestra `Purchasing label...` para reducir riesgo de doble click.
- El backend sigue siendo la autoridad de idempotencia: `user_id + idempotency_key`.
- Estados ambiguos de idempotencia devuelven 409 y no intentan otra compra automatica.
- Si la revalidacion de rate falla, el backend responde 409 antes de llamar a ShipEngine.
- Si no hay saldo, responde 402 antes de llamar al provider.
- Errores del provider se sanitizan antes de llegar a UI; no se exponen payloads raw ni secrets.
- Si el provider devuelve respuesta incompleta, se loggea server-side solo metadata no sensible.
- Si ShipEngine compra OK pero DB/RPC falla, se mantiene el request ID de reconciliacion y no se muestra exito.
- Void/refund sigue deshabilitado y no debe modificar balance sin confirmacion del provider.

## Notas FASE 5.21 — Tracking basico seguro

- `/api/tracking` requiere usuario verificado y filtra por `user_id`.
- Busca shipments propios por `tracking_number` o `id`.
- Devuelve solo datos seguros de shipment y `tracking_events`; no devuelve raw provider response ni metadata sensible.
- No llama APIs externas de carrier/ShipEngine, por lo que no expone claves ni consume rate limits.
- `labelUrl` solo se devuelve si el shipment pertenece al usuario autenticado.
- Tracking realtime y webhooks carrier quedan pendientes.

## Notas FASE 5.22 — Void/refund sandbox seguro

- Void real queda detras de `ENABLE_REAL_LABEL_VOID`; el flag es server-side y nunca debe ser `NEXT_PUBLIC`.
- Si el flag esta apagado, `/api/labels/[id]/void` no llama provider, no cambia shipment y no toca balance.
- Void requiere usuario verificado y shipment propio.
- Void solo aplica a label `purchased` y payment `paid`.
- Refund interno solo se ejecuta despues de confirmacion del carrier.
- El monto de refund se lee server-side desde DB.
- RPC `void_label_refund_transaction` evita doble refund si ya existe movimiento `refund`.
- Si provider void OK pero RPC falla, se registra log server-side sanitizado con request ID y no se devuelve raw provider response.
- Shippo/Easyship/EasyPost void siguen bloqueados.

## Notas FASE 5.27 — Responsive beta review

- Los cambios fueron de presentacion responsive; no se modificaron guards de label purchase, void/refund, balance, admin auth ni audit logs.
- Las pantallas admin siguen protegidas server-side; los ajustes mobile no exponen service role, raw provider responses ni metadata sensible.
- Las acciones peligrosas mantienen sus confirmaciones/guards existentes y solo se adaptaron para no quedar fuera de pantalla en mobile.
- Mobile nativo sigue pendiente de FASE 6 para mover operaciones sensibles al backend seguro.

## Notas FASE 5.28 — End-to-end beta QA

- Se revisaron auth, dashboard, rates, labels disabled, shipment summary, tracking, balance, admin y audit antes de staging.
- Se corrigieron mensajes visibles residuales en espanol/tecnicos y un placeholder corrupto en login/register.
- `/api/config/status` sigue devolviendo solo flags/counts; no devuelve secrets.
- Los guards server-side siguen siendo obligatorios:
  - `ENABLE_REAL_LABEL_PURCHASE` para compra de labels.
  - `ENABLE_REAL_LABEL_VOID` para void/refund.
- No se ejecutaron compras, voids, pagos, deploys ni migraciones.
- Antes de staging, confirmar que `ADMIN_EMAILS` o `profiles.role = admin` esta configurado y que usuarios no admin reciben 403 en `/admin` y `/api/admin/*`.
- Antes de staging, confirmar que `.env.local`/secrets no estan versionados y que las claves de provider son sandbox/test.

## Notas FASE 5.29 — Staging safety runbook

- Staging debe usar solo keys sandbox/test.
- `ENABLE_REAL_LABEL_PURCHASE=false` y `ENABLE_REAL_LABEL_VOID=false` son los defaults seguros.
- Los flags solo deben cambiarse temporalmente para una prueba sandbox controlada y volver a `false` al terminar.
- `ADMIN_EMAILS` es fallback temporal server-side; preferir `profiles.role = admin` cuando este disponible.
- `.env.local`, service role, API keys privadas, webhook secrets y provider tokens no deben entrar en Git.
- Antes de activar label purchase sandbox, confirmar la firma de `create_label_shipment_transaction` con `p_provider_rate_id`, `p_label_url`, `p_label_status` y `p_payment_status`.
- Antes de activar void sandbox, confirmar existencia de `void_label_refund_transaction`.
- Rollback seguro inicial: apagar purchase/void flags y revisar `/admin/audit`.

## Notas FASE 5.31 — Staging execution safety

- El deploy staging requiere variables reales configuradas en hosting, pero no deben copiarse al repo ni a `.env.example`.
- `.env.local` debe permanecer ignorado y no debe compartirse en logs, docs ni capturas.
- `/api/config/status` solo debe exponer booleans/counts; confirmar `labelPurchaseEnabled=false` y `labelVoidEnabled=false` en staging inicial.
- No activar purchase/void por defecto. Si se habilitan para prueba sandbox, hacerlo temporalmente, con ShipEngine TEST key y apagarlos al terminar.
- Si una prueba sandbox falla, no reintentar compra/void sin revisar idempotencia, `/admin/audit`, shipments y balance movements.
- Visual QA no debe incluir pagos reales, labels live ni voids live.

## Notas FASE 5.32 — Stripe/payment recharge design

Stripe sigue sin implementarse. El diseno aprobado para recargas reales de saldo es:

- El frontend nunca acredita saldo.
- La pantalla de exito de Stripe nunca crea `balance_movements`.
- Solo un webhook Stripe con firma verificada mediante `STRIPE_WEBHOOK_SECRET` puede crear `balance_movement` tipo `recharge`.
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son server-side; nunca deben tener prefijo `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` es la unica variable Stripe publica prevista.
- El backend debe tomar `user_id` desde la sesion autenticada al crear Checkout Session, no desde datos confiados del cliente.
- El monto se valida server-side: USD, montos fijos recomendados `10`, `25`, `50`, `100`, maximo beta `500`.
- La idempotencia debe usar `stripe_event_id` y tambien proteger por `checkout_session_id`/`payment_intent_id`.
- Si Stripe confirma pago pero DB falla, registrar evento critico `payment_recharge_db_failed` para reconciliacion y no acreditar dos veces.
- Admin manual adjustments no son pagos y no deben mostrarse como Stripe recharge.

Eventos de auditoria propuestos:

- `payment_checkout_started`
- `payment_checkout_created`
- `payment_checkout_failed`
- `payment_webhook_received`
- `payment_recharge_succeeded`
- `payment_recharge_duplicate_ignored`
- `payment_recharge_db_failed`
- `payment_recharge_amount_mismatch`
- `payment_recharge_signature_failed`

## Notas FASE 5.33 — Stripe Checkout sandbox

- Stripe se implementa solo para sandbox/test; no usar live keys ni produccion.
- `POST /api/billing/checkout-session` requiere usuario autenticado y email verificado.
- El endpoint solo acepta montos fijos server-side: `$10`, `$25`, `$50`, `$100`.
- El cliente recibe solo `checkoutUrl`; nunca recibe secret key ni decide el credito.
- `POST /api/webhooks/stripe` lee raw body y verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`.
- Solo `checkout.session.completed` con `payment_status = paid`, `currency = usd` y amount coincidente acredita balance.
- El movimiento acreditado es:
  - `type = recharge`
  - `concept = Payment recharge`
  - `reference_type = stripe_checkout`
  - `idempotency_key = stripe-event:<event_id>`
- Duplicados de webhook no duplican saldo; si ya existe recharge pagada con `balance_movement_id`, se ignora de forma segura.
- Si Stripe confirma pago pero DB falla, se registra `payment_recharge_db_failed` con severity `critical` y se devuelve 500 para permitir retry de Stripe.
- La success URL `/saldo?recharge=success` no acredita saldo.

## Notas FASE 5.34 — Stripe sandbox QA safety

- La verificacion debe hacerse solo con `sk_test`, `pk_test` y webhook secret test.
- `STRIPE_WEBHOOK_SECRET` no debe mostrarse en logs, docs ni chats.
- `/api/config/status` expone `stripeRechargeConfigured` y `stripeRechargeEnabled` como booleans; no expone keys ni account ids.
- `POST /api/billing/checkout-session` ahora requiere tambien webhook secret configurado para evitar cobros test sin ruta de acreditacion.
- Checkout agrega metadata en la session y en `payment_intent_data` para mejorar conciliacion de fallos.
- QA obligatorio antes de staging:
  - invalid signature no acredita.
  - amount/currency mismatch no acredita.
  - webhook duplicado no duplica saldo.
  - success URL no acredita.
  - audit/reconciliation no contiene raw Stripe completo ni secrets.

## Notas FASE 5.35 — Controlled sandbox verification

- No ejecutar Stripe Checkout si `stripeRechargeEnabled` o `stripeRechargeConfigured` son `false`.
- No probar con Stripe CLI sin aplicar primero la migracion `payment_recharges`.
- No copiar `whsec_...`, `sk_test_...` ni `pk_test_...` a docs, logs o chats.
- Reenvio de webhook debe comprobar que solo exista un `balance_movements` por payment intent/session.
- Si Stripe pago pero DB no acredita, revisar `payment_recharge_db_failed` en audit antes de reintentar o hacer ajuste manual.
- Cualquier correccion manual de saldo por soporte debe quedar como `adjustment`, no como `recharge`.

## Notas FASE 5.37 — Stripe recharge UX and failure safety

- La prueba sandbox confirmo que `Payment recharge +$10.00` fue creado por webhook verificado, no por frontend.
- La UI de `/saldo` no muestra nombres de env vars, secrets ni errores raw de Stripe.
- `POST /api/billing/checkout-session` responde errores publicos seguros y loggea errores internos server-side.
- Mensajes publicos:
  - `Payment received. Your balance will update once Stripe confirms the payment.`
  - `Payment canceled. No funds were added.`
  - `Payment is still being confirmed.`
  - `Online recharge is not available yet.`
- Admin audit muestra eventos Stripe con labels legibles, sin raw payloads ni secrets.
- Refunds, disputes, chargebacks y balance reversals siguen pendientes y deben crear audit/reconciliation critical events cuando se implementen.
