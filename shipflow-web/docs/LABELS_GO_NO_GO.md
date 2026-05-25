# Labels Go/No-Go Checklist

Checklist de requisitos antes de activar `ENABLE_REAL_LABEL_PURCHASE=true`.

Última revisión: 2026-05-24 (FASE 5.45)

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

- [ ] Rate snapshot guardado en pending_label_orders (migración aplicada)
- [ ] Provider rate ID validado antes de crear label
- [ ] Address validation completa — street1, city, state, ZIP para origen y destino
- [ ] Idempotency key definida por purchase intent (`idempotencyKeyRef`)
- [ ] Label purchase **solo** server-side — cliente nunca compra label directamente
- [ ] Frontend nunca ejecuta label purchase por success_url de Stripe — siempre vía webhook
- [ ] Label purchase real probada en sandbox con saldo disponible
- [ ] Label URL o base64 retornada y descargable
- [ ] Tracking number guardado en shipments
- [ ] `createShipEngineShipment` probado end-to-end en modo sandbox antes de activar
- [ ] `SHIPSTATION_API_MODE=shipengine` confirmado en entorno de producción

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
- [ ] **PENDIENTE:** Si ENABLE_REAL_LABEL_PURCHASE=true → compra label server-side (FASE 5.39C)
- [ ] **PENDIENTE:** Caso pago exitoso + label falla → status `action_required` o `refund_needed`
- [ ] **PENDIENTE:** Caso pago exitoso + label ya comprada (idempotency) → ignorar sin double-credit
- [ ] **PENDIENTE:** Probar webhook con evento label_direct_payment en sandbox antes de activar

---

## 5. Admin y Soporte

- [x] Lista de `pending_label_orders` accesible para admin sin exponer secrets (FASE 5.39C)
- [x] Filtros por status, provider, y búsqueda por session/PI/tracking (FASE 5.39C)
- [x] Detalle de orden con snapshots JSON colapsables, sin secrets (FASE 5.39C)
- [x] Acciones admin: mark_action_required, mark_refund_needed, mark_expired (FASE 5.39C)
- [x] Error message visible en detalle sin exponer API keys (FASE 5.39C)
- [x] Expiry sweep manual: POST /api/admin/label-orders/expire-stale (FASE 5.39C)
- [x] Refund foundation documentada — flujo refund_needed → refund_pending → refunded (FASE 5.39C)
- [ ] **PENDIENTE:** Lista de labels con `label_failed` accesible para soporte (FASE 5.39D+)
- [x] Flujo de refund real por admin detrás de `ENABLE_LABEL_PAYMENT_REFUNDS=false` (FASE 5.40D)
- [ ] **PENDIENTE:** Flujo de void documentado — solo con `ENABLE_REAL_LABEL_VOID=true` y solo shipments "purchased"
- [ ] **PENDIENTE:** Cron/worker para expiry automático (actualmente sweep manual)

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
- [ ] **PENDIENTE:** Migración aplicada en Supabase staging — ejecutar runbook en `docs/DEPLOYMENT.md`
- [ ] **PENDIENTE:** Migración aplicada en Supabase producción (solo después de QA en staging)
- [ ] **PENDIENTE:** Verificar con queries de `docs/DEPLOYMENT.md` tras aplicar migración
- [ ] **PENDIENTE:** `void_label_refund_transaction` RPC funcionando correctamente (ya probado en FASE 4D)

---

## 8. QA Final Antes de Activar

- [ ] Probar flujo completo en staging: registro → verificación → recarga → cotizar → comprar label → descargar
- [ ] Verificar que saldo se reduce correctamente después de compra
- [ ] Verificar que tracking number aparece en /envios y /guia/[tracking]
- [ ] Verificar que void (si ENABLE_REAL_LABEL_VOID=true) devuelve saldo correctamente
- [ ] Correr `npm run build` limpio en entorno de staging
- [ ] Revisar logs de producción 30 minutos después de activar

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
| `action_required` | Revisión de soporte necesaria | "Tu pago fue recibido, pero el envío requiere revisión de soporte." | Mark refund_needed, Refund, Mark refunded manually | No |
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
