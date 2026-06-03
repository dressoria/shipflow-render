# Labels Go/No-Go Checklist

Checklist de requisitos antes de activar `ENABLE_REAL_LABEL_PURCHASE=true`.

Última revisión: 2026-06-03 (FASE 5.77)

---

## 1. Auth

- [x] Registro con Supabase funciona — confirmation_sent_at devuelto
- [x] Confirmación de email vía SMTP (Resend/SendiFlash) funciona
- [x] Login con contraseña correcta crea sesión Supabase
- [x] Login con usuario no verificado → redirige a /verifica-tu-correo, no al dashboard
- [x] Forgot password → mensaje neutro, link en email llega, redirect a /reset-password
- [x] Reset password → PASSWORD_RECOVERY event detectado, updateUser({ password }) funciona
- [x] Usuario no verificado bloqueado en todos los endpoints (`requireVerifiedUser` → 403)
- [x] localStorage legacy bloqueado en producción (`clearLegacyAuthStorage` en AuthContext)
- [x] `isDemoAuthEnabled()` retorna false en production (NODE_ENV === "production")
- [x] Resend verification sin sesión activa funciona vía ?resend=true
- [ ] **PENDIENTE:** Probar flujo completo en producción (registro → email → verificación → login → dashboard)

---

## 2. Balance

- [x] Wallet recharge con Stripe Sandbox completado y balance acreditado correctamente
- [x] Webhook Stripe idempotente (duplicate event ignorado con audit log)
- [x] Amount mismatch detectado y enviado a reconciliation log
- [x] Balance leído desde Supabase en tiempo real (sin localStorage)
- [x] `getAvailableBalance` calcula suma de balance_movements
- [x] Saldo insuficiente bloquea compra de label a nivel de servidor (no solo UI)
- [ ] **PENDIENTE:** Confirmar que balance no puede quedar negativo (revisar RPC de debit)
- [ ] **PENDIENTE:** Probar carga con saldo suficiente en sandbox: debit correcto registrado
- [ ] **PENDIENTE:** Audit movement visible en /saldo para cada recharge

---

## 3. Labels

- [x] Rate snapshot guardado en pending_label_orders (migración aplicada; FASE 5.46)
- [x] Provider rate ID validado antes de crear label (FASE 5.46)
- [x] Address validation completa — street1, city, state, ZIP para origen y destino (FASE 5.46)
- [x] Idempotency key definida por purchase intent (`idempotencyKeyRef`) (FASE 5.46)
- [x] Label purchase **solo** server-side — cliente nunca compra label directamente (FASE 5.46)
- [x] Frontend nunca ejecuta label purchase por success_url de Stripe — manual admin processing con webhook auto-process apagado (FASE 5.46)
- [x] Label purchase real probada en sandbox con direct Stripe payment (FASE 5.46 PASS)
- [x] Label purchase automático preparado detrás de `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` (FASE 5.49)
- [x] Label URL o base64 retornada y descargable (FASE 5.46 PASS, provider sample label)
- [x] Tracking number guardado en shipments con fallback interno para placeholder sandbox duplicado (FASE 5.46 PASS)
- [x] `createShipEngineShipment` probado end-to-end en modo sandbox antes de activar (FASE 5.46 PASS)
- [x] `SHIPSTATION_API_MODE=shipengine` confirmado por flujo sandbox ShipEngine/ShipStation (FASE 5.46)

---

## 4. Stripe

- [x] `wallet_recharge` en `payment_recharges` separado de label payments
- [x] Webhook verifica firma HMAC antes de procesar cualquier evento
- [x] `checkout.session.completed` → solo acredita si `payment_status === "paid"`
- [x] `checkout.session.expired` → marca recharge como `canceled`; marca label order como `expired`
- [x] `payment_intent.payment_failed` → marca recharge como `failed`
- [x] Metadata desconocida → reconciliation event, no rompe el handler
- [x] Dispatcher: `metadata.purpose === "label_direct_payment"` → handler separado (FASE 5.39B)
- [x] Idempotency: si orden ya está paid/processed, ignora evento duplicado (FASE 5.39B)
- [x] Amount y currency validados contra pending_label_order (FASE 5.39B)
- [x] user_id de metadata validado contra orden (FASE 5.39B)
- [x] Si ENABLE_REAL_LABEL_PURCHASE=false → status `paid_test_mode`, sin compra real (FASE 5.39B)
- [x] Si ENABLE_REAL_LABEL_PURCHASE=true → compra label server-side (FASE 5.46 PASS, manual admin process)
- [x] Caso pago exitoso + label falla → status `action_required` controlado; retry exitoso tras fix sandbox duplicate tracking (FASE 5.46 PASS)
- [x] Caso pago exitoso + label ya comprada (idempotency) → evitar doble compra con claim/estado de procesamiento (FASE 5.46)
- [x] Probar webhook con evento label_direct_payment en sandbox antes de activar (FASE 5.46 PASS)
- [x] `ENABLE_PROCESS_LABEL_IN_WEBHOOK=false` conserva modo manual seguro (FASE 5.49)
- [x] `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` intenta compra automática tras registrar pago (FASE 5.49)
- [x] Fallo automático de carrier queda en `action_required`, no ejecuta refund/void (FASE 5.49)
- [ ] **PENDIENTE:** Activar `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` en VM y validar compra automática end-to-end (FASE 5.50)

---

## 5. Admin y Soporte

- [x] Lista de `pending_label_orders` accesible para admin sin exponer secrets (FASE 5.39C)
- [x] Filtros por status, provider, y búsqueda por session/PI/tracking (FASE 5.39C)
- [x] Panel admin orientado a excepciones para modo automático, con filtros rápidos por needs review/waiting/processing/completed (FASE 5.51)
- [x] Lista admin muestra usuario, amount, provider/service, tracking, fechas y estados operativos para soporte (FASE 5.51)
- [x] Detalle de orden con snapshots JSON colapsables, sin secrets (FASE 5.39C)
- [x] `Process label` manual protegido contra doble click/doble submit desde admin UI (FASE 5.48)
- [x] Retry de `action_required` visible solo cuando no existe label/shipment/tracking guardado (FASE 5.48)
- [x] Estados `label_purchased` y retries inseguros explican por qué no se debe procesar otra vez (FASE 5.48)
- [x] Admin list/detail se refrescan tras process exitoso (FASE 5.48)
- [x] Acciones admin: mark_action_required, mark_refund_needed, mark_expired (FASE 5.39C)
- [x] Error message visible en detalle sin exponer API keys (FASE 5.39C)
- [x] Expiry sweep manual: POST /api/admin/label-orders/expire-stale (FASE 5.39C)
- [x] Refund foundation documentada — flujo refund_needed → refund_pending → refunded (FASE 5.39C)
- [ ] **PENDIENTE:** Lista de labels con `label_failed` accesible para soporte (FASE 5.39D+)
- [x] Flujo de refund real por admin detrás de `ENABLE_LABEL_PAYMENT_REFUNDS=false` (FASE 5.40D)
- [x] Controles de refund manual seguros: no refund si no hay pago, ya fue refunded/refund_pending, o existe label/shipment/tracking (FASE 5.52)
- [x] Flujo de void documentado y restringido a admin — solo con `ENABLE_REAL_LABEL_VOID=true` y solo labels purchased con shipment/label/tracking (FASE 5.52)
- [ ] **PENDIENTE:** Cron/worker para expiry automático (actualmente sweep manual)

## 5.70. Prep beta gate

- [x] FBA Prep público queda presentado como early access / coming soon antes del lanzamiento.
- [x] Acceso activo a Prep centralizado para `131studio.ec@gmail.com` o usuarios admin.
- [x] Usuarios normales ven "SendiFlash Prep is in preparation" en rutas customer de Prep.
- [x] APIs customer de Prep devuelven `403` para cuentas no habilitadas.
- [x] Shipping Labels permanecen disponibles y sin cambios de lógica.
- [x] No se activaron refunds, voids, customs, automatización AI/API, ni cambios de providers.

## 5.71. Ecuador coming-soon positioning

- [x] Homepage público presenta Ecuador Shipping solo como `coming soon` / `en preparacion`.
- [x] Existe pagina publica `/ecuador` con copy seguro y CTA a `/support`.
- [x] No se menciona ningun provider ni integracion pendiente publicamente.
- [x] No se agrego flujo de creacion de envio Ecuador, pagos Ecuador ni dashboard Ecuador operativo.
- [x] Shipping Labels siguen como servicio disponible ahora.
- [x] FBA Prep sigue como early access / beta controlada.
- [x] No se tocaron migraciones, wallet, auth, refunds, voids ni compra de labels.

## 5.74. Regional mode foundation

- [x] Existe modo regional cliente para `us` y `ec`.
- [x] La preferencia regional se guarda en `localStorage`.
- [x] El usuario puede cambiar manualmente entre USA Shipping Labels y Ecuador Shipping.
- [x] No existe bloqueo por IP ni routing estricto por país.
- [x] Homepage, auth y dashboard cambian copy/UI por modo sin habilitar envíos Ecuador reales.
- [x] Ecuador sigue presentado como `próximamente` / `en preparación`.
- [x] FBA Prep sigue gated / beta controlada.
- [x] No se tocaron Delivereo, pagos Ecuador, migraciones ni lógica de labels existente.

## 5.75. Ecuador MVP skeleton

- [x] Existen rutas placeholder `/ecuador/crear-envio`, `/ecuador/envios` y `/ecuador/envios/[id]`.
- [x] Existen rutas admin placeholder `/admin/ecuador-envios` y `/admin/ecuador-envios/[id]`.
- [x] No se crean órdenes reales desde las nuevas rutas Ecuador.
- [x] Delivereo sigue sin integración real y sin credenciales en código.
- [x] Existe interfaz de provider Ecuador y provider mock/no-op sin llamadas de red.
- [x] No existen pagos Ecuador activos.
- [x] No se agregaron migraciones ni tablas reales para Ecuador.
- [x] FBA Prep sigue gated / beta controlada.

## 5.76. Ecuador beta request flow

- [x] Existe migración aditiva `20260603_add_ecuador_shipping_requests.sql`.
- [x] Existen tablas `regional_shipments` y `regional_shipment_events` con RLS para lectura propia del usuario.
- [x] Existen APIs customer `POST /api/ecuador/shipments`, `GET /api/ecuador/shipments`, y `GET /api/ecuador/shipments/[id]`.
- [x] Existen APIs admin `GET /api/admin/ecuador-shipments`, `GET /api/admin/ecuador-shipments/[id]`, y `PATCH /api/admin/ecuador-shipments/[id]`.
- [x] `/ecuador/crear-envio` ahora crea solicitud beta, no envío real.
- [x] `/ecuador/envios` y `/ecuador/envios/[id]` muestran solo campos seguros para cliente.
- [x] `/admin/ecuador-envios` y `/admin/ecuador-envios/[id]` operan datos internos sin llamadas a Delivereo.
- [x] No se tocaron pagos Ecuador, credenciales Delivereo, lógica de labels, wallet ni Prep.

## 5.77. Ecuador beta request hardening

- [x] Existe corrección aditiva `20260603_add_regional_shipment_event_insert_policy.sql`.
- [x] Customer APIs rechazan `provider=delivereo` y estados arbitrarios.
- [x] Customer APIs rechazan campos internos como `provider_order_id`, `provider_cost`, `margin` y `admin_notes`.
- [x] Customer errores de validación se mantienen amigables y no exponen texto crudo de Supabase.
- [x] Customer UI refuerza preparación beta, no envío real y no cobro.
- [x] Admin UI refuerza `Beta request`, `No provider call`, `No payment` e `Internal review only`.
- [x] Se agregó checklist manual en `docs/ECUADOR_BETA_QA_CHECKLIST.md`.

---

## 6. Seguridad

- [x] `ENABLE_REAL_LABEL_PURCHASE` comprobado en `/api/labels` antes de cualquier operación
- [x] `ENABLE_REAL_LABEL_VOID` comprobado en `/api/labels/[id]/void` antes de cualquier operación
- [x] `ENABLE_DIRECT_LABEL_PAYMENT` comprobado en `/api/billing/label-checkout` (FASE 5.39B)
- [x] CSP sin `unsafe-eval` — warning de eval proviene de dev overlay/extensión, no de código propio
- [x] Logs de error no exponen STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY ni API keys de carriers
- [x] `requireVerifiedUser` en todos los endpoints que tocan dinero o labels
- [x] Skeleton providers (shippo, easypost, easyship) retornan 501 explícito en /api/labels
- [x] amount_cents calculado server-side desde rate_snapshot; valor del cliente nunca se usa (FASE 5.39B)
- [x] Feature gates por usuario/email para direct label payment, real label purchase, real void y webhook processing (FASE 5.40C)
- [x] Rate limiting básico para `/api/billing/label-checkout` con migración propuesta e in-memory fallback dev (FASE 5.40C)
- [x] Processing claim antes de carrier call para evitar doble compra por webhook/admin duplicate (FASE 5.40C)
- [ ] **PENDIENTE:** Revisar CORS policy para endpoints de billing en producción

---

## 7. Base de datos

- [x] Migración `20260524_add_pending_label_orders.sql` revisada y aprobada (FASE 5.39B)
- [x] Estado `paid_test_mode`, `paid_waiting_label_purchase`, `action_required` en enum (FASE 5.39B)
- [x] Estados `refund_pending`, `refunded` en enum (FASE 5.39C)
- [x] `amount_cents integer`, `provider`, `service_code`, `service_name` en tabla (FASE 5.39B)
- [x] `paid_at`, `processed_at`, `tracking_number`, `error_message` en tabla (FASE 5.39B)
- [x] `idempotency_key text unique` para la compra de label (FASE 5.39B)
- [x] Índices en status, stripe_checkout_session_id, stripe_payment_intent_id, expires_at (FASE 5.39B)
- [x] RLS habilitado con policy SELECT user read own; sin INSERT/UPDATE/DELETE para usuarios (FASE 5.39B)
- [x] Service role es el único que puede insertar/actualizar pending_label_orders (FASE 5.39B)
- [x] Trigger `set_pending_label_orders_updated_at` incluido en migración (FASE 5.39B)
- [x] SQL revisado y listo para aplicar en staging — ver `docs/DEPLOYMENT.md` (FASE 5.40A)
- [x] Migración aplicada en entorno QA para `pending_label_orders` (FASE 5.46 PASS)
- [x] Migración aplicada en entorno QA para `label_checkout_attempts` (FASE 5.46 PASS)
- [x] Verificación funcional de tablas tras aplicar migración mediante Stripe Checkout + webhook + admin process (FASE 5.46 PASS)
- [ ] **PENDIENTE:** `void_label_refund_transaction` RPC funcionando correctamente (ya probado en FASE 4D)

---

## 8. QA Final Antes de Activar

- [x] Probar flujo completo de direct label payment en sandbox: cotizar → pagar Stripe test → webhook → admin process → tracking/PDF/status usuario (FASE 5.46 PASS)
- [ ] Verificar que saldo se reduce correctamente después de compra
- [x] Verificar que tracking number aparece en /envios y /guia/[tracking] con acciones de detalle, tracking y label PDF cuando existe (FASE 5.51 UX ready)
- [ ] Verificar que void (si ENABLE_REAL_LABEL_VOID=true) devuelve saldo correctamente
- [x] Correr `npm run build` limpio antes de cierre QA (FASE 5.46/5.47 pre-check)
- [ ] Revisar logs de producción 30 minutos después de activar

## 8.1 Operating UX — Controlled Beta

- [x] `/envios` funciona como historial comercial de envíos para labels automáticas.
- [x] Cada envío muestra tracking, carrier/provider, service code si existe, status, label status, fecha, precio y acciones.
- [x] `/guia/[tracking]` muestra detalle sin exponer metadata cruda a usuarios normales.
- [x] Detalle incluye copiar tracking y abrir/descargar label PDF si `label_url` existe.
- [x] Empty, loading y error states son claros para usuarios.
- [x] Admin se posiciona como panel de excepciones para `action_required`, `paid_waiting_label_purchase`, `label_purchase_pending` y `label_purchased`.
- [x] Admin detail muestra readiness de refund/void y explica cuándo están deshabilitados por flags o estado.

## 8.2 Manual Refund/Void Exception Handling

Current production posture:

- `ENABLE_REAL_LABEL_VOID=false`.
- `ENABLE_LABEL_PAYMENT_REFUNDS=false`.
- No automatic refund after provider failure.
- No automatic void after provider failure.

Refund safety:

- App refund endpoint is admin-only and gated by `ENABLE_LABEL_PAYMENT_REFUNDS`.
- Real Stripe refund requires `stripe_payment_intent_id`, `paid_at`, valid amount, eligible status, and no `label_id`, `shipment_id`, or `tracking_number`.
- `refund_pending` and `refunded` block duplicate refund attempts.
- Stripe idempotency key remains `label-refund-{order.id}`.
- If refunds are disabled, support uses Stripe Dashboard manually and records the result with "Mark refunded manually" only when safe.

Void safety:

- Carrier void endpoint is admin-only and gated by `ENABLE_REAL_LABEL_VOID`.
- Void requires saved shipment, label id, tracking number, `label_status=purchased`, and `payment_status=paid`.
- Already-voided labels return idempotently.
- Existing refund movements block duplicate void/refund persistence.
- Successful void stores `shipments.metadata.label_void` with provider response summary and admin/timestamp context.
- Normal users can see voided/refunded statuses but do not see void controls.

## 8.3 Controlled Beta Readiness — FASE 5.55

Production config observed from `/api/config/status`:

- [x] `buildEnvOk=true`.
- [x] `directLabelPaymentEnabled=true`.
- [x] `realLabelPurchaseEnabled=true`.
- [x] `processLabelInWebhookEnabled=true`.
- [x] `labelVoidEnabled=false`.
- [x] `labelPaymentRefundsEnabled=false`.
- [x] `stripeRechargeEnabled=true`.
- [x] `ratesConfigured=true`.

Release posture:

- [x] Core automatic direct-card label flow is implemented.
- [x] Wallet recharge and wallet label purchase foundations are implemented.
- [x] Pricing margin controls are present in current HEAD `04db119`.
- [x] Admin is exception-oriented, with refund/void controls gated off by flags.
- [x] Public/app-shell smoke checks returned HTTP 200 for `/`, `/login`, `/registro`, `/crear-guia`, `/saldo`, and `/admin/label-orders`.
- [ ] Full authenticated browser QA for signup/login/dashboard.
- [ ] Fresh direct-card Stripe Checkout order with automatic label purchase.
- [ ] Fresh wallet recharge and wallet label purchase.
- [ ] Supabase verification for newest pending label order, shipment, balance movement, and pricing/margin fields.
- [ ] Admin browser QA for filters, safe retry, completed-state blocking, and disabled refund/void reasons.

Beta decision:

**PARTIAL / ready for controlled manual beta QA.** Do not call this production PASS until a fresh authenticated Stripe direct-card order and wallet order complete end-to-end with DB verification.

---

## 9. Direct Label Payment — QA Previo a ENABLE_REAL_LABEL_PURCHASE=true

### Preparación (FASE 5.40A — runbook en docs/DEPLOYMENT.md)

- [ ] Aplicar migración pending_label_orders en Supabase staging (ver `docs/DEPLOYMENT.md` paso a paso)
- [ ] Verificar migración con queries de `docs/DEPLOYMENT.md` sección "Step 3"
- [ ] Confirmar `/api/config/status` devuelve `directLabelPaymentEnabled: false` antes de activar flag
- [ ] Activar `ENABLE_DIRECT_LABEL_PAYMENT=true` en staging solamente (no en producción)
- [ ] Confirmar `/api/config/status` devuelve `directLabelPaymentEnabled: true` después

### Flujo principal (con tabla aplicada y ENABLE_DIRECT_LABEL_PAYMENT=true)

- [ ] Sin token: `POST /api/billing/label-checkout` → 401/403
- [ ] Usuario no verificado: `POST /api/billing/label-checkout` → 403
- [ ] Usuario verificado + `ENABLE_DIRECT_LABEL_PAYMENT=false`: → 503 "Direct label payment is not enabled yet."
- [ ] `ENABLE_DIRECT_LABEL_PAYMENT=true` + email no allowlisted en production: → 403 "Direct label payment is not available for this account yet."
- [ ] `ENABLE_DIRECT_LABEL_PAYMENT=true` + email allowlisted: puede crear pending order si la migración está aplicada
- [ ] 6 intentos de label checkout en 10 minutos para el mismo usuario: → 429
- [ ] Tabla ausente + flag activo: `POST /api/billing/label-checkout` → 503 "Pending label orders table is not available yet."
- [ ] Crear orden de label → Stripe Checkout → pagar en sandbox con `4242 4242 4242 4242` → verificar status=`paid_test_mode`
- [ ] Verificar que `stripe_checkout_session_id`, `stripe_payment_intent_id`, `paid_at` se guardan en DB
- [ ] Verificar en `/admin/label-orders` que la orden aparece con status `paid_test_mode`
- [ ] Verificar que checkout expirado → status=`expired` en pending_label_orders

### Validación webhook

- [ ] Verificar que webhook rechaza eventos sin firma válida (Stripe signature header faltante)
- [ ] Verificar que webhook rechaza `amount_total` distinto a `amount_cents` de la orden
- [ ] Verificar que webhook rechaza `user_id` en metadata distinto al de la orden
- [ ] Verificar que evento duplicado es ignorado sin error (idempotency)
- [ ] Verificar que `wallet_recharge` flow no es afectado (probar recarga normal)
- [ ] `ENABLE_REAL_LABEL_PURCHASE=true` + dueño de orden no allowlisted: no llama carrier; orden queda en estado seguro para soporte
- [ ] `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true` + dueño no allowlisted para webhook processing: no procesa inline

### UX

- [ ] Verificar que `?labelPayment=success` muestra banner correcto en /crear-guia
- [ ] Verificar que `?labelPayment=cancelled` muestra banner correcto en /crear-guia
- [ ] Si direct label payment global está apagado: botón Pay by card disabled con "Soon"
- [ ] Si direct label payment global está prendido pero la cuenta no está allowlisted: UI muestra "Card payment for labels is not available for your account yet."

### Admin QA (con tabla real)

- [ ] `/admin/label-orders` lista la orden real, filtros funcionan
- [ ] Detalle de orden muestra snapshots JSON correctamente
- [ ] `mark-refund-needed` desde `paid_test_mode` funciona sin ejecutar refund real
- [ ] `expire-stale` no afecta órdenes con `paid_at` no nulo
- [ ] Doble click en `process-label`: solo un request logra claim; no hay doble compra
- [ ] Webhook duplicado después de claim: no compra dos labels

---

## 10. FASE 5.40C — Gates, rate limits y locks

### Flags + allowlists

```env
ENABLE_DIRECT_LABEL_PAYMENT=false
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=
DIRECT_LABEL_PAYMENT_ALLOWED_USER_IDS=

ENABLE_REAL_LABEL_PURCHASE=false
REAL_LABEL_PURCHASE_ALLOWED_EMAILS=
REAL_LABEL_PURCHASE_ALLOWED_USER_IDS=

ENABLE_REAL_LABEL_VOID=false
REAL_LABEL_VOID_ALLOWED_EMAILS=
REAL_LABEL_VOID_ALLOWED_USER_IDS=

ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
PROCESS_LABEL_IN_WEBHOOK_ALLOWED_EMAILS=
PROCESS_LABEL_IN_WEBHOOK_ALLOWED_USER_IDS=

ENABLE_LABEL_PAYMENT_REFUNDS=false
LABEL_PAYMENT_REFUND_ALLOWED_EMAILS=
LABEL_PAYMENT_REFUND_ALLOWED_USER_IDS=
```

Reglas:

- Flag global `false`: bloqueado para todos.
- Flag global `true` + allowlist vacía en production: bloqueado por seguridad.
- Flag global `true` + email/user id allowlisted: permitido.
- Admin no salta el gate de compra real automáticamente.
- `/api/config/status` no expone allowlists.

### Audit events esperados

- `label_checkout_created`
- `label_payment_paid_test_mode`
- `label_payment_paid_waiting_purchase`
- `label_purchase_claimed`
- `label_purchase_succeeded`
- `label_purchase_failed_refund_needed`
- `label_purchase_action_required`
- `label_checkout_rate_limited`
- `label_feature_gate_denied`
- `label_refund_requested`
- `label_refund_pending`
- `label_refund_succeeded`
- `label_refund_failed`
- `label_refund_marked_manual`
- `label_refund_gate_denied`

No guardar secrets, headers Authorization, API keys, card data ni responses raw completos de providers.

### Activación beta controlada

```env
ENABLE_DIRECT_LABEL_PAYMENT=true
DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS=131studio.ec@gmail.com

ENABLE_REAL_LABEL_PURCHASE=false
```

Para compra real sandbox controlada:

```env
ENABLE_REAL_LABEL_PURCHASE=true
REAL_LABEL_PURCHASE_ALLOWED_EMAILS=131studio.ec@gmail.com
ENABLE_PROCESS_LABEL_IN_WEBHOOK=false
```

No activar globalmente sin allowlists: un flag global puede capturar pagos o llamar carriers para cualquier usuario.

### Pruebas manuales mínimas

- Flag false: endpoint 503; UI disabled "Soon".
- Flag true + no allowlist: endpoint 403; UI no permite.
- Flag true + allowlist: Stripe Checkout se crea.
- Rate limit: 6 intentos / 10 min -> 429.
- Real purchase false: nunca llama carrier.
- Real purchase true + dueño no allowlisted: nunca llama carrier; status seguro.
- Admin doble click y webhook duplicado: una sola transición a `label_purchase_pending`.
- Sandbox providers may return repeated placeholder tracking numbers. ShipFlow preserves
  the original provider tracking in shipment metadata and stores a unique internal tracking
  value when needed so `shipments.tracking_number` remains unique.

### Refund policy técnica

Estados:

- `refund_needed`: soporte debe revisar y decidir refund.
- `refund_pending`: la app inició un Stripe refund y espera resultado.
- `refunded`: refund registrado; puede venir de Stripe API o registro manual tras usar Stripe Dashboard.
- `action_required`: requiere decisión humana; puede convertirse a `refund_needed` o procesarse de nuevo.

Refunds reales están bloqueados por defecto con `ENABLE_LABEL_PAYMENT_REFUNDS=false`. En beta inicial, usar Stripe Dashboard manualmente y luego registrar el resultado con "Mark refunded manually". El endpoint de refund real se usa solo con Stripe test y admin allowlisted.

Elegibilidad para refund real:

- Permitido: `refund_needed`, `action_required` con `stripe_payment_intent_id` y `paid_at`, `paid_test_mode`, `paid_waiting_label_purchase` sin label comprada.
- Bloqueado: `refunded`, sin payment intent, `label_purchased`, monto inválido, o cualquier orden que ya tenga `label_id`/`tracking_number`.

QA refunds:

- `ENABLE_LABEL_PAYMENT_REFUNDS=false`: botón real disabled; usar Stripe Dashboard manual.
- Flag true + admin no allowlisted: endpoint 403 y UI disabled.
- Flag true + admin allowlisted + Stripe test: status pasa `refund_pending -> refunded`, guarda `stripe_refund_id` y `refunded_at`.
- Doble click refund: Stripe idempotency key `label-refund-{order.id}` evita refund duplicado.
- Orden sin `stripe_payment_intent_id`: no permite refund.
- Orden `label_purchased`: no permite refund directo todavía.

---

## Estado Actual (2026-05-24 — FASE 5.40C)

| Bloque                   | Estado       | Notas                                                                |
|--------------------------|--------------|----------------------------------------------------------------------|
| Auth                     | ✅ Listo     | Flujo completo implementado y QA'd                                  |
| Balance                  | 🟡 Parcial   | Recharge OK, debit en label pendiente de test                       |
| Labels                   | 🟡 Parcial   | Compra server-side lista; ENABLE_REAL_LABEL_PURCHASE=false; falta QA |
| Stripe Webhook           | 🟡 Parcial   | Wallet OK; label handler test mode OK; compra inline desactivada    |
| Admin/Soporte            | 🟡 Parcial   | Panel pending_label_orders + refund gated listos; falta QA          |
| Seguridad                | ✅ Listo     | Guards + allowlists + rate limit + processing claim preparados       |
| Base de datos            | 🟡 Parcial   | SQL revisado y listo; runbook en DEPLOYMENT.md; pendiente aplicar   |
| Direct Label Payment UI  | 🟡 Parcial   | Endpoint + webhook OK; table-missing → 503 claro; pendiente QA      |
| Expiry                   | 🟡 Parcial   | Sweep manual listo; cron automático pendiente                       |
| Refund foundation        | 🟡 Parcial   | Refund admin gated listo; ENABLE_LABEL_PAYMENT_REFUNDS=false        |

**Flags de activación:**

| Flag                          | Valor actual | Cuándo activar                                                      |
|-------------------------------|--------------|---------------------------------------------------------------------|
| `ENABLE_DIRECT_LABEL_PAYMENT` | `false`      | Después de aplicar migración en staging y QA sección 9 pasado       |
| `ENABLE_REAL_LABEL_PURCHASE`  | `false`      | Después de QA final de compra server-side en staging                |
| `ENABLE_REAL_LABEL_VOID`      | `false`      | Después de QA void end-to-end en sandbox                            |
| `ENABLE_LABEL_PAYMENT_REFUNDS`| `false`      | Solo con Stripe test + admin allowlisted + QA refund aprobado       |

**No activar `ENABLE_REAL_LABEL_PURCHASE=true` hasta que todos los ítems de Stripe, Labels, Base de datos, y QA Final estén marcados.**

---

## Riesgos de activación (FASE 5.40A)

Leer antes de activar cualquier flag en producción con Stripe en modo live.

### Riesgo 1 — Pago capturado sin label comprada

Si se activa `ENABLE_DIRECT_LABEL_PAYMENT=true` en producción con Stripe **live**, el usuario puede completar un pago real. Si `ENABLE_REAL_LABEL_PURCHASE=false`, el webhook marcará la orden `paid_test_mode` — el dinero fue capturado por Stripe pero no se compró ninguna label.

**Mitigación:** Nunca activar `ENABLE_DIRECT_LABEL_PAYMENT=true` con Stripe live sin completar primero QA de compra server-side y soporte. Usar solo en staging con Stripe en modo test.

### Riesgo 2 — Refund manual requerido si hay pago live en paid_test_mode

Si un pago real queda en `paid_test_mode`, no hay refund automático implementado. El admin debe ejecutar un refund manual desde el panel de Stripe y marcar la orden `refund_needed` en el panel de `/admin/label-orders`.

**Mitigación:** No activar `ENABLE_DIRECT_LABEL_PAYMENT=true` con Stripe live hasta que el flujo de refund gated haya pasado QA en Stripe test.

### Riesgo 3 — Activación global sin soporte visible

Si se activa para todos los usuarios antes de que el equipo de soporte esté familiarizado con `/admin/label-orders`, las órdenes en `paid_test_mode` o `action_required` pueden quedar sin atención.

**Mitigación:** Activar primero para usuarios internos (feature flag per-user pendiente) y entrenar al equipo de soporte en `/admin/label-orders` antes de activar globalmente.

### Riesgo 4 — Double-charge si idempotencia falla

Si el usuario abre múltiples tabs o la red falla, se podrían crear dos filas en `pending_label_orders` con diferentes `idempotency_key`. Stripe crearía dos sesiones separadas.

**Mitigación:** El frontend debe pasar el mismo `idempotencyKey` por intento (basado en el `rateSnapshot` + user + timestamp de selección). Verificar en QA que no se crean sesiones duplicadas.

### Riesgo 5 — Migración aplicada en producción sin staging QA

Si la migración se aplica directamente en producción sin probar en staging primero, errores de schema impactarían usuarios reales.

**Mitigación:** Siempre aplicar staging → verificar con queries de `docs/DEPLOYMENT.md` → luego producción. El rollback en producción es disruptivo.

---

## 10. Refund Flow — Documentación (FASE 5.40D)

El flujo operativo de refund está implementado detrás de `ENABLE_LABEL_PAYMENT_REFUNDS=false` por defecto. No hay auto-refund desde webhook en esta fase:

1. Label purchase falla después de que el usuario pagó por Stripe.
2. Webhook inline processing o admin process-label marca orden como `refund_needed` si la compra falla después del pago.
3. Admin revisa en `/admin/label-orders` y confirma que procede refund.
4. Si `ENABLE_LABEL_PAYMENT_REFUNDS=false`, soporte ejecuta refund manual en Stripe Dashboard y registra "Mark refunded manually".
5. Si `ENABLE_LABEL_PAYMENT_REFUNDS=true` y admin está allowlisted, admin ejecuta `POST /api/admin/label-orders/[id]/refund`.
6. Orden pasa a `refund_pending` antes de llamar Stripe.
7. Si Stripe responde OK, orden pasa a `refunded`.
8. Webhook `charge.refunded`/`refund.updated` queda para fase futura.
7. Audit log registra el refund con monto e idempotencia.

**Estados en DB para refund lifecycle:**

| Estado          | Significado                                         |
|-----------------|-----------------------------------------------------|
| `refund_needed` | Label fallida o cancelada; refund requerido         |
| `refund_pending`| Stripe refund API llamado, pendiente confirmación   |
| `refunded`      | Stripe confirma refund — terminal                   |

**Constraints de seguridad:**
- Refund real nunca ejecutado por el webhook de label payment (solo marca `refund_needed`).
- El admin debe confirmar manualmente desde el panel antes de ejecutar.
- Idempotencia con Stripe refund idempotency key obligatoria.
- Monto del refund igual a `amount_cents` original — sin ajustes manuales.
- No se toca wallet balance ni `payment_recharges`.
- No se permite refund directo de `label_purchased` hasta definir política de void/return.

---

## 11. UX Polish — FASE 5.44

Completado en FASE 5.44 (sin migración requerida):

- [x] `GET /api/billing/label-orders/[id]` — endpoint seguro para usuario; retorna estado del orden sin secrets
- [x] `apiGetUserLabelOrder` en `apiClient.ts`
- [x] `CreateGuideForm` carga estado del orden en éxito (`?labelPayment=success&order_id=<id>`) y muestra mensaje específico por estado
- [x] `LabelPaymentSuccessBanner` componente con mensajes por estado (`paid_test_mode`, `label_purchased`, `action_required`, etc.)
- [x] `apiAdminGetLabelOrder` en `apiClient.ts`
- [x] Admin: después de "Process label" exitoso, orden se refresca automáticamente (sin recargar la página)
- [x] "Pay by card" disabled tooltip distingue flag-off vs. usuario-no-allowlisted

---

## 12. Failure/Refund/Support Operations — FASE 5.45

Completado en FASE 5.45 (sin migración requerida):

- [x] `lib/label-order-status.ts` creado — fuente única de verdad para status sets y helpers de display
- [x] `AdminLabelOrdersView.tsx` refactorizado para importar desde `label-order-status.ts`
- [x] `LabelPaymentSuccessBanner` mejorado con `isErrorLabelOrderStatus()` y `getUserFacingLabelOrderMessage()`
- [x] Panel de detalle admin: Order ID, Label ID, Shipment ID con botones de copia, timestamps completos
- [x] `error_message` admin labeling contextual: "Action required reason" / "Refund needed reason"
- [x] `Mark refunded manually` corregido: requiere `paidAt` + `stripePaymentIntentId`; disponible para `paid_waiting_label_purchase`
- [x] Status badge tooltip con descripción del estado
- [x] Filter dropdown con labels legibles por humanos

### Tabla de estados — Label Orders

| Estado | Significado | Usuario ve | Admin puede |  Final |
|---|---|---|---|---|
| `pending_payment` | Checkout creado, no pagado | "Tu pago no se ha completado aún." | Mark action_required, Mark expired | No |
| `paid_test_mode` | Pagado en test mode | "Pago confirmado en test mode. No se generó label." | Mark refund_needed, Refund (si habilitado), Mark refunded manually | No |
| `paid_waiting_label_purchase` | Pagado, label en cola | "Tu label está en cola de procesamiento." | Process label, Mark action_required, Mark refund_needed, Refund, Mark refunded manually | No |
| `label_purchase_pending` | Label siendo procesada | "Tu label se está procesando." | Process label, Mark action_required, Mark refund_needed | No |
| `label_purchased` | Label comprada exitosamente | "Tu label está lista." + tracking | — | **Sí** |
| `action_required` | Revisión de soporte necesaria | "Tu pago fue recibido, pero el envío requiere revisión de soporte." | Process label si no hay `label_id`/`shipment_id`/`tracking_number`, Mark refund_needed, Refund, Mark refunded manually | No |
| `refund_needed` | Label falló, se requiere refund | "La label no pudo generarse. Soporte revisará tu orden." | Refund (si habilitado), Mark refunded manually | No |
| `refund_pending` | Refund iniciado en Stripe | "El reembolso se está procesando." | Mark refunded manually | No |
| `refunded` | Refund completado | "Reembolso completado." | — | **Sí** |
| `expired` | Checkout expiró sin pago | "Este intento de pago expiró." | — | **Sí** |
| `canceled` | Orden cancelada | "Esta orden fue cancelada." | — | **Sí** |

### Runbook Operacional — Situaciones Comunes

**1. Pago quedó en `pending_payment` (sin completar)**

Causa: usuario abandonó el checkout de Stripe sin pagar.
Acción: esperar a que `expires_at` pase → admin corre "Expire stale" desde `/admin/label-orders`.
No tocar: no hacer refund (no hay pago).

**2. Pago quedó en `paid_test_mode`**

Causa: `ENABLE_DIRECT_LABEL_PAYMENT=true` pero `ENABLE_REAL_LABEL_PURCHASE=false`.
Acción: informar al usuario que no se generará label. Si se activa real label purchase: no retroactivo (estas órdenes no se reprocesan).
Si se necesita reembolso: admin → "Mark refund_needed" → "Mark refunded manually" (refund manual en Stripe Dashboard).

**3. Label purchase falló después del pago**

Causa: error del carrier, datos inválidos, timeout.
Acción: admin revisa `error_message` en detalle de orden. Opciones:
- Si es recuperable: admin puede intentar "Process label" de nuevo (si status permite).
- Si no es recuperable: admin marca "Mark refund_needed" → ejecuta refund.

**4. Orden necesita revisión antes de proceder**

Causa: dirección sospechosa, monto anómalo, carrier rechazó la rate.
Acción: admin → "Mark action required" con razón → notificar usuario por email → resolver → reintentar process label o marcar refund.

**5. Ejecutar refund con flags apagados**

Con `ENABLE_LABEL_PAYMENT_REFUNDS=false`:
1. Admin va al Stripe Dashboard → encuentra payment intent → ejecuta refund manual.
2. Vuelve al panel → "Mark refunded manually" con nota del refund.
3. Orden pasa a `refunded`.

Con `ENABLE_LABEL_PAYMENT_REFUNDS=true` y admin allowlisted:
1. Admin → "Refund via Stripe" → ingresa razón → confirma con "REFUND".
2. Sistema llama `refunds.create()` con idempotency key `label-refund-{orderId}`.
3. Si Stripe OK → orden pasa a `refunded`.
4. Si Stripe falla → orden vuelve a `refund_needed` con `refund_error_message`.

**6. Expirar órdenes viejas en masa**

Admin → `/admin/label-orders` → botón "Expire stale".
Llama `POST /api/admin/label-orders/expire-stale`.
Solo expira `pending_payment` con `expires_at < now()` y `paid_at IS NULL`.
No toca órdenes pagadas ni terminales.
Devuelve count de expiradas.

**7. Verificar que no hay doble proceso/refund**

Process label: `claimPendingLabelOrderForPurchase` hace UPDATE atómico con condición en status + `label_id IS NULL` + `tracking_number IS NULL`. Solo uno puede ganar.
Refund: idempotency key `label-refund-{orderId}` en Stripe. Si ya existe, Stripe devuelve el refund original.
Mark refunded manual: requiere que status sea MANUAL_REFUNDED_STATUSES; si ya es `refunded` retorna sin cambios.

---

## FASE 5.53 — Wallet Payment for Labels

### Design

Wallet label purchase uses the EXISTING `/api/labels` endpoint and `create_label_shipment_transaction` RPC. No new tables or migrations are required.

**Flow:**
1. User opens ConfirmModal — balance is fetched via `getAvailableBalance()`
2. If `walletBalance >= customerPrice`: "Pay with wallet" is available
3. User confirms → `handleConfirmed()` → `POST /api/labels` → carrier purchase → RPC debit
4. RPC atomically validates balance ≥ amount, creates shipment + balance_movement

**Payment fee note:** Wallet payments currently use `customerPrice` (which includes the Stripe payment fee). This is consistent with existing pricing. A future optimization can remove the payment fee for wallet-only transactions.

### Safety invariants for wallet label purchase

| Risk | Mitigation |
|---|---|
| Balance goes negative | RPC validates `balance >= p_customer_price` before inserting debit |
| Double debit on retry | `idempotency_key` unique constraint on `balance_movements`; client generates a stable key per purchase intent |
| Balance insufficient at RPC time (race condition) | RPC check is inside a DB transaction; concurrent requests cannot both succeed |
| Carrier label purchased but RPC fails | Client receives an error; admin can manually reconcile. Future work: auto-void carrier label on RPC failure. |

### Payment method coexistence

Both payment methods remain active simultaneously:
- **Wallet** — `POST /api/labels` (always available if balance sufficient)
- **Stripe direct** — `POST /api/billing/label-checkout` (requires `ENABLE_DIRECT_LABEL_PAYMENT=true` + feature gate)

No flags changed. Direct payment still fully operational.

---

## FASE 5.54 — Pricing Margin Controls

### Pricing model

```
customer_price = provider_cost + max(min_markup, provider_cost × markup_pct) + (subtotal × fee_pct + fee_fixed)
```

Defaults: 6% markup / $0.99 minimum / 2.9%+$0.30 payment fee. All configurable via env vars (no env file modified).

### Mismatch prevention

The server always recalculates `customer_price` from `provider_cost` before creating a Stripe Checkout Session. The client-sent `customerPrice` in the rate snapshot is cross-checked; a console warning is logged if the divergence exceeds $1.00, but pricing always uses the server computation.

### Safety invariants

| Risk | Mitigation |
|---|---|
| Client manipulates `customerPrice` | Server ignores client `customerPrice`; recomputes from `providerCost` |
| Markup config drift between quote and payment | Server always applies current config at checkout time; user sees rate from quote |
| Negative margin | `calculatePlatformMarkup` uses `max(min_markup, ...)` — markup never below `$0.99` |
| Floating-point money | `roundMoney(toFixed(2))` throughout; all amounts are integer cents in DB |
| Payment method unknown after purchase | `pricing_breakdown.paymentMethod` set to `"wallet"` or `"card"` on every new shipment |

### What admin can see (FASE 5.54)

- Customer charged amount (`customer_price`)
- Provider carrier cost (`provider_cost`)
- Platform markup (`platform_markup`)
- Payment method (Wallet / Card) inferred from `pricing_breakdown.paymentMethod` or `pricing_model`
- Label and payment status badges

### What admin cannot see yet

- Payment fee breakdown (stored in `pricing_breakdown` JSON, not surfaced in table)
- Aggregate margin reports (no accounting dashboard in this phase)
- Historical orders before FASE 5.10 may have `provider_cost = null`

---

## FASE 5.55 — Multi-country Domestic Shipping Readiness

### Operating mode

SendiFlash now supports selected **domestic-by-country** markets at the validation and provider payload layer. It does not support cross-border/international shipping yet.

Supported initial domestic markets:
- `US` — United States
- `CA` — Canada
- `ES` — Spain
- `DE` — Germany
- `FR` — France
- `GB` — United Kingdom (`UK` normalizes to `GB`)

### Go conditions

- Origin and destination countries are the same.
- Country is in the supported domestic allowlist.
- Provider returns a USD rate.
- Existing pricing/margin rules produce a valid customer price.
- Label purchase still revalidates server-side.

### No-go conditions

- Origin and destination countries differ.
- Country is not in the supported allowlist.
- Provider returns no usable rates for that market.
- Provider returns non-USD pricing.
- Any route requires customs, duties, taxes, export documents, or cross-border handling.

### Safety invariants

| Risk | Mitigation |
|---|---|
| Cross-border route enters provider checkout | Central `validateDomesticShipmentCountries()` blocks before rates, checkout, wallet label purchase, and label processing. |
| Unsupported country reaches provider | Country allowlist blocks it before provider calls. |
| `UK`/`GB` inconsistency | Country normalization maps `UK` to `GB`. |
| No provider setup for selected country | UI shows a friendly no-rate/market setup message and does not allow checkout. |
| Non-USD amount silently charged | Label checkout and label processor block non-USD snapshots. |

### Known limitations

- No customs/adduanas flow.
- No international shipping.
- No duties/taxes calculation.
- No multi-currency conversion.
- Carrier availability by country depends on existing provider/account setup.
- Google Places/manual address parsing remains intentionally lightweight; non-US users may need manual province/postal edits.

---

## FASE 5.56 — Selected Domestic Markets QA Decision

### Code-level decision

**PARTIAL / CODE PASS** as of commit `b346cf0`.

The domestic country allowlist and cross-border guardrails pass local QA:
- `US`, `CA`, `ES`, `DE`, `FR`, `GB` same-country routes pass validation.
- `UK` normalizes to `GB`.
- Cross-border combinations are blocked before rates.
- Unsupported countries such as `EC` and `MX` are blocked before rates.
- Checkout, wallet label purchase, and label processing revalidate the same domestic rule.
- USD-only payment handling remains enforced.

### Production go criteria per market

A selected domestic market should be treated as commercially usable only after an operator confirms:
1. Same-country address entry works in browser.
2. Provider account returns at least one usable USD rate.
3. Card or wallet checkout charges the displayed server-computed price.
4. Automatic label purchase succeeds.
5. Shipment appears in `/envios` and detail/PDF status works.

### Provider setup expectation

Passing SendiFlash validation does not guarantee the connected provider/carrier account can rate or buy labels in that country. If no rates return, the correct beta behavior is to show the market setup message and prevent checkout.

---

## FASE 5.57 — Controlled Beta Readiness

### Release posture

SendiFlash is ready for **controlled beta onboarding** after operator verification. The product now includes onboarding guidance, support/FAQ copy, and beta policy placeholders so invited users have a clear path from signup to first label.

### Go conditions

- Dashboard welcome panel is visible after login.
- `/crear-guia` explains the four-step shipment flow and domestic-only rule.
- `/support` explains wallet vs card, label download, label under review, domestic markets, and manual support review.
- `/terms`, `/privacy`, and `/support-policy` exist as beta placeholders.
- Automatic label processing remains controlled by `ENABLE_PROCESS_LABEL_IN_WEBHOOK=true`.
- Refunds and voids remain disabled by default flags and are support/admin-reviewed.

### No-go conditions

- Any raw provider/Stripe error is shown to normal users.
- Support/legal pages are missing or inaccessible.
- International/customs/duties/taxes are implied as supported.
- Refunds or voids become automatic.
- Env files, credentials, or provider setup are changed in code.

### Known beta limitations to communicate

- Selected domestic markets only.
- Provider/account setup may still limit non-US rate availability.
- USD-only pricing and payments.
- Manual support review for label exceptions, refunds, and voids.

---

## FASE 5.58 — Final Controlled Beta Deployment Gate

### Decision

**PARTIAL** until production is redeployed to latest `main` (`df6748f` or newer) and the post-deploy route checks pass.

### What is ready

- Production config/status reports expected beta flags:
  - direct label payment enabled
  - real label purchase enabled
  - process label in webhook enabled
  - label void disabled
  - label payment refunds disabled
- Main deployed routes return 200 with no observed 500/502.
- Local build generates the new beta support/legal routes.
- No code/env changes are needed for the support/legal 404s; they indicate production is behind latest main.

### Blocking release item

Production currently returns 404 for routes added in `df6748f`:
- `/support`
- `/terms`
- `/privacy`
- `/support-policy`

Do not invite beta users until these routes return 200 after redeploy.

### Post-redeploy go criteria

- Latest `main` deployed.
- `/support`, `/terms`, `/privacy`, `/support-policy` return 200.
- `/api/config/status` still shows expected beta flags.
- One card or wallet label purchase reaches `label_purchased`.
- Admin exception panel remains accessible to admin only.

---

## FASE 5.59 — Commercial UX and Earnings Controls

### Go conditions

- `/crear-guia` draft persists across Stripe redirects without storing payment data.
- Product type `Other` requires a clear product description.
- Rates loading shows progress-oriented copy and compact summary.
- Wallet recharge supports safe custom amounts from `$5` to `$500`.
- Card checkout opens in a new tab or falls back safely.
- Wallet and card options remain visible in the payment modal.
- Pricing gross-up recovers the configured card processing fee on the final total.
- Admin overview shows beta label mode and profitability snapshot.

### No-go conditions

- Negative, zero, or above-limit recharge reaches Stripe Checkout.
- Custom recharge accepts more than two decimals.
- Draft persistence stores secrets or payment/card data.
- Card payment hides when wallet has balance.
- Cross-border/customs/international claims are introduced.
- Profit reporting is presented as final accounting rather than beta estimate.

### Pricing invariant

For FASE 5.59, the displayed customer price is still shared by wallet and card. It includes:

```
provider_cost + platform_markup + grossed_up_payment_fee
```

The gross-up is calculated in integer cents:

```
customer_total_cents = ceil((pricing_subtotal_cents + fixed_fee_cents) / (1 - fee_pct))
payment_fee_cents = customer_total_cents - pricing_subtotal_cents
```

This keeps displayed price, Stripe charge, wallet debit, `pending_label_orders`, and admin shipment pricing aligned.

### Deferred

- Batch/multilabel purchase.
- Wallet-specific no-card-fee pricing.
- Full accounting dashboard.
- Automatic refunds/voids.

---

## FASE 5.60 — Controlled Multi-Label Beta Flow

### Go conditions

- `/crear-guia` shows both `Single shipment` and `Multiple shipments`.
- Single shipment remains the default path.
- Batch mode allows up to 5 shipments with one shared origin.
- Each batch row validates domestic-only country rules before rates.
- Each batch row can fetch rates and select one valid rate.
- Checkout remains blocked until every row has a selected ready rate.
- Wallet batch purchase keeps successful rows saved and stops on first failed row.
- Card batch checkout opens one Stripe Checkout tab per shipment under a shared `batchId`.
- Admin/order metadata can identify batch-created labels.
- User result links point to shipment detail and My Shipments when labels are ready.

### No-go conditions

- Cross-border routes reach provider rates.
- Unsupported countries reach provider rates.
- Batch checkout trusts a client-only final price.
- Batch draft stores card/payment data.
- A failed wallet row silently charges remaining rows.
- Card batch is presented as a single combined Stripe payment.
- CSV import, customs, or international shipment copy appears as supported.

### Known beta limitations

- Batch limit is 5 shipments.
- Card batch payment is multiple per-shipment Checkout sessions, not one consolidated payment.
- Wallet batch purchase is sequential and not a full all-or-nothing database transaction.
- CSV/Excel import and larger bulk workflows remain deferred.
- International/customs remains intentionally unsupported.

### Create Guide UX refinements

- Single-shipment Get Rates uses balanced From/To cards on desktop and stacked cards on mobile.
- Name and Phone are separated vertically for readability.
- Phone input includes a selected-market calling code selector.
- Rate search collapses into a compact From / To / Package summary bar.
- Rates render as responsive grid cards instead of a long plain list.
- Card checkout must keep `/crear-guia` open when the new Stripe tab opens successfully.

---

## FASE 5.62 — Auth Beta Readiness

### Go conditions

- Login and registration use the professional SendiFlash auth layout.
- Signup collects first name, last name, company, phone, default market, business type, email, password, confirmation, and terms acceptance.
- Additional signup fields are stored in Auth metadata without requiring a database migration.
- Forgot password and verification links remain available.
- Already-signed-in registration state shows dashboard and sign-out actions.
- reCAPTCHA is verified server-side when configured.

### No-go conditions

- Captcha secret is exposed client-side.
- Signup silently skips captcha in production when captcha is configured incorrectly.
- Auth UX claims international/customs support.
- Shipping, wallet, payment, label, refund, or void logic changes as part of auth polish.

### Operator setup

- Optional captcha public key: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- Required server secret when captcha is enabled: `RECAPTCHA_SECRET_KEY`.
- Profile module remains pending; only `business_name` is written to `profiles` in this phase.

---

## FASE 5.63 — Profile / Account Settings

### Go conditions

- `/perfil` is accessible only to signed-in verified users.
- Dashboard navigation includes Profile.
- Users can view email and created date.
- Users can update first name, last name, phone, company, market, business type, preferred payment method, default product type, and support email.
- Company name syncs to `profiles.business_name`.
- Other profile/preferences fields save to Supabase Auth metadata.
- Password reset links to existing email reset flow.

### No-go conditions

- Email changes are presented as supported.
- Profile edits touch shipping, payment, wallet, provider, refund, or void logic.
- Profile data includes secrets or payment details.
- A migration is added without a specific storage need.

---

## FASE 5.64 — Dashboard UX Redesign

### Go conditions

- `/dashboard` presents a compact SendiFlash operating cockpit.
- Header greets the user with business name when available, otherwise email prefix.
- Quick actions link to Create shipment, Multi-label beta, Add balance, My Shipments, Profile, and Support.
- Dashboard metrics show shipments, estimated spend, active shipments, available balance, labels purchased, and issues.
- Recent activity combines user shipments and wallet movements without exposing raw metadata.
- New-user onboarding prompts highlight first shipment, wallet balance, profile completion, and support guide.
- Operational status explains automatic labels, selected domestic routes, wallet/card payments, and support review.

### No-go conditions

- Dashboard widgets change payment, shipping, wallet, label, provider, refund, or void business logic.
- Normal users see admin-only pending order metadata or raw provider errors.
- The redesign reintroduces wide/marketing-style layout constraints inside the app shell.
- A migration or new dashboard API is added without a storage/API requirement.

### Data limitations

- Dashboard issue count currently uses available shipment label statuses such as `failed` and `voided`.
- Admin exception analytics and full pending-label-order review remain in `/admin/label-orders`.

---

## FASE 5.65 — SendiFlash Prep Managed MVP

### Go conditions

- Prep is isolated from shipping label purchase, wallet, Stripe label payments, refunds, voids, and provider logic.
- Proposed migration creates only `prep_*` tables and Prep enums.
- Customers can create Prep requests from `/prep/new`.
- Customers can list/view only their own Prep orders.
- Customer timeline only includes `visibility='customer'` events/documents.
- Admin can list Prep requests at `/admin/prep-orders`.
- Admin can update Prep status, receiving reference, estimated/final price, partner cost, margin, admin notes, and internal partner references.
- Admin can add customer-visible or internal-only events.

### No-go conditions

- Customer sees partner name, partner reference, partner cost, margin, admin notes, or internal events/documents.
- Prep copy claims AI/API automation, Amazon SP-API support, owned warehouses, guaranteed lowest price, or automated partner integration.
- Prep adds payment collection before a dedicated payment phase.
- Prep changes existing label/wallet/refund/void/provider behavior.

### Deferred

- Prep payments.
- n8n automation.
- AI assistant.
- Amazon SP-API.
- Partner API integration.
- Customer document upload and storage workflow.

---

## FASE 5.66 — Prep Admin Operations and Pricing Workflow

### Go conditions

- Admin detail clearly shows order summary, customer/contact, items, requested services, pricing/margin, partner/internal workflow, receiving reference, status controls, and events.
- Admin can update estimated unit price, estimated total, final unit price, final total, partner cost total, and margin total.
- Admin UI calculates quote/margin helpers while preserving manual override fields.
- Status changes can add a customer-visible or internal timeline event.
- Customer detail shows current status, next step, estimate/final quote, receiving reference when relevant, and customer-visible timeline.
- Admin list supports status filter and search by business/email/product/order UUID.

### No-go conditions

- Customer sees partner name/reference, partner cost, margin, admin notes, internal events, or internal documents.
- Prep payment is collected before the dedicated Prep payment phase.
- AI, n8n, Amazon SP-API, or partner API automation is presented as active.
- Existing shipping label, wallet, payment, refund, void, or provider behavior changes.

---

## FASE 5.67 — Prep Quote Acceptance and Payment

### Go conditions

- `prep_orders` has payment tracking fields for status, method, paid amount/date, Stripe references, payment reference, and quote acceptance time.
- Customer can pay a final Prep quote by wallet when balance is sufficient.
- Customer can pay a final Prep quote by Stripe Checkout card.
- Prep card checkout uses Stripe metadata `type=prep_order` and `prep_order_id`.
- Stripe webhook handles Prep payments without breaking wallet recharge or label direct payment handlers.
- Paid Prep orders show `payment_status=paid`, method, paid amount, and paid date.
- Customer endpoints never return partner cost, margin, partner reference, admin notes, or internal events.

### No-go conditions

- Prep refunds are presented as supported.
- Prep payment changes label checkout, label processing, wallet recharge, refunds, voids, or provider behavior.
- Customer can pay an order that is cancelled, completed, missing a final quote, or already paid.
- Stripe secret, Supabase service role, or provider credentials are exposed.

### Deferred

- Prep refunds/manual adjustments.
- Prep invoice/accounting workflow.
- n8n automation.
- AI assistant.
- Partner API integration.
- Amazon SP-API.

---

## FASE 5.68 — Public Homepage Two-Service Positioning

### Go conditions

- Homepage hero clearly communicates two services: SendiFlash Shipping and SendiFlash Prep.
- `DashboardHeroVisual` replaces SVG hero with a professional UI preview card.
- `TwoServicesSection` explains each service with accurate feature bullets and honest copy.
- `SellerToolsSection` links to existing authenticated routes (auth guard handles redirects).
- Header nav includes "Services" link.
- Footer includes "FBA Prep" link.
- Copy is honest: manual-managed prep, final quote may vary, domestic shipping in selected markets.
- No payment/shipping/Prep logic changed.

### No-go conditions

- Homepage claims AI automation, international shipping, or guaranteed lowest prices.
- Homepage exposes partner name, partner cost, or internal admin fields.
- Any migration, secret, provider credential, or auth logic is changed.
- Label or Prep payment logic is changed.

### Deferred

- Public Prep landing page with full service details (dedicated `/prep-info` page).
- Pricing calculator for Prep services.
- International shipping expansion.

---

## FASE 5.69 — Go/No-Go: Dedicated service pages and absolute anchor navigation

**Date:** 2026-05-29

### Go conditions

- [x] Header anchor links are absolute (`/#services`, etc.) — work from all public pages.
- [x] `/shipping-labels` route builds and renders without errors.
- [x] `/fba-prep` route builds and renders without errors.
- [x] Homepage hero secondary CTA points to `/fba-prep`.
- [x] TwoServicesSection service cards link to `/shipping-labels` and `/fba-prep` with secondary tool actions.
- [x] Footer Product column includes `/shipping-labels` and `/fba-prep`.
- [x] `/fba-prep` page includes transparency disclaimer about manual management and quote variation.
- [x] `/shipping-labels` page includes domestic-scope notice ("selected markets", no international).
- [x] No AI automation, SP-API, AMZ Prep, partner cost, or internal workflow exposed.
- [x] No payment/wallet/label/Prep business logic changed.

### No-Go conditions

- [ ] Any of the new pages expose partner cost, margin, internal notes, or third-party branding.
- [ ] Any business logic in `/api/*`, Prep payment, wallet, label purchase, or auth changed.
- [ ] Lint or build fails.
