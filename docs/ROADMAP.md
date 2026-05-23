# Roadmap ShipFlow

## FASE 0 - Documentacion base

Objetivo:

- Crear contexto tecnico estable.
- Documentar arquitectura actual.
- Documentar riesgos.
- Documentar plan de integracion logistica.
- Ahorrar tokens en futuros chats.

Estado:

- En progreso/completada con los documentos base.

## FASE 1 - Seguridad, RLS, base y dinero

Objetivo:

- Corregir riesgos criticos antes de conectar proveedores reales.

Tareas:

- Bloquear escalacion de `role`.
- Corregir policies de `profiles`.
- Impedir recargas arbitrarias en `balance_movements`.
- Definir ledger financiero seguro.
- Preparar campos de provider, status e idempotencia.
- Revisar RLS de `shipments`, `tracking_events` y `couriers`.
- Definir reglas para admin.

Estado:

- FASE 1A: preparada en SQL.
- FASE 1B: endpoint web para crear guia interna.
- FASE 1C: migracion incremental para base logistica, idempotencia, webhooks y auditoria.
- FASE 1D: migracion revisada y checklist de aplicacion manual preparado.
- Pendiente: aplicar migracion en Supabase con backup, probar RLS y crear RPC transaccional.

## FASE 2 - Backend API real

Objetivo:

- Mover operaciones sensibles a backend.

Endpoints esperados:

- `GET /api/shipments`
- `GET /api/shipments/[id]`
- `POST /api/rates`
- `POST /api/labels`
- `POST /api/labels/[id]/void`
- `GET /api/balance`
- Endpoints seguros de pagos/recargas si aplica.

Reglas:

- Validar sesion.
- Validar permisos.
- Calcular precios server-side.
- Usar transacciones.
- Usar idempotencia.

Estado:

- Endpoints internos de shipments, rates, labels, void interno y balance preparados con logica local/mock.
- `POST /api/tracking` endurecido con carrier allowlist y auth opcional compatible.
- Pendiente: RPC transaccional, pagos/recargas reales y migracion mobile.

## FASE 3 - Logistics adapters

Objetivo:

- Crear capa de adapters para proveedores logisticos.

Propuesta:

```text
shipflow-web/lib/logistics
├── adapters
├── registry.ts
├── pricing.ts
├── types.ts
└── errors.ts
```

Estado:

- UI desacoplada de proveedores.
- `MockAdapter`/internal creado y conectado a rates/labels internas.
- `ShipStationAdapter` creado solo como skeleton sin llamadas reales.
- `registry.ts`, `pricing.ts`, `types.ts` y `errors.ts` creados.
- ShipStation real queda para FASE 4.
- Otros proveedores posibles despues.

## FASE 4 - ShipStation real

Objetivo:

- Integrar ShipStation para rates y labels reales.

### FASE 4A - Rates reales (completada)

Tareas completadas:

- `ShipStationAdapter.getRates()` implementado con llamada real a ShipStation V1 API.
- Autenticacion Basic Auth server-side desde `SHIPSTATION_API_KEY` y `SHIPSTATION_API_SECRET`.
- Normalizacion de respuesta a `RateResult[]` con pricing breakdown.
- Manejo de errores: auth, rate limit, payload invalido, timeout, sin rates.
- `/api/rates` acepta `provider: "shipstation"` en el body para usar rates reales.
- Default sigue siendo internal/mock.
- `createLabel`, `voidLabel`, `trackShipment` devuelven `NOT_IMPLEMENTED` (501).
- Nuevas clases de error: `ProviderAuthError`, `ProviderRateLimitError`, `InvalidPayloadError`.

ADVERTENCIA: No usar en produccion con cobros hasta completar FASE 4B (labels reales, balance transaccional).

### FASE 4B - Labels reales (completada)

Tareas completadas:

- `ShipStationAdapter.createLabel()` implementado usando ShipStation V1 API.
  - Flujo: `POST /orders/createorder` (idempotente via orderKey) → `POST /orders/createlabelfororder`.
  - Mismo base URL y auth que FASE 4A (V1 legacy: ssapi.shipstation.com, Basic Auth).
  - Normaliza respuesta a `LabelResult` con `providerShipmentId`, `providerLabelId`, `providerServiceCode`.
  - `labelUrl = null`: ShipStation V1 no devuelve URL directa, solo `labelData` en base64.
- `LabelResult` y `CreateLabelInput` ampliados con campos de provider.
- `ShipmentRow` ampliado con todos los campos de provider de FASE 1C.
- Nuevo `createShipStationShipment.ts` con validacion, idempotencia, balance check, persistencia secuencial y manejo de errores criticos.
- `/api/labels` acepta `provider: "shipstation"` y ejecuta el flujo real.
- Nuevo migration SQL `20260514_create_label_transaction_rpc.sql` con RPC atomica preparada (no ejecutada).

Deuda tecnica:

- Inserts secuenciales (no atomicos); activar la RPC para atomicidad real.
- `labelUrl` siempre null para ShipStation V1.
- NO usar con cobros reales hasta activar la RPC y verificar con pruebas manuales.

ADVERTENCIA: Esta fase puede comprar labels reales en ShipStation si `SHIPSTATION_API_KEY` esta configurada. Probar solo con cuentas de prueba hasta completar la RPC atomica.

### FASE 4C - Void/cancel real

Renombrada a FASE 4D.

### FASE 4D - Transaccion atomica, labelData y void/refund real (completada)

Tareas completadas:

- `createShipStationShipment.ts` reescrito para usar la RPC `create_label_shipment_transaction` via `service_role`. No vuelve a inserts secuenciales para provider shipstation.
- `SUPABASE_SERVICE_ROLE_KEY` ahora requerida en backend; se verifica ANTES de comprar el label.
- `createServiceSupabaseClient()` e `isServiceRoleConfigured` agregados a `supabaseServer.ts`.
- `isRpcNotFoundError()` agregado a `apiResponse.ts`.
- `ShipStationAdapter.voidLabel()` implementado: `POST /shipments/{shipmentId}/voidlabel` en ShipStation V1. Maneja 401/403/404/429/5xx.
- `VoidLabelInput` ampliado con `providerShipmentId?` para void sin ambiguedad.
- `LabelResult` ampliado con `labelData?` (base64 PDF de V1; no almacenado en DB).
- `ShipStationShipmentResult` ampliado con `labelData`.
- Migration `20260514_create_label_transaction_rpc.sql` mejorada: agrega `p_label_format`, validacion `p_customer_price > 0`, y nueva funcion `void_label_refund_transaction`.
- `/api/labels/[id]/void` actualizado: maneja provider shipstation via void SS + RPC refund atomico.
- `.env.example` actualizado con `SHIPFLOW_LABELS_BUCKET` y `SHIPFLOW_LABELS_PUBLIC_BASE_URL`.

Pendiente antes de produccion:

- Aplicar migration SQL manualmente en Supabase.
- Configurar `SUPABASE_SERVICE_ROLE_KEY` en servidor.
- Probar flujo completo con cuenta ShipStation de prueba.
- Supabase Storage para label PDFs permanentes (futuro).

### FASE 4E — Validacion real controlada (completada)

Objetivo:

- Preparar proceso seguro de aplicacion de migraciones y prueba real controlada con ShipStation.

Tareas completadas:

- Revision de migraciones (orden, dependencias, seguridad, permisos RPC).
- Identificado requisito: `balance_movements.id` debe ser tipo `text` para la RPC.
- Nuevo checklist: `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`.
  - Pre-checks: backup, entorno, variables, tipo de columna, cuenta de prueba ShipStation.
  - Orden de aplicacion: FASE 1C primero, luego FASE 4D RPC.
  - Verificaciones SQL post-migracion: columnas, funciones, permisos, RLS, policies.
  - Pruebas API paso a paso: balance, rates, saldo insuficiente, label real, idempotencia, void, idempotencia de void.
  - Curls de ejemplo con placeholders (sin secretos reales).
  - Tabla de errores esperados.
  - Checklist de aprobacion antes de produccion.

No se ejecutaron migraciones. No se modifico codigo.

ADVERTENCIA: No usar en produccion hasta completar el checklist de FASE 4E.

## FASE 5 - Tracking/webhooks reales (completada)

Objetivo:

- Sincronizar estados reales desde ShipStation via webhooks.

Tareas completadas:

- Endpoint `POST /api/webhooks/shipstation` creado.
- Validacion de secreto por header `x-shipflow-webhook-secret` o query `?secret=`.
- Comparacion de secreto en tiempo constante (anti-timing-attack).
- ShipStation envia payload ligero `{ resource_url, resource_type }`; se hace fetch a `resource_url` con ShipStation credentials para obtener datos reales.
- Guardado en `webhook_events` con `provider = "shipstation"` y `status` transitando: `received → processed` o `failed`.
- Deduplicacion via `event_id` (SHA-256 de `provider:resource_type:resource_url`) + indice unico de FASE 1C.
- Actualizacion de `shipments.status` y `shipments.label_status` segun estado de ShipStation.
- Insercion de `tracking_events` con `source = "shipstation_webhook"`, `is_real = true`, deduplicados por `shipment_id + source + status`.
- Idempotencia: segundo envio del mismo evento retorna `duplicate: true` sin insertar nada nuevo.
- Helper `lib/server/webhooks/shipstation.ts`: tipos, extraccion de secreto, validacion, fetch SS, normalizacion, mapeo de status.
- Checklist de prueba: `docs/SHIPSTATION_WEBHOOK_TEST_CHECKLIST.md`.

Variables nuevas:

```text
SHIPSTATION_WEBHOOK_SECRET   # REQUERIDA para validar webhooks entrantes
```

Nota: La tabla `webhook_events` ya existia desde FASE 1C. No se requirio migracion nueva.

## FASE 5.5 - Web UI operativa (completada)

Objetivo:

- Cerrar la experiencia web operativa antes de pasar a mobile.

Tareas completadas:

- `Envio` type extendido con campos `provider`, `labelStatus`, `paymentStatus`, `customerPrice`, `providerShipmentId` (opcionales).
- `fromShipmentRow` actualizado para mapear los nuevos campos.
- Nuevo `lib/services/apiClient.ts`: cliente autenticado para todos los endpoints propios.
- `shipmentService.ts`: `getShipments()` y `getShipmentByTrackingNumber()` usan `/api/shipments`.
- `balanceService.ts`: `getAvailableBalance()` y `getBalanceMovements()` usan `/api/balance`.
- `BalancePanel.tsx`: usa backend; boton de recarga solo en modo demo local.
- `ShipmentsTable.tsx`: muestra provider/label_status/payment_status/customer_price; boton "Anular" con confirmacion inline para labels ShipStation purchased.
- `CreateGuideForm.tsx`: selector de provider (internal/shipstation); flujo SS con fetch de rates reales, confirmacion explicita antes de label real, descarga de labelData como blob local; idempotencyKey estable por intento.
- `TrackingSearch.tsx`: badge "Real" y fuente del tracking.
- `PrintableGuide.tsx`: muestra provider, label_status y providerShipmentId.

Variables: ninguna nueva (usa las de FASE 4D y 5).

Pendiente antes de usar SS desde UI:

- Migraciones FASE 1C + FASE 4D en Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` y `SHIPSTATION_API_KEY/SECRET` en servidor.
- Checklist de prueba real.
- Supabase Storage para PDFs permanentes (futuro).

## FASE 5.6 - Quitar demo visible, ocultar providers y corregir diagnóstico Supabase (completada)

Objetivo:

- Eliminar toda referencia visible a implementación interna ("demo", "ShipStation", "internal", "provider") en la UI.
- Los proveedores son secretos internos del negocio; el usuario solo ve etiquetas comerciales.
- Mejorar el mensaje de error cuando Supabase no está configurado.

Tareas completadas:

- `CreateGuideForm.tsx`: reescrito con `QuoteMode = "standard" | "online"`. Selector muestra "Cotización estándar" / "Mejor tarifa disponible". Rates con tags "Más económico" / "Más rápido". Modal y descarga sin referencias a ShipStation. Secciones: Remitente, Destinatario, Paquete. Placeholders en español.
- `ShipmentsTable.tsx`: columna "Carrier / Provider" → "Carrier". Badge de provider eliminado. Columna "Label" → "Guía".
- `BalancePanel.tsx`: "Demo local" → "Modo local". "Recargar saldo (demo)" → "Recargar saldo".
- `PrintableGuide.tsx`: filas "Provider", "Provider ID" y "Label status" eliminadas.
- `supabaseServer.ts`: `getSupabaseConfigDiagnostic()` identifica variable faltante específica; mensajes de error mejorados.
- Documentación: CONTEXT.md y ROADMAP.md actualizados.

Validaciones: lint 0 errores, typecheck limpio, build exitoso (24 rutas).

## FASE 5.7 - Motor multi-provider (completada)

Objetivo:

- Crear la base del motor multi-provider sin decidir la fórmula matemática final.
- Mantener ShipStation como primer proveedor real.
- Preparar adapters skeleton para Shippo, EasyPost, Easyship.
- Ocultar providers al usuario; UI habla en términos comerciales.

Tareas completadas:

- `lib/logistics/types.ts`: `LogisticsProvider` extendido con `"shippo" | "easypost" | "easyship"`. Campo opcional `tags?: ("cheapest" | "fastest" | "recommended")[]` agregado a `RateResult`.
- `lib/logistics/providerCapabilities.ts` (nuevo): mapa de capacidades por provider con `configured`, `priority`, `supportsRates`, etc. Evalúa env vars al importar.
- `lib/logistics/rateAggregator.ts` (nuevo): consulta adapters configurados en paralelo, captura errores por provider, rankea resultados.
- `lib/logistics/rateRanking.ts` (nuevo): ranking provisional por precio y días. **TODO: modelo matemático final pendiente.**
- `lib/logistics/adapters/ShippoAdapter.ts` (nuevo): skeleton, lanza `ProviderUnavailableError`. Requiere `SHIPPO_API_KEY`.
- `lib/logistics/adapters/EasyPostAdapter.ts` (nuevo): skeleton. Requiere `EASYPOST_API_KEY`.
- `lib/logistics/adapters/EasyshipAdapter.ts` (nuevo): skeleton. Requiere `EASYSHIP_API_KEY` y `EASYSHIP_BASE_URL`.
- `lib/logistics/registry.ts`: actualizado con `normalizeProvider` y `getLogisticsAdapter` para los nuevos providers.
- `lib/services/apiClient.ts`: nuevo tipo `AggregatedRatesBody { mode: "best_available" }`, union `RatesBody`, `apiGetRates` acepta ambos.
- `app/api/rates/route.ts`: nuevo branch `mode: "best_available"` usa `aggregateRates()`. Branch ShipStation directo conservado para retrocompatibilidad.
- `components/CreateGuideForm.tsx`: modo "online" ahora envía `mode: "best_available"` al API (antes `provider: "shipstation"`).
- `.env.example`: stubs para `SHIPPO_API_KEY`, `EASYPOST_API_KEY`, `EASYSHIP_API_KEY`, `EASYSHIP_BASE_URL`.
- Docs: `LOGISTICS_INTEGRATION.md`, `ROADMAP.md`, `CONTEXT.md` actualizados.

Pendiente:
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Definir modelo matemático final de ranking y margen.
- Generalizar label creation para multi-provider (actualmente hardcoded para ShipStation en CreateGuideForm).

Validaciones: lint 0 errores, typecheck limpio, build exitoso (24 rutas).

## FASE 5.8 — Routing de provider correcto y multi-provider seguro (completada)

Objetivo:

- Eliminar hardcode de `"shipstation"` en creación de label.
- El flujo de cotización y creación de guía usa el provider real del rate seleccionado.
- Providers skeleton bloquean label creation con error controlado.

Tareas completadas:

- `lib/logistics/types.ts`: campo `providerRateId?` agregado a `RateResult` para metadata interna de rate por provider.
- `lib/services/apiClient.ts`: `SSLabelBody` → `CreateLabelBody` (provider genérico), `SSLabelResult` → `CreateLabelResult`, `apiCreateSSLabel` → `apiCreateLabel`.
- `components/CreateGuideForm.tsx`:
  - `handleConfirmed()` usa `selectedApiRate.provider`. Si provider es skeleton, muestra error: "Esta opción todavía no está disponible para generar guía."
  - `AvailableRatesList` usa `rate.tags` del servidor cuando disponibles; agrega badge "Recomendado"; key incluye `provider`.
- `app/api/labels/route.ts`: guard explícito → devuelve 501 para shippo/easypost/easyship sin fallback silencioso a ShipStation.
- Adapters skeleton: `_input` → `_` para reducir warnings de lint.
- Docs: CONTEXT.md, ROADMAP.md, LOGISTICS_INTEGRATION.md, ARCHITECTURE.md actualizados.

Pendiente:
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Definir modelo matemático final de ranking y margen.

Validaciones: lint 0 errores, typecheck limpio, build exitoso.

## FASE 5.9 — Pricing engine rentable, deduplicación inteligente y fee de pago (completada)

Objetivo:

- Motor de pricing real con margen rentable (markup + payment fee).
- Deduplicación inteligente de rates equivalentes de distintos providers.
- UI de tarifas estilo cotizador profesional.
- Desglose visible de precio en modal de confirmación.

Tareas completadas:

- `lib/logistics/pricing.ts`: Motor completo con `calculatePlatformMarkup()`, `calculatePaymentFee()`, `calculateCustomerPrice()`. Modelo: `markup = max(0.99, cost * 6%)`, `fee = subtotal * 2.9% + $0.30`, `total = subtotal + fee`. `applyMarkup()` conservado para retrocompatibilidad.
- `lib/logistics/rateDeduplication.ts` (nuevo): `deduplicateRates()` — agrupa por (carrier normalizado, servicio normalizado, días), conserva el rate con menor providerCost. Proveedor ganador y metadata interna preservados para label creation.
- `lib/logistics/types.ts`: `PricingBreakdown` extendido con `subtotal`, `paymentFee` (requeridos), campos opcionales de config snapshot.
- `lib/logistics/rateAggregator.ts`: Pipeline ampliado: raw rates → `repriceRate()` (pricing completo) → `deduplicateRates()` → `rankRates()`.
- `lib/logistics/rateRanking.ts`: Ranking con score ponderado `normalizedPrice * 0.65 + normalizedSpeed * 0.35`. cheapest/fastest/recommended bien delimitados.
- `lib/services/apiClient.ts`: `CreateLabelBody` += `platformMarkup?`, `paymentFee?` (informacionales para backend).
- `components/CreateGuideForm.tsx`:
  - Nuevas helpers `displayCarrier()` (mapea carrier code a nombre público) y `formatDelivery()`.
  - `AvailableRatesList`: cards profesionales con badges arriba, carrier visible (UPS/FedEx/etc.), entrega en días, precio grande.
  - `ConfirmModal`: desglose de precio (Envío + Cargo servicio + Cargo procesamiento de pago + Total).
  - `handleConfirmed()`: pasa `platformMarkup` y `paymentFee` al API.

Pendiente:
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Migrar schema para columna `payment_fee` separada en DB.
- Mover constantes de pricing a configuración DB/admin.

Validaciones: lint 0 errores, 16 warnings (mismos de antes), typecheck limpio, build exitoso (24 rutas).

## FASE 5.10 — Persistencia financiera de pricing (completada)

Objetivo:

- Persistir el desglose de pricing en columnas separadas en `shipments` para auditoría y pagos reales.
- Actualizar la RPC `create_label_shipment_transaction` con los nuevos campos financieros.
- Mostrar el desglose en la guía imprimible cuando los datos existen.
- Mantener compatibilidad con instalaciones sin migración aplicada.

Tareas completadas:

- `supabase/migrations/20260515_add_pricing_breakdown_to_shipments.sql` (nueva): Agrega `payment_fee`, `pricing_subtotal`, `pricing_model`, `pricing_breakdown` a `shipments`. Actualiza la RPC con 4 nuevos parámetros opcionales. Documenta que `void_label_refund_transaction` devuelve `customer_price` completo (incluyendo `payment_fee`).
- `lib/types.ts`: `Envio` += `providerCost?`, `platformMarkup?`, `paymentFee?`, `pricingSubtotal?`, `pricingModel?`, `pricingBreakdown?`.
- `lib/server/shipments/createInternalShipment.ts`: `ShipmentRow` += nuevas columnas; `fromShipmentRow()` mapea todos los campos; `createInternalShipment()` persiste los campos de pricing en `logisticsShipmentFields`.
- `lib/server/shipments/createShipStationShipment.ts`: `ShipStationLabelBody` += campos de pricing; `buildRpcParams()` usa valores del body (prioridad) o recalcula con fallback seguro via `calculateCustomerPrice()`; pasa `p_payment_fee`, `p_pricing_subtotal`, `p_pricing_model`, `p_pricing_breakdown` al RPC.
- `lib/services/apiClient.ts`: `CreateLabelBody` += `pricingSubtotal?`, `pricingModel?`, `pricingBreakdown?`.
- `components/CreateGuideForm.tsx`: `handleConfirmed()` pasa desglose completo al API.
- `components/PrintableGuide.tsx`: `PricingBlock` muestra desglose (Shipping + ShipFlow charge + Payment processing + Total) si los datos existen; fallback a total simple.

Pendiente:
- Implementar métodos reales en Shippo/EasyPost/Easyship adapters.
- Mover constantes de pricing a configuración DB/admin.

Validaciones: ver reporte final de validaciones.

## FASE 5.11 — Dirección inteligente, Google Places y bloqueo de cotizaciones falsas (completada)

Objetivo:

- Componente de dirección estructurada reutilizable.
- Google Places Autocomplete opcional (sin dependencias npm, con fallback manual).
- Bloquear cotizaciones online si falta Supabase o providers.
- Endpoint de salud de configuración.

Tareas completadas:

- `lib/types.ts`: nuevo tipo `StructuredAddress` con todos los campos de una dirección postal + metadata (source, validationStatus, placeId, lat/lng).
- `.env.example`: + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` con documentación (opcional, restringir por dominio, Maps JS + Places API).
- `app/api/config/status/route.ts` (nuevo): GET público que devuelve booleans de configuración. Nunca revela secrets.
- `lib/services/apiClient.ts`: + `ConfigStatus` type y `apiGetConfigStatus()` — fetch público sin auth, retorna todos `false` en caso de error.
- `components/AddressInput.tsx` (nuevo):
  - Props: `sectionLabel`, `value: StructuredAddress`, `onChange`, `requirePostal?`, `errors?`.
  - Con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: carga script Google Maps JS una sola vez (idempotente), inicializa `Autocomplete`, parsea `address_components` al seleccionar, muestra `validationStatus`.
  - Sin key: formulario manual limpio, mismos campos, ninguna llamada externa.
  - Tipos de Google Maps declarados inline con `declare global` (sin `@types/google.maps`).
- `components/CreateGuideForm.tsx` — refactorizado:
  - `FormState` usa `origin: StructuredAddress` y `destination: StructuredAddress`.
  - `AddressInput` integrado en modo standard y online.
  - `apiGetConfigStatus()` en mount. Banners de error solo en modo online.
  - Botón "Buscar tarifas" deshabilitado si Supabase no está configurado.
  - Hint "Tarifa estimada según dirección y paquete ingresados." en la lista de tarifas.
  - Aviso inline si falta ZIP al intentar generar guía.
  - Validación con `strict = false` para rates (solo ciudad), `strict = true` para label (postal + estado).
  - `handleFetchRates()` corta antes de llamar API si config inválida.

`AddressMapPicker` (pin en mapa + reverse geocoding): no implementado; pendiente fase futura.

Variables nuevas:
```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   # OPCIONAL — habilita Google Places Autocomplete
```

Validaciones: lint 0 errores, typecheck limpio, build exitoso (25 rutas).

## FASE 5.12 — EasyPost rates reales (completada)

Objetivo:

- Activar EasyPost como segundo provider real de cotizaciones.
- Labels siguen siendo solo ShipStation por ahora.

Tareas completadas:

- `lib/logistics/adapters/EasyPostAdapter.ts`: `getRates()` real implementado. Llama a `POST https://api.easypost.com/v2/shipments`. Auth: Basic Auth con `EASYPOST_API_KEY:`. Convierte peso a onzas y dimensiones a pulgadas. Normaliza rates de EasyPost a `RateResult[]`.
- `lib/logistics/providerCapabilities.ts`: EasyPost marcado `supportsLabels: false`, `supportsVoid: false` (rates únicamente).
- `RateAggregator`: ya consultaba EasyPost en `Promise.allSettled` — ahora tiene rates reales si `EASYPOST_API_KEY` está configurada.
- Pipeline multi-provider: `repriceRate → deduplicateRates → rankRates` aplica también a rates de EasyPost.
- Bloqueo de labels EasyPost en UI (`handleConfirmed`) y server (`/api/labels` → 501).
- UI: provider nunca visible. Solo carrier real (USPS, UPS, FedEx), precio final, entrega estimada.

Variables nuevas:
```text
EASYPOST_API_KEY=   # server-side only; nunca NEXT_PUBLIC
```

Validaciones: lint 0 errores, typecheck limpio, build exitoso.

## FASE 5.13 — Auth UX: verificación de correo (completada)

Objetivo:

- UX clara cuando el usuario no ha confirmado su email.
- Bloquear acciones sensibles hasta verificación.

Tareas completadas:

- `lib/types.ts`: `Usuario.emailVerified?: boolean` — nuevo campo.
- `lib/services/authService.ts`: `loginUser()`, `createUser()`, `getCurrentUser()` propagan `emailVerified` desde `user.email_confirmed_at`.
- `lib/services/authStatus.ts` (nuevo): `getEmailVerificationStatus()` y `resendVerificationEmail(email)` — helpers cliente.
- `contexts/AuthContext.tsx`: expone `emailVerified: boolean` en el contexto.
- `components/AuthCard.tsx`: registro → siempre a `/verifica-tu-correo`; login con email no verificado → `/verifica-tu-correo`.
- `app/verifica-tu-correo/page.tsx` (nueva): página de verificación con botón "Ya verifiqué" (revalida sesión), reenvío de correo, manejo de rate limit amigable.
- `lib/server/supabaseServer.ts`: `requireVerifiedUser()` — helper server-side que extiende `requireSupabaseUser()` con chequeo de `email_confirmed_at`. Lanza `Response("EMAIL_NOT_VERIFIED", 403)` si no está verificado.
- Endpoints protegidos con `requireVerifiedUser`: `/api/rates`, `/api/labels`, `/api/labels/[id]/void`, `/api/balance`, `/api/shipments`, `/api/shipments/[id]`.
- `lib/services/apiClient.ts`: exporta `isEmailNotVerifiedError(error)`.
- `components/CreateGuideForm.tsx`: muestra card de verificación si `!emailVerified`. Redirige a `/verifica-tu-correo` si la API responde `EMAIL_NOT_VERIFIED`.

Validaciones: lint 0 errores, typecheck limpio, build exitoso.

## FASE 5.14 — Cotizador premium con mapa/pin y mejor UX de dirección (completada)

Objetivo:

- AddressMapPicker con pin arrastrable y reverse geocoding.
- Tabs "Buscar dirección" / "Seleccionar en mapa" en AddressInput (solo con Google Maps key).
- Resumen compacto de dirección con badge "Completa / Revisar" en el formulario.
- Validación de rates exige city + state; label exige todos los campos postales incluida calle.
- Mensajes de usuario claros sin nombres internos de providers.

Tareas completadas:

- `lib/googleMapsUtils.ts` (nuevo): loader idempotente de Google Maps JS y parser de `address_components` compartidos entre componentes.
- `components/AddressMapPicker.tsx` (nuevo): mapa con pin arrastrable, reverse geocoding via `Geocoder`, `validationStatus` calculado.
- `components/AddressInput.tsx`: tabs Buscar/Mapa con `AddressMapPicker` integrado. Sin key: solo formulario manual sin cambios.
- `components/CreateGuideForm.tsx`: `validateOnlineRates` requiere `state`, `validateOnlineLabel` requiere `street1` del remitente, aviso suave de ZIP, `AddressSummary` en ambos modos, ConfigAlert sin nombres de providers.

Validaciones: lint, typecheck, build exitosos.

## FASE 5.15 — Shippo rates reales (completada)

Objetivo:

- Activar Shippo como tercer provider real de cotizaciones.
- Labels siguen siendo solo ShipStation por ahora.

Tareas completadas:

- `lib/logistics/adapters/ShippoAdapter.ts`: `getRates()` real implementado. Llama a `POST https://api.goshippo.com/shipments/` con `async: false`. Auth: `ShippoToken <SHIPPO_API_KEY>`. Convierte unidades de peso y dimensiones directo (sin transformaciones intermedias). Normaliza rates de Shippo a `RateResult[]`.
- `lib/logistics/providerCapabilities.ts`: Shippo corregido con `supportsLabels: false`, `supportsVoid: false` (rates únicamente — fix de error en skeleton que los tenía como `true`).
- `.env.example`: comentario de `SHIPPO_API_KEY` actualizado para indicar que rates están activos.
- `RateAggregator`: ya consultaba Shippo en `Promise.allSettled` — ahora tiene rates reales si `SHIPPO_API_KEY` está configurada.
- Pipeline multi-provider: `repriceRate → deduplicateRates → rankRates` aplica también a rates de Shippo.
- Bloqueo de labels Shippo en UI (`handleConfirmed`) y server (`/api/labels` → 501) — ya estaba implementado desde FASE 5.8.
- UI: provider nunca visible. Solo carrier real (USPS, UPS, FedEx, DHL), precio final, entrega estimada.

Variables requeridas:
```text
SHIPPO_API_KEY=   # server-side only; nunca NEXT_PUBLIC
```

Validaciones: lint, typecheck, build exitosos.

Pendiente (fase posterior):

- Labels EasyPost reales (`EasyPostAdapter.createLabel()`, `voidLabel()`).
- Labels Shippo reales (`ShippoAdapter.createLabel()`, `voidLabel()`).
- Labels multi-provider (selección automática del ganador de deduplicación).

## FASE 5.16 — Cotizador: flujo único real y dirección fácil (completada)

Objetivo:

- Convertir `/crear-guia` en un cotizador único de tarifas reales, simple y claro.

Tareas completadas:

- Eliminado selector visible de tipo de cotización.
- Eliminado comparador local de `couriers` en la UI.
- Botón único antes de rates: `Cotizar envío`.
- `CreateGuideForm` llama siempre `/api/rates` con `mode: "best_available"`.
- `AddressInput` permite pegar dirección completa y parsearla sin Google Maps.
- Google Places restringido a Estados Unidos cuando hay key.
- Botón visible `Seleccionar en mapa` solo cuando Google Maps está configurado.
- País fijo Estados Unidos y estado como select USA.
- Paquete completo: peso, largo, ancho, alto con defaults `1`.
- `/api/rates` valida calle, ciudad, estado, ZIP y dimensiones antes de consultar integraciones.
- Mensajes de no-rates más claros por configuración, dirección, paquete o falla de integraciones.
- Tabla `couriers` queda fuera del cotizador visible de precios finales.

Pendiente:

- Revisión final de compra de labels multi-provider.
- Mobile seguirá en FASE 6.

## FASE 5.17 — Revisión final web y limpieza de errores (completada)

Objetivo:

- Cerrar FASE 5 Web con auditoría de textos, flujo, validaciones y errores.

Tareas completadas:

- Auditoría de textos visibles para evitar referencias a providers internos, demo o cotización local.
- Copy de navegación, tabla de envíos y guía imprimible ajustado.
- Revisión de `/crear-guia`: un solo botón `Cotizar envío` antes de rates.
- Revisión de `AddressInput`: manual, dirección pegada, Places opcional, mapa opcional y US-only.
- Revisión de `/api/config/status`: solo booleans/counts.
- Revisión de `/api/rates`: usuario verificado, US-only, dimensiones positivas y RateAggregator.
- Revisión de `/api/labels`: guard 501 para tarifas sin label implementado; sin fallback silencioso.
- Guard adicional: `expectedCost` no puede ser menor que `providerCost` cotizado.

FASE 5 Web puede considerarse cerrada si lint/typecheck/build pasan en entorno local con npm disponible.

Pendientes siguientes:

- Labels multi-provider.
- Pagos reales.
- Storage permanente de labels.
- Mobile backend seguro.
- Deploy final.

## FASE 5.18 — Adapters reales de rates (completada)

Objetivo:

- Corregir los adapters reales según pruebas directas de APIs para que `/api/rates` consulte proveedores activos sin volver a fallback local visible.

Tareas completadas:

- ShipEngine/ShipStation sandbox: modo `SHIPSTATION_API_MODE=shipengine`, auth `API-Key`, `GET /carriers` y `POST /rates`.
- Shippo: `POST /shipments/` con `ShippoToken`, HTTP 201 considerado éxito, normalización de `rates[]`.
- Easyship: `POST /2024-09/rates`, Bearer token, item con `hs_code`, sin `courier_selection`.
- `/api/rates` devuelve errores claros cuando no hay integraciones activas o cuando no se encuentran tarifas reales.
- La UI bloquea generación de guía para rates con `supportsLabels: false`.

Pendiente:

- Labels reales para ShipEngine, Shippo, Easyship y EasyPost.
- EasyPost queda opcional hasta que exista `EASYPOST_API_KEY`.
- Prueba manual completa en `/crear-guia` con credenciales sandbox configuradas en servidor.

## FASE 5.20B — Real label flow design (completada)

Objetivo:

- Diseñar el flujo real de labels sin comprar labels ni activar providers de compra.

Tareas completadas:

- ShipEngine queda seleccionado como primer provider objetivo para labels reales.
- `ENABLE_REAL_LABEL_PURCHASE` sigue siendo el guard global: si no es `"true"`, `/api/labels` no compra, no descuenta balance y no crea shipment definitivo.
- ShipEngine labels quedan `planned` y `supportsLabels: false`.
- Shippo y Easyship quedan rates-only.
- Se prepara stub seguro `ShipEngineLabelAdapter` que no llama endpoints reales de compra.
- Se documenta contrato futuro `SelectedRateForLabelRequest`.

## FASE 5.20C — ShipEngine sandbox label purchase

Estado: implementada en codigo, pendiente de prueba manual sandbox por humano.

- Implementar compra sandbox de labels ShipEngine detrás de `ENABLE_REAL_LABEL_PURCHASE=true`.
- Revalidar rate server-side antes de compra.
- Validar saldo/precio/dirección/paquete en backend.
- Persistir via RPC transaccional.
- Mantener void/refund ShipEngine bloqueado hasta implementarlo y probarlo.

Pendiente posterior:

- Prueba manual con ShipEngine TEST key.
- Aplicar la migracion 5.20D para que la RPC acepte `provider_rate_id` y `label_url` dentro de la misma transaccion.
- Implementar void ShipEngine y refund confirmado.
- Storage permanente de label PDFs si `label_url` del provider no es suficiente para retencion.

## FASE 5.20D — Atomic label persistence hardening

Estado: implementada en codigo y SQL, pendiente de aplicacion manual de migracion.

- Crear migracion para ampliar `create_label_shipment_transaction`.
- Persistir `provider_rate_id`, `label_url`, `label_status` y `payment_status` dentro de la RPC.
- Eliminar update posterior de shipment despues de la RPC.
- Preflight de la RPC antes de comprar label ShipEngine.
- Bloquear retries con idempotency_key en estado ambiguo para evitar doble compra.
- Preparar estrategia de reconciliacion con request ID si provider compra OK pero DB falla.

Pendiente posterior:

- Aplicar migracion 5.20D manualmente en Supabase.
- Probar compra sandbox ShipEngine con `ENABLE_REAL_LABEL_PURCHASE=true` solo en local/test.
- Implementar void/refund ShipEngine en fase separada.
- Definir retencion/storage permanente de PDF si la URL del provider expira.

## FASE 5.20F — Label purchase success UX

Estado: completada en web, sin nueva compra sandbox durante la fase.

- Diferenciar carrier label oficial (`label_url`) de shipment summary interno.
- Mostrar `Download carrier label` en `/envios`, post-compra y detalle si existe `label_url`.
- Renombrar la pagina interna a `Shipment summary`.
- Eliminar QR vacio/falso y mantener tracking number/barcode visual.
- Mostrar estado post-compra claro con Label/Payment/Shipment separados.
- Mantener void/refund ShipEngine bloqueado.

Pendiente posterior:

- Probar de nuevo con el shipment sandbox existente.
- Implementar void/refund ShipEngine confirmado por provider.
- Webhooks/tracking carrier.
- Storage/retencion permanente de carrier label PDFs.

## FASE 5.20G — ShipEngine sandbox QA and edge-case hardening

Estado: completada sin comprar otra label.

- Reforzar doble click y estado `Purchasing label...`.
- Mejorar mensajes de saldo insuficiente, rate expirado, provider error e idempotencia ambigua.
- Mantener purchase bloqueado si `ENABLE_REAL_LABEL_PURCHASE` esta apagado.
- Confirmar `label_url` faltante sin botones rotos.
- Tracking search muestra Label/Payment y mensaje honesto sin eventos carrier.
- Balance UI conserva debit como `Carrier label purchase`.
- Void/refund ShipEngine sigue bloqueado.
- Google Maps legacy Autocomplete y deprecated Marker quedan documentados para fase futura.

Pendiente posterior:

- QA manual del shipment sandbox existente.
- Implementar void/refund ShipEngine en fase separada.
- Webhooks/tracking carrier.
- Reconciliacion persistente/audit logs para casos provider OK + DB fail.
- Migrar Google Maps a APIs nuevas.

## FASE 5.21 — Basic tracking experience

Estado: completada sin webhooks ni tracking realtime.

- `/api/tracking` busca shipments guardados por tracking number o id.
- Requiere usuario verificado y filtra por owner.
- Devuelve shipment, label/payment status, carrier/service, label URL y tracking events.
- `/tracking` soporta carga manual y `?trackingNumber=...`.
- `/envios` y shipment summary enlazan a tracking.
- Timeline preparado para futuros `tracking_events`.

Pendiente posterior:

- ShipEngine/carrier webhooks.
- Normalizacion de tracking events reales.
- Polling controlado si se decide.
- Notificaciones de tracking.

## FASE 5.22 — ShipEngine sandbox void/refund

Estado: implementada en codigo, pendiente de prueba sandbox manual.

- Agregar guard `ENABLE_REAL_LABEL_VOID`.
- Implementar ShipEngine void con `PUT /v1/labels/{label_id}/void`.
- Refund interno solo despues de `approved: true`.
- Persistir void/refund via RPC `void_label_refund_transaction`.
- Evitar doble refund mediante estado `voided` y movimiento `refund` existente.
- UI muestra `Void label`, `Voiding label...`, `Void is not enabled yet.` y estado voided/refunded.
- Balance UI muestra refund como `Carrier label void refund`.

Pendiente posterior:

- Probar void sandbox con la label existente.
- Reconciliacion persistente/audit log.
- Webhooks carrier.
- Void/refund multi-provider.

## FASE 5.23 — Balance and recharge design

Estado: preparada para beta sin pagos reales.

- `/api/balance` devuelve saldo disponible, movimientos y totales historicos.
- `/saldo` muestra Available balance, Total recharged, Total spent, Total refunded, Adjustments y Balance activity.
- `Add funds` no crea dinero. Solo informa que la recarga online no esta disponible y que soporte debe agregar fondos durante beta.
- No se creo endpoint publico para recargas.
- El ledger queda estandarizado:
  - `recharge`: credito confirmado por pago futuro o top-up manual sandbox.
  - `debit`: compra de label.
  - `refund`: void confirmado por provider.
  - `adjustment`: correccion manual/admin.
  - `fee`: cargo separado futuro si aplica.
- Stripe futuro debe acreditar saldo solo desde webhook confirmado, con idempotencia por event/payment intent.

Pendiente posterior:

- FASE 5.24: admin/support operations para ver usuarios, crear ajustes manuales, auditar cambios y reconciliar pagos.
- Stripe Checkout + webhook verificado.
- Reconciliacion para pago OK + DB fail.

## FASE 5.24 — Admin support operations

Estado: panel read-only preparado para beta.

- Admin guard server-side por `profiles.role = admin` o allowlist temporal `ADMIN_EMAILS`.
- Endpoints:
  - `/api/admin/access`
  - `/api/admin/overview`
  - `/api/admin/shipments`
  - `/api/admin/balance-movements`
- `/admin` muestra KPIs reales y bloque de reconciliation pending.
- `/admin/envios` muestra tracking, owner/email, recipient, carrier, label/payment status, total y acciones read-only.
- `/admin/saldo` muestra movimientos de balance con filtros por email/tracking/type.
- Couriers queda read-only.
- Manual adjustment queda deshabilitado.

Pendiente posterior:

- FASE 5.25 o posterior: manual adjustments con permisos fuertes y audit log.
- Reconciliation queue persistente.
- RBAC formal y permisos por accion.
- Stripe/recharge real.

## FASE 5.25 — Admin manual balance adjustments

Estado: implementada para beta cerrada.

- Nuevo `POST /api/admin/balance-adjustments`.
- Admin puede crear ajustes positivos o negativos desde `/admin/saldo`.
- No es pago real ni Stripe.
- Limite beta: `$500` absoluto por ajuste.
- No permite saldo final negativo.
- Reason obligatorio y note opcional.
- Idempotencia por `admin-adjustment:<key>`.
- Auditoria basica en `balance_movements.created_by` y `metadata`.
- Usuario final solo ve `Manual adjustment` en `/saldo`.

Pendiente posterior:

- Audit logs formales.
- RBAC granular por accion.
- Approval flow para ajustes grandes.
- Stripe Checkout/webhooks para recargas reales.

## FASE 5.26 — Reconciliation queue and audit logs foundation

Estado: foundation implementada sin migracion nueva.

- Reutiliza `audit_logs` existente.
- Nuevo helper server-side `createAuditLog` / `createReconciliationEvent`.
- Nuevo endpoint `GET /api/admin/audit-events`.
- Nueva pagina `/admin/audit`.
- `/admin` muestra bloque `Reconciliation & audit`.
- Eventos integrados:
  - label purchase started/succeeded/failed/db persist failed.
  - label URL missing.
  - void started/succeeded/failed/refund failed.
  - manual adjustment created/rejected.
  - admin access denied.
  - idempotency conflict.
- Metadata sanitizada; no secrets ni raw provider responses.

Pendiente posterior:

- Reconciliation queue dedicada con status open/resolved.
- Owner/assignee, comentarios y audit de cierre.
- Notificaciones internas para critical events.
- Columnas first-class si se decide migrar `audit_logs` para severity/request/tracking.

## FASE 5.27 — Mobile responsive beta review

Estado: implementada como ajuste visual web, sin tocar mobile nativo ni backend critico.

- Shell principal y admin reforzados para mobile/tablet.
- `/dashboard` mantiene KPIs y muestra recent shipments como cards en mobile.
- `/crear-guia` ajustado para inputs full-width, paquete responsive, rate cards tocables y modal con scroll interno.
- `/envios` ahora tiene cards mobile y tabla desktop/tablet con scroll.
- `/guia/[trackingNumber]`, `/tracking` y `/saldo` ajustados para textos largos, acciones full-width y sin overflow horizontal inesperado.
- Admin support views mantienen tablas con scroll horizontal y filtros apilados en mobile.
- No se cambio pricing, labels, void/refund, balance, admin auth ni audit logic.

Pendiente posterior:

- QA visual en dispositivos reales antes de beta publica.
- Mejoras finas de accesibilidad si aparecen issues en pruebas reales.
- Migrar warnings legacy de Google Maps cuando se planifique una fase de mapas.

## FASE 5.28 — Full end-to-end beta QA

Estado: revision pre-staging completada a nivel codigo/copy/guards, sin deploy ni acciones reales.

- Rutas auditadas: auth, dashboard, get rates, shipments, shipment summary, tracking, balance y admin/support.
- APIs auditadas: config status, rates, labels, tracking, balance y admin.
- Se corrigieron textos visibles residuales:
  - loading de rutas protegidas en ingles.
  - errores fallback de rates en ingles.
  - placeholder corrupto en password.
  - estado tecnico `internal` mostrado como `Processed`.
  - audit copy sin mencionar raw provider responses.
  - tracking fallback local en ingles.
- Se confirmo por codigo que:
  - `/api/labels` bloquea antes de comprar si `ENABLE_REAL_LABEL_PURCHASE !== "true"`.
  - `/api/labels/[id]/void` bloquea si `ENABLE_REAL_LABEL_VOID !== "true"`.
  - `/api/tracking` no llama APIs externas y filtra por usuario.
  - admin endpoints requieren admin server-side.

Checklist antes de staging:

- Variables de entorno completas en staging, sin secrets en repo.
- Migraciones/RPCs aplicadas en Supabase.
- `ENABLE_REAL_LABEL_PURCHASE` y `ENABLE_REAL_LABEL_VOID` apagados por defecto.
- ShipEngine TEST key para staging sandbox.
- `ADMIN_EMAILS` o `profiles.role = admin` configurado.
- Validaciones `lint`, `typecheck`, `build` y `git diff --check` en verde.
- QA manual de auth, rates, shipment existente, tracking, balance, admin/audit y responsive.

Pendiente posterior:

- QA visual con navegador en entorno local/staging.
- Fase de staging environment/runbook.
- Produccion sigue bloqueada hasta completar payments, reconciliation workflow formal y decision de guards.

## FASE 5.29 — Staging deploy preparation and operational runbook

Estado: runbook preparado, sin deploy.

- `.env.example` actualizado con variables de staging y defaults seguros.
- `docs/DEPLOYMENT.md` ahora incluye:
  - preflight local.
  - variables sandbox/test.
  - migraciones/RPCs requeridas.
  - SQL de verificacion.
  - health check post-deploy.
  - staging test plan.
  - riesgos y rollback.
- README actualizado para reflejar el estado beta real.
- Base de datos y seguridad documentan que purchase/void siguen apagados por defecto.

Checklist clave:

- No secrets en repo.
- `ENABLE_REAL_LABEL_PURCHASE=false`.
- `ENABLE_REAL_LABEL_VOID=false`.
- ShipEngine TEST key.
- Shippo test key si se usa.
- Easyship sandbox key/base URL si se usa.
- Supabase migrations aplicadas y verificadas.
- Admin configurado por `profiles.role = admin` o `ADMIN_EMAILS`.

Pendiente posterior:

- Ejecutar deploy staging real.
- Hacer QA visual/manual contra staging.
- Decidir si se ejecuta una prueba sandbox controlada de label/void en staging.

## FASE 5.31 — Staging deploy execution and visual QA

Estado: handoff de ejecucion preparado; deploy externo no ejecutado desde Codex.

- Pre-deploy local definido: lint, typecheck, build, `git diff --check` y `git status --short`.
- Variables de staging revisadas en docs y `.env.example` con placeholders seguros.
- Supabase staging debe verificarse con SQL antes de pruebas de purchase/void.
- Deploy queda en manos del humano/plataforma porque requiere credenciales de hosting y variables reales de staging.
- Guards deben iniciar apagados: `ENABLE_REAL_LABEL_PURCHASE=false` y `ENABLE_REAL_LABEL_VOID=false`.
- Health check post-deploy y QA visual responsive quedan documentados en `docs/DEPLOYMENT.md`.

Pendiente posterior:

- Ejecutar deploy staging real.
- Hacer health check contra URL staging.
- Ejecutar rates test con guards apagados.
- Opcional: prueba controlada de una label ShipEngine TEST y un void sandbox, apagando flags al terminar.

## FASE 5.32 — Stripe/payment design for balance recharge

Estado: diseno documentado, sin implementar Stripe, sin endpoints nuevos y sin migracion.

- El flujo futuro usara Stripe Checkout para recargas de balance.
- `Add funds` seguira sin acreditar saldo hasta que exista backend/webhook.
- La regla central queda definida: solo un webhook Stripe con firma verificada puede crear `balance_movement` tipo `recharge`.
- Montos beta recomendados: `$10`, `$25`, `$50`, `$100`; custom amount queda pendiente o limitado.
- Modelo recomendado: tabla futura `payment_recharges` para mantener estado `pending/paid/failed/canceled/refunded` y reconciliacion.
- `balance_movements` mantiene el ledger final con `type = recharge`, `concept = Payment recharge` y referencia Stripe.
- Audit/reconciliation events propuestos para checkout, webhook, duplicados, mismatch y DB failure.
- Variables futuras agregadas a `.env.example` como placeholders sin secretos reales.

Pendiente posterior:

- FASE 5.33: implementar Stripe Checkout Session + webhook verificado detras de migracion `payment_recharges`.
- QA sandbox Stripe con test cards.
- Definir refund/chargeback/dispute flow antes de produccion.

## FASE 5.33 — Stripe Checkout + webhook sandbox implementation

Estado: implementada en codigo para sandbox/test; requiere aplicar migracion y configurar Stripe test vars antes de prueba manual.

- Dependencia `stripe` agregada.
- Migracion `20260519_add_payment_recharges.sql` creada, no aplicada automaticamente.
- Helper server-side Stripe creado.
- Endpoint `POST /api/billing/checkout-session` creado para montos fijos `$10`, `$25`, `$50`, `$100`.
- Endpoint `POST /api/webhooks/stripe` creado con raw body y firma verificada.
- `/saldo` actualiza `Add funds` a modal con Checkout cuando Stripe esta configurado.
- `/api/config/status` expone `stripeRechargeConfigured` como boolean seguro.
- Audit/reconciliation integrado para checkout, webhook, duplicados, mismatch y DB failure.

Pendiente posterior:

- Aplicar migracion en Supabase test/staging.
- Configurar Stripe test keys y webhook secret.
- Probar Checkout con test cards y reenviar webhook para validar idempotencia.
- Disenar refunds de recarga, chargebacks/disputes y reconciliation workflow operativo antes de produccion.

## FASE 5.34 — Stripe sandbox verification and recharge QA

Estado: QA/runbook preparado; no se ejecutaron pagos sandbox desde Codex.

- Precheck local confirma `stripe` instalado y validaciones base.
- Migracion `payment_recharges` revisada: constraints, uniques, indices y RLS segura.
- `/api/config/status` expone `stripeRechargeConfigured` y `stripeRechargeEnabled`.
- Checkout requiere configuracion Stripe completa, incluyendo webhook secret.
- Stripe CLI flow documentado para `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- SQL de verificacion agregado para tabla, columns, constraints, policies, recharges y ledger.
- QA documentado para checkout, webhook, idempotencia, balance UI y audit/reconciliation.

Pendiente posterior:

- Aplicar migracion en Supabase test/staging.
- Ejecutar prueba con Stripe CLI y test card.
- Reenviar evento para comprobar no duplicacion.
- Disenar refunds/chargebacks/disputes.

## FASE 5.35 — Controlled Stripe sandbox test

Estado: precheck local ejecutado y handoff de prueba preparado; pago sandbox no ejecutado desde Codex.

- Lint/typecheck/build/diff verificados localmente.
- `.env.local` sigue ignorado y no fue leido ni mostrado.
- Migracion `payment_recharges` revisada, pero no aplicada desde Codex.
- Checklist de gate agregado: migracion aplicada, Stripe test vars, Stripe CLI, `/api/config/status` con `stripeRechargeEnabled=true`.
- SQL post-pago agregado para verificar `payment_recharges`, `balance_movements`, saldo e idempotencia.

Pendiente posterior:

- Humano ejecuta prueba `$10` con Stripe test card.
- Verificar DB y audit reales.
- Reenviar webhook y confirmar un solo movimiento recharge.
- Documentar resultado final de sandbox.

## FASE 5.37 — Stripe recharge UX polish and failure states

Estado: implementada despues de prueba sandbox exitosa.

- Stripe Checkout test validado con humano.
- Webhook Stripe respondio 200 y acredito `Payment recharge +$10.00`.
- `/saldo` muestra mensajes claros para success, canceled y pending, con dismiss.
- Stripe no configurado muestra `Online recharge is not available yet.`
- Errores de checkout se traducen a copy seguro sin detalles tecnicos.
- Admin audit muestra labels Stripe legibles.
- Docs actualizan que el frontend no acredita saldo y que el webhook verificado es la fuente de verdad.

Pendiente posterior:

- Reenviar webhook y confirmar idempotencia si no se hizo ya.
- Disenar refunds, chargebacks/disputes y balance reversals.
- Preparar production readiness checklist para pagos.

## FASE 5.38 — Stripe refunds, chargebacks y disputes (diseno)

Estado: diseno/documentacion completada. Sin codigo nuevo, sin migracion, sin deploy.

Objetivo:

- Auditar estructura actual de tablas y codigo relacionado con pagos Stripe.
- Definir reglas de negocio para refunds, disputes, chargebacks y reversals.
- Recomendar modelo de datos para fase de implementacion futura.
- Documentar webhook events futuros de Stripe.
- Documentar reglas de balance reversal y negative balance policy.
- Documentar UI/UX propuesta para eventos de reversal.
- Documentar reglas de seguridad e idempotencia.
- Documentar audit/reconciliation events propuestos.

Estructura auditada:

- `payment_recharges`: tiene `status = refunded` disponible; falta `disputed`/`dispute_won`/`dispute_lost`.
- `balance_movements`: `type = adjustment` puede usarse para reversals como interim.
- `audit_logs`: ya soporta todos los event types necesarios con severity.
- Webhook `/api/webhooks/stripe`: actualmente maneja `checkout.session.completed`, `checkout.session.expired` y `payment_intent.payment_failed`.

Modelo de datos recomendado:

- Opcion B (tabla futura `payment_reversals`) es la solucion productiva recomendada.
- Como interim: usar `balance_movements type = adjustment` con metadata descriptiva.
- No crear migracion hasta decidir modelo final y completar prueba sandbox del interim.

Reglas de negocio aprobadas (ver DATABASE.md y SECURITY.md para detalle completo):

- Saldo no usado: refund automatico permitido con audit.
- Saldo ya usado: no refund automatico; reconciliation critica.
- Dispute con saldo: hold negativo + bloqueo de compras.
- Dispute sin saldo: balance negativo + reconciliation critica + bloqueo.
- Webhook duplicado: ignorar, loguear warning.
- Dispute ganado: restaurar hold.
- Dispute perdido: confirmar descuento, reconciliation critica.
- Balance negativo: bloquear `/api/labels` con 402.

Webhook events futuros diseñados:

- `charge.refunded`
- `refund.created`, `refund.updated`
- `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`
- (ya existentes) `payment_intent.payment_failed`, `checkout.session.expired`

Validaciones ejecutadas:

- lint: 0 errores, 6 warnings preexistentes.
- typecheck: limpio.
- build: exitoso, 26 rutas.
- git diff --check: limpio.

Pendiente posterior (FASE 5.39 o posterior):

- Crear migracion para ampliar `payment_recharges.status` constraint.
- Crear tabla `payment_reversals`.
- Agregar `profiles.account_status` o equivalente para bloqueo por dispute.
- Implementar handlers `charge.refunded` y `charge.dispute.*` en webhook Stripe.
- QA sandbox de refund via Stripe CLI (`stripe refunds create`).
- Prueba de idempotencia de webhook de refund.
- Production readiness checklist para pagos live.

## FASE 5.39 — Label purchase flow hardening antes de labels reales

Estado: planificada. Sin código nuevo, sin migraciones, sin deploy.

Objetivo:

- Cerrar los prerrequisitos de seguridad, auth y QA antes de activar compras de labels reales.
- Diseñar el flujo de pago directo por guía con Stripe (label-as-checkout).
- Investigar y documentar soporte de labels Paperless/QR.
- Establecer criterios de go/no-go para activar `ENABLE_REAL_LABEL_PURCHASE=true` en producción.

### 1. Prerrequisitos antes de activar labels reales

Mantener `ENABLE_REAL_LABEL_PURCHASE=false` hasta confirmar:

- [ ] Auth corregida: no hay localStorage fallback, solo Supabase Auth válida (FASE 5.38D completada).
- [ ] SMTP configurado: los correos de verificación llegan correctamente a usuarios reales.
- [ ] Usuario verificado puede registrarse, iniciar sesión y ver su saldo real.
- [ ] `/api/config/status` retorna `buildEnvOk: true`, `supabaseConfigured: true`.
- [ ] No hay sesiones cruzadas ni saldo de otro usuario visible.
- [ ] QA completo del flujo: registro → verificación → login → cotización → confirmación.

### 2. Verificación del flujo actual con balance sandbox

Pasos de QA antes de activar purchase real:

1. Usuario confirmado con saldo sandbox en `balance_movements`.
2. Cotizar desde `/crear-guia` con dirección US válida y paquete real.
3. Seleccionar rate real (ShipEngine sandbox).
4. Confirmar el modal con desglose de precio.
5. Verificar que la app llama `/api/labels` y retorna bloqueo controlado (`ENABLE_REAL_LABEL_PURCHASE=false`).
6. Verificar que el balance no cambió (no debitó por rate bloqueado).
7. Activar temporalmente `ENABLE_REAL_LABEL_PURCHASE=true` en entorno controlado.
8. Comprar una sola label ShipEngine TEST.
9. Verificar: shipment creado, balance debitado, PDF/tracking visible, audit log.
10. Volver a `ENABLE_REAL_LABEL_PURCHASE=false`.

### 3. Pago directo por guía (diseño futuro — label-as-checkout)

El flujo actual usa balance pre-cargado. El flujo futuro permite pago directo por guía:

```
usuario selecciona rate
→ backend crea PendingLabelOrder con snapshot del rate (proveedor, costo, expiración)
→ Stripe Checkout Session para esa guía específica (amount = customerPrice en centavos)
→ usuario paga en Stripe
→ webhook `checkout.session.completed` confirma pago
→ backend compra label server-side con el rate snapshot
→ idempotencia por checkout_session_id y/o payment_intent_id
→ si compra label falla después del pago: estado action_required, no refund automático
→ frontend NO compra label solo por success_url (no se confía en redirect del browser)
```

Reglas de negocio clave:

- El frontend nunca compra labels directamente.
- El rate snapshot tiene expiración: si el rate expiró antes del pago, rechazar y pedir nueva cotización.
- Si Stripe cobró pero la compra de label falló: registrar `label_purchase_payment_orphan` en audit, no reintentar automáticamente sin revisión.
- Idempotencia doble: por `checkout_session_id` (no crear segunda label) y por `payment_intent_id` (no cobrar dos veces).

Variables futuras necesarias (ya documentadas en `.env.example`):

```text
STRIPE_SECRET_KEY=sk_test_...       # server-side only
STRIPE_WEBHOOK_SECRET=whsec_...     # server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Paperless labels / QR (investigación pendiente)

Investigar antes de implementar:

- ShipEngine `display_scheme: paperless` — verificar carriers disponibles (USPS, UPS, FedEx, DHL).
- USPS Label Broker — genera QR sin PDF completo; el destinatario puede imprimir en ventanilla.
- Carrier capability matrix: qué carriers/servicios soportan paperless en sandbox y en producción.
- Fallback: si el carrier no soporta paperless, retornar PDF normal sin error.
- UX: botón "Ver QR" vs "Descargar PDF" según el tipo de label retornada.

No implementar hasta tener confirmación de ShipEngine sandbox con `display_scheme: paperless` probado manualmente.

### 5. Gate de go/no-go antes de producción real

No activar `ENABLE_REAL_LABEL_PURCHASE=true` en producción hasta cumplir:

- [ ] Labels activadas solo por tenant específico (feature flag por usuario/organización), no global.
- [ ] Límites de monto por compra (ej. máximo $50 por label en beta inicial).
- [ ] Audit log completo: purchase, void, refund, orphan.
- [ ] Retry y void/refund flow verificados en sandbox.
- [ ] Reconciliación balance vs provider vs Stripe documentada y probada.
- [ ] SMTP activo y correos de verificación funcionando en producción.
- [ ] No hay balance negativo activo en ningún usuario de producción.
- [ ] `ENABLE_REAL_LABEL_VOID=false` mientras void/refund no estén auditados.

## FASE 6 - Mobile backend seguro

Objetivo:

- Evitar que mobile haga operaciones sensibles directo contra Supabase.

Tareas:

- Agregar `EXPO_PUBLIC_API_BASE_URL`.
- Cambiar create label para usar backend.
- Cambiar rates para usar backend.
- Cambiar void/cancel si aplica.
- Mantener Supabase Auth o intercambiar token con backend.

## FASE 7 - Docker + servidor + Nginx + SSL

Objetivo:

- Preparar despliegue en VM por SSH.

Tareas:

- Dockerfile.
- docker-compose.
- Nginx reverse proxy.
- SSL.
- Variables de entorno.
- Healthcheck.
- Logs.
- Runbook de deploy.

## Prioridad recomendada

No conectar ShipStation antes de completar FASE 1 y FASE 2. El orden correcto reduce riesgo de dinero falso, labels duplicadas, secrets expuestos y estados inconsistentes.
