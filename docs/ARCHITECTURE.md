# Arquitectura ShipFlow

## Vision general

ShipFlow esta compuesto por una aplicacion web, una aplicacion mobile y Supabase como capa de autenticacion/base de datos.

```text
shipflow-web
  UI Next.js
  servicios cliente/backend parcial
  app/api/tracking

shipflow-mobile
  UI Expo/React Native
  servicios Supabase
  tracking via backend web configurable

Supabase
  Auth
  PostgreSQL
  RLS
```

## Web

La app web usa Next.js App Router. Las rutas principales son:

- `/`: landing.
- `/login`: login.
- `/registro`: registro.
- `/dashboard`: resumen operativo.
- `/crear-guia`: formulario de creacion de guia interna.
- `/envios`: listado de envios.
- `/guia/[trackingNumber]`: label imprimible.
- `/tracking`: busqueda de tracking.
- `/saldo`: balance y movimientos.
- `/admin`: panel admin.
- `/api/tracking`: endpoint backend actual.
- `/api/shipments/create`: endpoint backend para crear guia interna web.
- `/api/shipments`: listado backend autenticado de envios.
- `/api/shipments/[id]`: detalle backend autenticado de envio.
- `/api/rates`: cotizacion multi-provider autenticada. Soporta `mode: "best_available"` (RateAggregator: raw → reprice → dedup → rank) y `provider: "shipstation"` (directo, sin dedup ni pricing completo).
- `/api/labels`: creacion de label autenticada. Routea por `provider` del body: shipstation (real), internal/mock (local), shippo/easypost/easyship devuelven 501 hasta implementar.
- `/api/labels/[id]/void`: void interno limitado.
- `/api/balance`: lectura backend autenticada de balance.

La proteccion de rutas web se hace principalmente con componentes client-side:

- `ProtectedRoute`
- `AdminRoute`

La proteccion real de datos depende de Supabase RLS.

## Mobile

La app mobile usa Expo/React Native. Las pantallas principales viven en `shipflow-mobile/src/screens`:

- Welcome.
- Login.
- Register.
- Dashboard.
- CreateGuide.
- Shipments.
- Tracking.
- Balance.
- Profile.
- Admin.

Mobile se conecta directo a Supabase con anon key publica y usa Supabase Auth con AsyncStorage.

## Supabase

Supabase cumple dos funciones:

- Auth de usuarios.
- PostgreSQL con tablas operativas.

Tablas principales actuales:

- `profiles`
- `shipments`
- `balance_movements`
- `tracking_events`
- `couriers`
- `webhook_events` preparada en FASE 1C
- `audit_logs` preparada en FASE 1C

## Flujo actual de crear guia

Flujo web con Supabase activo despues de FASE 1B:

```text
CreateGuideForm
→ getActiveCouriers()
→ calculateShippingRate() para preview visual
→ createShipment()
→ obtiene session/access_token
→ POST /api/labels
→ backend valida usuario
→ backend valida datos
→ backend busca courier activo
→ backend recalcula tarifa local
→ backend valida saldo suficiente
→ backend crea shipment
→ backend crea tracking_event inicial
→ backend crea balance_movement negativo
→ devuelve shipment/trackingNumber
→ muestra resumen y label imprimible
```

Flujo demo sin Supabase configurado:

```text
CreateGuideForm
→ getActiveCouriers()
→ calculateShippingRate()
→ genera tracking interno SF-...
→ createShipment()
→ localStorage fallback
→ muestra resumen y label imprimible
```

Este flujo NO compra una label real en un carrier.

## Flujo actual de tracking

Flujo web:

```text
TrackingSearch
→ getShipmentByTrackingNumber()
→ getTrackingEvents()
→ POST /api/tracking
→ getRealTracking()
→ fetch a API de carrier si hay env vars
→ fallback si no hay configuracion o falla
→ saveRealTrackingEvents()
→ renderiza resultado
```

Flujo mobile:

```text
TrackingScreen
→ getShipmentByTrackingNumber()
→ getTrackingEvents()
→ getRealTracking() mobile
→ POST a EXPO_PUBLIC_TRACKING_API_URL
→ fallback con eventos locales/Supabase si falla
→ saveRealTrackingEvents()
```

## Flujo actual de balance

```text
BalancePanel / BalanceScreen
→ getBalanceMovements()
→ suma amount
→ muestra balance disponible
```

Crear guia agrega un movimiento negativo. Recargar saldo agrega un movimiento positivo fijo. Actualmente no hay pago real ni validacion financiera server-side.

## Servicios actuales

Web:

- `shipmentService`: crea guia via API backend cuando Supabase esta activo; lista/busca envios en Supabase o localStorage.
- `balanceService`: suma movimientos y permite agregar recargas.
- `courierService`: lista/crea/edita/elimina couriers y calcula tarifas locales.
- `realTrackingService`: normaliza courier y llama APIs externas configuradas para tracking.
- `trackingService`: lee y guarda eventos de tracking.
- `authService`: login, registro, logout y perfiles.

Mobile:

- `shipments`: crea/lista/busca envios en Supabase.
- `balance`: lee movimientos, suma balance y agrega recargas.
- `couriers`: lista couriers y calcula tarifa local.
- `realTrackingService`: llama al backend web de tracking si esta configurado.
- `tracking`: lee y guarda eventos de tracking.
- `auth`: Supabase Auth y perfil.
- `pdfGuideService`: genera PDF local visual de la guia.

## Endpoints actuales

Endpoints backend propios actuales:

- `POST /api/tracking`
- `POST /api/shipments/create`
- `GET /api/shipments`
- `GET /api/shipments/[id]`
- `POST /api/rates`
- `POST /api/labels`
- `POST /api/labels/[id]/void`
- `GET /api/balance`

No existen todavia:

- `/api/webhooks/shipstation`
- APIs backend para pagos/recargas reales.

## Deudas tecnicas FASE 1B

- `POST /api/shipments/create` usa operaciones secuenciales con Supabase JS; falta transaccion atomica SQL/RPC.
- Falta idempotencia persistida.
- Falta migrar mobile al backend seguro.
- Falta mover recargas/pagos a backend.
- Falta ShipStation y labels reales.

## Base logistica FASE 1C

La migracion `20260514_shipflow_security_logistics_foundation.sql` prepara:

- Provider IDs en `shipments`.
- `label_url`, `label_format`, `payment_status`, `label_status`.
- Pricing: `provider_cost`, `platform_markup`, `customer_price`, `currency`.
- Idempotencia: `idempotency_key`.
- Metadata JSON para shipment y balance.
- Ledger enriquecido en `balance_movements`.
- `webhook_events` para payloads futuros.
- `audit_logs` para auditoria.

El endpoint `POST /api/shipments/create` queda preparado para usar esos campos si la migracion esta aplicada, pero mantiene fallback legacy si la DB local aun no tiene las columnas.

No hay ShipStation ni providers externos todavia.

## Estabilizacion FASE 1D

La FASE 1D no cambia la arquitectura funcional ni conecta proveedores. Deja preparado el proceso operativo para aplicar la migracion 1C:

- Runbook/checklist: `docs/MIGRATION_1D_CHECKLIST.md`.
- La migracion recrea RLS/policies principales para el estado esperado.
- El endpoint `/api/shipments/create` debe funcionar con DB antigua y DB nueva, pero produccion debe priorizar DB nueva con migracion aplicada.
- La operacion sigue sin transaccion SQL atomica; la RPC queda pendiente antes de labels reales.
- Mobile sigue conectado directo a Supabase para operaciones sensibles hasta FASE 6.

## Backend API FASE 2

FASE 2 introduce una capa API interna en Next.js App Router:

```text
UI web
→ API backend autenticada
→ Supabase con RLS
→ logica interna/mock de couriers, rates, labels y balance
```

Archivos server-side relevantes:

- `shipflow-web/lib/server/apiResponse.ts`
- `shipflow-web/lib/server/supabaseServer.ts`
- `shipflow-web/lib/server/shipments/createInternalShipment.ts`

Comportamiento:

- `GET /api/shipments` lista envios del usuario autenticado.
- `GET /api/shipments/[id]` carga envio y tracking events del usuario autenticado.
- `POST /api/rates` usa `mode: "best_available"` para el cotizador real; ya no muestra tarifas locales de `couriers` en `/crear-guia`.
- `POST /api/labels` genera guía según el rate seleccionado cuando el proveedor soporta label; mantiene fallback interno solo para compatibilidad backend.
- `POST /api/labels/[id]/void` permite void interno limitado si `label_status` existe.
- `GET /api/balance` calcula balance desde `balance_movements`; no permite recargas.
- `POST /api/tracking` mantiene compatibilidad sin token, pero valida carrier permitido; si recibe Bearer token, valida sesion.

Limitaciones:

- No hay ShipStation.
- FASE 3 agrega adapters logisticos internal/mock; ShipStation aun no esta implementado real.
- No hay transaccion SQL atomica/RPC.
- No hay pagos reales ni refunds reales.
- Mobile aun no consume estos endpoints para rates/labels.

## Logistics Layer FASE 3

FASE 3 introduce la capa `shipflow-web/lib/logistics`:

```text
shipflow-web/lib/logistics
├── adapters
│   ├── LogisticsAdapter.ts
│   ├── MockAdapter.ts
│   └── ShipStationAdapter.ts
├── errors.ts
├── pricing.ts
├── registry.ts
└── types.ts
```

Comportamiento actual:

- `MockAdapter`/internal calcula rates desde `couriers`.
- `MockAdapter` crea labels internas con tracking `SF-...`, `labelStatus = internal` y `labelUrl = null`.
- `ShipStationAdapter.getRates()` implementado (FASE 4A): llama a `POST /shipments/getrates` en ShipStation V1 API.
- `ShipStationAdapter.createLabel()` implementado (FASE 4B): flujo V1 `POST /orders/createorder` → `POST /orders/createlabelfororder`. Devuelve `LabelResult` con `providerShipmentId`, `providerLabelId`, `providerServiceCode`. `labelUrl = null` (V1 devuelve base64).
- `ShipStationAdapter.voidLabel()` y `trackShipment()` devuelven error `NOT_IMPLEMENTED` (501).
- `/api/rates` soporta `mode: "best_available"` para el cotizador visible y `provider: "shipstation"` como compatibilidad directa; no usa default local en el flujo visible.
- `/api/labels` soporta `provider: "shipstation"` para labels reales (FASE 4B); default internal/mock.
- `/api/shipments/create` sigue usando internal/mock.
- Tracking real/fallback sigue en servicios actuales.

Nuevo archivo de servidor FASE 4B:

- `shipflow-web/lib/server/shipments/createShipStationShipment.ts` — orquesta validacion, idempotencia, balance check, llamada ShipStation y persistencia secuencial.

## Logistics Layer FASE 4A

Nuevas clases de error en `errors.ts`:

- `ProviderAuthError` (401): credenciales invalidas o faltantes.
- `ProviderRateLimitError` (429): rate limit del proveedor.
- `InvalidPayloadError` (400): payload invalido para el proveedor.

## Logistics Layer FASE 4B

Cambios en `types.ts`:

- `CreateLabelInput` ampliado con `provider?`, `serviceCode?`, `carrierCode?`, `labelFormat?`.
- `LabelResult` ampliado con `providerShipmentId?`, `providerLabelId?`, `providerServiceCode?`.

Nuevo archivo servidor:

- `shipflow-web/lib/server/shipments/createShipStationShipment.ts` — funcion `createShipStationShipment()` que orquesta el flujo completo.

RPC preparada (no activada en FASE 4B):

- `shipflow-web/supabase/migrations/20260514_create_label_transaction_rpc.sql` — funcion SQL `create_label_shipment_transaction`.

## Logistics Layer FASE 4D

Cambios en `types.ts`:

- `LabelResult` ampliado con `labelData?: string | null` (base64 PDF de ShipStation V1).
- `VoidLabelInput` ampliado con `providerShipmentId?: string` para void sin ambiguedad.

Nuevos helpers server-side:

- `createServiceSupabaseClient()` en `supabaseServer.ts` — cliente Supabase con `service_role` para llamadas RPC.
- `isServiceRoleConfigured` en `supabaseServer.ts` — verifica que `SUPABASE_SERVICE_ROLE_KEY` este configurado.
- `isRpcNotFoundError()` en `apiResponse.ts` — detecta errores PGRST202/42883 cuando la funcion RPC no existe.

Cambios en `createShipStationShipment.ts`:

- Verifica `SUPABASE_SERVICE_ROLE_KEY` ANTES de comprar el label.
- Usa `create_label_shipment_transaction` RPC via service_role para persistencia atomica.
- No vuelve a inserts secuenciales para provider shipstation.
- Retorna `labelData` (base64 PDF) en la respuesta inmediata.

`ShipStationAdapter.voidLabel()` implementado:

- Endpoint ShipStation V1: `POST /shipments/{shipmentId}/voidlabel`.
- Requiere `providerShipmentId` en `VoidLabelInput`.
- Maneja 401/403/404/429/5xx.

Migration `20260514_create_label_transaction_rpc.sql` mejorada:

- `create_label_shipment_transaction`: agrega `p_label_format`, validacion `p_customer_price > 0`.
- Nueva funcion `void_label_refund_transaction`: update atomico `label_status = voided` + refund movement.
- Ambas funciones `SECURITY DEFINER`, solo accesibles por `service_role`.
- NO ejecutadas. Aplicar manualmente en Supabase.

`/api/labels/[id]/void` actualizado:

- Provider shipstation: llama void SS → RPC `void_label_refund_transaction` → respuesta.
- Labels internas: void local limitado (sin cambios).

## Persistencia financiera FASE 5.10

La migracion `20260515_add_pricing_breakdown_to_shipments.sql` agrega columnas de pricing granular a `shipments`:

- `payment_fee` — cargo de procesamiento trasladado al cliente; no lo absorbe ShipFlow.
- `pricing_subtotal` — provider_cost + platform_markup antes del fee de pago.
- `pricing_model` — identificador de la formula usada (`shipflow_v1`).
- `pricing_breakdown` — snapshot jsonb del calculo al momento de compra.

La RPC `create_label_shipment_transaction` fue actualizada con 4 nuevos parametros opcionales (defaults backward-compat).

`fromShipmentRow()` mapea todos los campos nuevos a camelCase en el tipo `Envio`.

`PrintableGuide` muestra el desglose si `paymentFee > 0 && providerCost != null`; fallback a total simple para guias anteriores a la migracion.

PREREQUISITO: Aplicar FASE 1C y FASE 4D antes de esta migracion.

## Dirección inteligente y config status FASE 5.11

Nuevos elementos en `shipflow-web`:

- `components/AddressInput.tsx` — componente reutilizable de dirección estructurada. Integra Google Places Autocomplete si `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está configurado; fallback a formulario manual si no.
- `app/api/config/status` — endpoint GET público que devuelve booleans de configuración sin exponer secrets. Consumido por `/crear-guia` para bloquear cotizaciones si falta Supabase o providers.
- `lib/types.ts`: tipo `StructuredAddress` con `name`, `phone`, `street1`, `city`, `state`, `postalCode`, `country`, `latitude`, `longitude`, `formattedAddress`, `placeId`, `source`, `validationStatus`.
- `lib/services/apiClient.ts`: función `apiGetConfigStatus()` — fetch público sin auth.

`CreateGuideForm` usa `StructuredAddress` para origen y destino. Valida dirección antes de cotizar y bloquea la cotización online si la configuración del servidor es incompleta.

Google Maps / Places:
- Script cargado dinámicamente en el cliente (sin paquetes npm adicionales).
- Tipos declarados inline con `declare global { interface Window { google? } }`.
- La key debe restringirse por dominio HTTP en Google Cloud antes de producción.
- Sin key: flujo manual idéntico al anterior.

`AddressMapPicker` (mapa con pin de selección + reverse geocoding): implementado en FASE 5.14. Ver sección siguiente.

## EasyPost rates reales FASE 5.12

`EasyPostAdapter.getRates()` implementado. Llama a `POST https://api.easypost.com/v2/shipments` con Basic Auth (`EASYPOST_API_KEY:`). Activo cuando `EASYPOST_API_KEY` está configurado.

Cambios:
- `lib/logistics/adapters/EasyPostAdapter.ts`: `getRates()` real; `createLabel()` y `voidLabel()` siguen en `ProviderUnavailableError`.
- `lib/logistics/providerCapabilities.ts`: `supportsLabels: false`, `supportsVoid: false` para EasyPost.
- El `RateAggregator` consulta ShipStation + EasyPost en paralelo cuando ambas keys están presentes.
- Deduplicación: si ShipStation y EasyPost devuelven el mismo servicio/carrier, se muestra solo el más barato.
- Labels: EasyPost bloqueado en UI (`handleConfirmed`) y en `/api/labels` (devuelve 501). Solo ShipStation compra labels reales.

## Shippo rates reales FASE 5.15

`ShippoAdapter.getRates()` implementado. Llama a `POST https://api.goshippo.com/shipments/` con `async: false` y auth `ShippoToken <SHIPPO_API_KEY>`. Activo cuando `SHIPPO_API_KEY` está configurado.

Cambios:
- `lib/logistics/adapters/ShippoAdapter.ts`: `getRates()` real; `createLabel()` y `voidLabel()` siguen en `ProviderUnavailableError`.
- `lib/logistics/providerCapabilities.ts`: `supportsLabels: false`, `supportsVoid: false` para Shippo (corregidos — el skeleton los tenía como `true` por error).
- El `RateAggregator` consulta ShipStation + EasyPost + Shippo en paralelo cuando sus keys están configuradas.
- Normalización: `rate.provider` → `courierId/courierName` (USPS, UPS, FedEx, DHL); `rate.servicelevel.token` → `serviceCode`; `rate.servicelevel.name` → `serviceName`.
- Deduplicación: si múltiples providers devuelven el mismo carrier/servicio/días, se muestra solo el más barato.
- Labels: Shippo bloqueado en UI (`handleConfirmed`) y en `/api/labels` (devuelve 501). Solo ShipStation compra labels reales.

## Cotizador único FASE 5.16

`/crear-guia` queda como un flujo único de cotización:

```text
AddressInput origen/destino
→ validación US-only + calle/ciudad/estado/ZIP
→ paquete con peso y dimensiones
→ POST /api/rates { mode: "best_available" }
→ RateAggregator
→ cards de tarifas reales
→ selección de rate
→ confirmación/generación de guía si el rate soporta label
```

Cambios clave:

- Se eliminó el selector visible de tipo de cotización.
- Ya no se muestran tarifas locales basadas en la tabla `couriers`.
- `couriers` puede seguir existiendo como catálogo/admin, pero no es fuente visible de precios finales en `/crear-guia`.
- `/api/rates` ya no devuelve el fallback local por defecto; requiere `mode: "best_available"` para el cotizador.
- `AddressInput` acepta dirección pegada, usa Places si hay key y muestra mapa solo bajo acción explícita.
- País fijo en UI: Estados Unidos. Estado como select.
- Dimensiones requeridas con defaults `1`.
- Errores de no-rates ahora distinguen configuración, dirección, paquete y falla de integraciones.

## Arquitectura futura deseada

La arquitectura futura debe mover operaciones sensibles a backend:

```text
UI web/mobile
→ API backend autenticada
→ servicios de dominio
→ logistics adapters
→ ShipStation/proveedores
→ Supabase transaccional/auditado
```

Base actual:

```text
shipflow-web/lib/logistics
├── adapters
├── registry.ts
├── pricing.ts
├── types.ts
└── errors.ts
```

Los componentes deben consumir APIs internas estables, no proveedores logisticos directamente.

## AddressMapPicker y UX de dirección FASE 5.14

Nuevos archivos:
- `lib/googleMapsUtils.ts` — utilidades compartidas: `loadGoogleMapsScript(apiKey, onReady)` (idempotente, single-script-tag) y `parseAddressComponents(components, coords, ...)` — parsea `address_components` de Google Maps a `Partial<StructuredAddress>`.
- `components/AddressMapPicker.tsx` — componente cliente. Carga Google Maps JS, inicializa `Map`, `Marker` arrastrable y `Geocoder`. Al mover el pin o clicar en el mapa llama a `Geocoder.geocode({ location })` → parsea resultado → llama a `onSelect(partial)`. Fallback visual si Maps no carga.

`AddressInput` actualizado:
- Con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: muestra tabs **"Buscar dirección"** (Places Autocomplete) y **"Seleccionar en mapa"** (`AddressMapPicker`).
- Sin key: solo formulario manual, sin cambios.
- Ambos modos preservan `name`, `phone`, `company`, `street2` del usuario al actualizar la dirección.

`CreateGuideForm` actualizado:
- Nuevo sub-componente `AddressSummary`: badge visual de estado de dirección (Completa ✓ / Revisar / Incompleta) visible después de cada `AddressInput`.
- `validateOnlineRates()` requiere `city + state` para origen y destino (antes solo `city`).
- `validateOnlineLabel()` requiere `street1` del remitente además del destinatario.
- Aviso suave de ZIP antes del botón "Buscar tarifas" (no bloquea).
- Aviso de dirección incompleta antes de "Generar guía" chequea también `street1`.

Decisiones de implementación:
- No se instalaron paquetes npm; Google Maps JS se carga vía script dinámico.
- Los tipos de Map/Marker/Geocoder son interfaces locales en `AddressMapPicker.tsx` (sin `@types/google.maps`).
- El acceso a `window.__gMapsLoaded` / `window.__gMapsCallbacks` usa `(window as any)` en el módulo de utilidades para evitar conflictos entre declaraciones de módulos.
- La key pública debe restringirse por HTTP referrer en Google Cloud Console antes de producción.

## Auth UX: verificación de correo FASE 5.13

`requireVerifiedUser(request)` en `lib/server/supabaseServer.ts` extiende `requireSupabaseUser()` con un chequeo de `user.email_confirmed_at`. Si el campo no existe, lanza `Response("EMAIL_NOT_VERIFIED", 403)`.

Todos los endpoints sensibles usan `requireVerifiedUser`:
- `/api/rates`, `/api/labels`, `/api/labels/[id]/void`, `/api/balance`, `/api/shipments`, `/api/shipments/[id]`

En cliente: `AuthContext` expone `emailVerified: boolean`. `CreateGuideForm` muestra una card de bloqueo si `!emailVerified`. `AuthCard` redirige a `/verifica-tu-correo` tras registro o login no verificado. La página `/verifica-tu-correo` permite reenvío de correo y re-validación de sesión.
