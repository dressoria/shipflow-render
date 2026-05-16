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

Pendiente:

- Labels EasyPost reales.
- Shippo rates reales.
- Labels multi-provider (selección automática del ganador de deduplicación).

Validaciones: lint, typecheck, build exitosos.

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
