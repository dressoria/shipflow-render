# Integracion logistica

## Estado actual de providers (FASE 5.12)

### Arquitectura multi-provider

FASE 5.7 introdujo el motor multi-provider. FASE 5.8 corrigió el routing de provider en label creation. FASE 5.12 activó EasyPost rates reales. La capa logistics ahora soporta:

| Provider | Rates | Labels | Void | Tracking | Configurado |
|---|---|---|---|---|---|
| internal/mock | Sí (local) | Sí (local) | Sí | No | Siempre (fallback) |
| shipstation | Sí (real) | Sí (real) | Sí (real) | No | Si SHIPSTATION_API_KEY+SECRET |
| easypost | Sí (real) | Pendiente | No | Preparado | Si EASYPOST_API_KEY |
| shippo | Preparado | Preparado | Preparado | Preparado | No (skeleton) |
| easyship | Preparado | Preparado | No | Preparado | No (skeleton) |

### RateAggregator

`lib/logistics/rateAggregator.ts` consulta todos los providers configurados en paralelo y devuelve una lista normalizada de rates. Los providers no configurados (sin env vars) se omiten automáticamente. Los errores por provider se capturan sin romper la cotización completa.

Flujo para `mode: "best_available"` (FASE 5.9):
1. `/api/rates` recibe body con `mode: "best_available"`
2. `aggregateRates()` filtra providers con `configured = true` en `providerCapabilities.ts`
3. Consulta adapters en paralelo con `Promise.allSettled` → raw rates (providerCost = costo crudo, markup = 0)
4. `repriceRate()` aplica `calculateCustomerPrice(providerCost)` a cada rate → pricing completo con markup + payment fee
5. `deduplicateRates()` agrupa por (carrier normalizado, servicio normalizado, días) → conserva el más barato internamente
6. `rankRates()` asigna tags: cheapest, fastest, recommended (score ponderado 65% precio + 35% velocidad)
7. Devuelve `rates[]` limpios con `customerPrice` final, `tags`, y `provider` interno para routing

### Pricing engine (FASE 5.9)

`lib/logistics/pricing.ts` — motor de pricing con margen rentable y fee de pago separado.

**Modelo actual:**
```
platform_markup = max($0.99, providerCost × 6%)
subtotal        = providerCost + platform_markup
payment_fee     = subtotal × 2.9% + $0.30
customer_price  = subtotal + payment_fee
```

- ShipFlow no absorbe el fee de pago — se suma aparte al cliente.
- Texto público: "Cargo de procesamiento de pago" (no "fee de tarjeta").
- TODO: mover constantes de pricing a configuración DB/admin cuando se defina el modelo final.

### RateDeduplication (FASE 5.9)

`lib/logistics/rateDeduplication.ts` — deduplicación inteligente de rates equivalentes.

- Agrupa por clave: `normalize(carrierName) + "__" + normalize(serviceName) + "__" + estimatedDays`.
- Por grupo: conserva el rate con menor `providerCost` (el proveedor más barato gana).
- El provider ganador y toda su metadata interna se preservan para routing en label creation.
- Resultado: el usuario nunca ve 3 opciones "UPS Ground 3 días" de distintos providers.

### RateRanking (FASE 5.9)

`lib/logistics/rateRanking.ts` — ranking ponderado por precio y velocidad.

- **cheapest**: menor customerPrice.
- **fastest**: menor días estimados (solo si distinto de cheapest).
- **recommended**: menor score = `normalizedPrice × 0.65 + normalizedSpeed × 0.35`. Se asigna solo si la tasa no tiene ya cheapest ni fastest.
- Si hay un solo rate: solo tag "cheapest".
- Si no hay datos de velocidad (todos sin estimatedTime): score = solo precio → recommended = cheapest.

**TODO:** El modelo matemático final (margen por proveedor, confiabilidad, penalizaciones) se definirá con criterios de negocio en una fase posterior.

### providerCapabilities.ts

Describe capacidades y estado de configuración de cada provider. Se evalúa al importar el módulo (server-side). Permite al RateAggregator saber cuáles providers consultar sin intentar llamadas a providers no configurados.

### EasyPost — rates reales (FASE 5.12)

`EasyPostAdapter.getRates()` implementado. Llama a `POST https://api.easypost.com/v2/shipments`, que crea un Shipment en EasyPost sin comprar un label y devuelve todos los rates disponibles según las carriers conectadas a la cuenta.

**Autenticación:** Basic Auth con `EASYPOST_API_KEY` como username y password vacío: `Authorization: Basic base64("key:")`.

**Campos requeridos:**
- `origin.postalCode` y `destination.postalCode` → mapeados a campo `zip` de EasyPost.
- `parcel.weight > 0`.

**Conversiones internas:**
- Peso: lb×16 → oz (EasyPost requiere onzas).
- Dimensiones: cm÷2.54 → in (EasyPost requiere pulgadas).

**Normalización de rates:**
```
rate.carrier → courierId/courierName (e.g. "USPS", "UPS", "FedEx")
rate.service → serviceCode/serviceName (e.g. "Priority", "Ground")
parseFloat(rate.rate) → providerCost
rate.id → providerRateId
rate.delivery_days ?? est_delivery_days → estimatedTime
```

**Labels:** No implementado. `createLabel()` y `voidLabel()` lanzan `ProviderUnavailableError`. La UI bloquea antes de llamar `/api/labels` si el rate es de EasyPost; el endpoint también devuelve 501.

**Errores manejados:**

| Situación | Clase de error | HTTP |
|---|---|---|
| EASYPOST_API_KEY faltante | `ProviderUnavailableError` | 503 |
| 401/403 de EasyPost | `ProviderAuthError` | 401 |
| 429 rate limit | `ProviderRateLimitError` | 429 |
| 400/422 payload inválido | `InvalidPayloadError` | 400 |
| postalCode faltante | `InvalidAddressError` | 400 |
| Sin rates devueltos | `ProviderUnavailableError` | 503 |
| Timeout/network | `ProviderTimeoutError` / `ProviderUnavailableError` | 504/503 |

**Variables:**
```text
EASYPOST_API_KEY=   # server-side only; nunca NEXT_PUBLIC
```

Si no está configurada, `PROVIDER_CAPABILITIES.easypost.configured = false` y el `RateAggregator` omite EasyPost automáticamente.

### Adapters skeleton

- `ShippoAdapter.ts` — listo para implementar. Requiere `SHIPPO_API_KEY`.
- `EasyshipAdapter.ts` — listo para implementar. Requiere `EASYSHIP_API_KEY` y `EASYSHIP_BASE_URL`.

Cada skeleton implementa `LogisticsAdapter` y lanza `ProviderUnavailableError` en todos los métodos. El `RateAggregator` los ignorará mientras `configured = false`.

### UI (FASE 5.9)

Los nombres de provider nunca se muestran al usuario. La UI muestra:
- "Cotización estándar" (internal/mock)
- "Mejor tarifa disponible" (aggregated)
- Badges de rates: "Nuestra recomendación" / "El costo más bajo" / "Lo más rápido"
- Carrier visible: UPS, FedEx, USPS via Stamps.com, DHL (mapeados desde carrier code interno)
- Entrega formateada: "Entrega en N días"
- Desglose en modal de confirmación: Envío + Cargo de servicio ShipFlow + Cargo de procesamiento de pago + Total

### Label creation multi-provider (FASE 5.8)

- `handleConfirmed()` usa `selectedApiRate.provider` — no hay hardcode de "shipstation".
- Si provider es skeleton (shippo/easypost/easyship), la UI muestra error controlado sin llamar al API.
- `/api/labels` tiene un guard explícito que devuelve 501 para providers skeleton: no hay fallback silencioso a ShipStation.
- ShipStation sigue siendo el único provider con label creation real activa.

### Persistencia financiera (FASE 5.10)

`shipments` tiene ahora columnas separadas para cada componente del precio:

| Columna | Descripción | Ejemplo |
|---|---|---|
| `provider_cost` | Costo real del carrier (crudo) | $8.50 |
| `platform_markup` | Margen ShipFlow: max(0.99, cost×6%) | $0.99 |
| `pricing_subtotal` | provider_cost + platform_markup | $9.49 |
| `payment_fee` | cargo de procesamiento (subtotal×2.9%+$0.30) — no lo absorbe ShipFlow | $0.58 |
| `customer_price` | Total cobrado al cliente (pricing_subtotal + payment_fee) | $10.07 |
| `pricing_model` | Identificador de la fórmula usada | `shipflow_v1` |
| `pricing_breakdown` | Snapshot completo del cálculo al momento de compra (jsonb) | `{...}` |

**Flujo completo de pricing (UI → DB):**
```
handleConfirmed() manda: platformMarkup, paymentFee, pricingSubtotal, pricingModel, pricingBreakdown
POST /api/labels recibe y valida esos campos
createShipStationShipment / createInternalShipment los incluye en la escritura a DB
ShipStation path: via RPC create_label_shipment_transaction (atomica)
Internal path: via insert con fallback isMissingSchemaColumnError para instancias sin migración
```

**Refund/Void:**
- `void_label_refund_transaction` recibe `p_refund_amount = customer_price` (precio total incluyendo payment_fee).
- ShipFlow devuelve al saldo interno el total completo que pagó el cliente.
- No hay recálculo de pricing en void — se usa el `customer_price` guardado.

**Migración requerida:**
- `20260515_add_pricing_breakdown_to_shipments.sql` — debe aplicarse en Supabase antes de labels reales en staging.
- PREREQUISITO: `20260514_shipflow_security_logistics_foundation.sql` y `20260514_create_label_transaction_rpc.sql` deben estar aplicados primero.

### Pendiente antes de activar más providers externos

- Implementar `EasyPostAdapter.createLabel()` y `voidLabel()` (rates ya activos).
- Implementar `ShippoAdapter.getRates()`, `createLabel()`, `voidLabel()`.
- Implementar `EasyshipAdapter` ídem.
- Definir modelo matemático final de ranking/margen.

## USPS/UPS/FedEx/DHL

El servicio `realTrackingService` soporta nombres de courier y variables de entorno para consultar tracking externo si se configuran endpoints y API keys.

Esto no significa que existan integraciones completas con esos carriers.

Soporte actual:

- Tracking: preparado.
- Rates reales: no.
- Labels reales: no.
- Webhooks: no.
- Voids/refunds: no.

## ShipStation

### Estado FASE 4A / 4B / 4D

FASE 4A implemento rates reales. FASE 4B implemento labels reales. FASE 4D completa la atomicidad y el void real.

- `getRates()`: implementado. Llama a `POST /shipments/getrates` en ShipStation V1 API.
- `createLabel()`: implementado. Flujo V1: `POST /orders/createorder` → `POST /orders/createlabelfororder`. Devuelve `trackingNumber`, `providerShipmentId`, `providerLabelId`, `providerServiceCode`, `labelData` (base64 PDF). `labelUrl = null` (V1 no devuelve URL directa).
- `voidLabel()`: implementado (FASE 4D). Llama `POST /shipments/{shipmentId}/voidlabel`. Requiere `providerShipmentId` en `VoidLabelInput`. Devuelve `{ approved: true, message }`.
- `trackShipment()`: devuelve error controlado `NOT_IMPLEMENTED` (501). FASE 5.

ShipStation no debe ser llamado desde web client ni desde mobile. Vive en backend.

### Campos requeridos para labels ShipStation

El endpoint `POST /api/labels` con `provider: "shipstation"` requiere:

```json
{
  "provider": "shipstation",
  "origin": {
    "city": "Austin",
    "state": "TX",
    "postalCode": "78756",
    "country": "US"
  },
  "destination": {
    "city": "Miami",
    "state": "FL",
    "postalCode": "33101",
    "country": "US"
  },
  "parcel": {
    "weight": 1.5,
    "weightUnit": "lb"
  },
  "carrierCode": "stamps_com",
  "serviceCode": "usps_priority_mail",
  "expectedCost": 7.50,
  "idempotencyKey": "<uuid-generado-por-cliente>",
  "senderName": "John Doe",
  "senderPhone": "5551234567",
  "recipientName": "Jane Doe",
  "recipientPhone": "5559876543",
  "productType": "Package"
}
```

Campos obligatorios:
- `origin.postalCode` y `destination.postalCode`
- `parcel.weight > 0`
- `carrierCode` (carrier code de ShipStation: `stamps_com`, `ups`, `fedex`, `dhl_express`, etc.)
- `serviceCode` (obtenido de una llamada previa a `POST /api/rates` con `provider: "shipstation"`)

Campos opcionales:
- `expectedCost`: costo esperado del rate seleccionado; usado para validar saldo antes de comprar
- `idempotencyKey`: UUID generado por el cliente; si no se envia, el servidor genera uno
- `labelFormat`: `pdf`, `zpl`, o `png` (por ahora se pasa a ShipStation pero V1 puede ignorarlo)
- Datos del remitente/destinatario: usados en la orden de ShipStation

ADVERTENCIA: Esta llamada compra un label REAL en ShipStation si las credenciales estan configuradas. Requiere que la migracion FASE 1C este aplicada y que `SUPABASE_SERVICE_ROLE_KEY` este configurado (para la RPC atomica). No usar en produccion hasta aplicar la migration `20260514_create_label_transaction_rpc.sql` y verificar con pruebas manuales.

`labelData` en la respuesta:

- La respuesta incluye `labelData` (base64 PDF) devuelto por ShipStation V1.
- Este campo NO se guarda en la DB. El cliente debe guardarlo inmediatamente para impresion.
- No es recuperable en reintentos idempotentes (re-entry devuelve `labelData: null`).
- Para almacenarlo permanentemente, configurar Supabase Storage con `SHIPFLOW_LABELS_BUCKET` (futuro).

### Void de labels ShipStation

`POST /api/labels/{id}/void` con `provider = shipstation`:

Requiere:
- `SUPABASE_SERVICE_ROLE_KEY` configurado en el servidor.
- Migration `20260514_create_label_transaction_rpc.sql` aplicada (incluye `void_label_refund_transaction` RPC).
- Label con `label_status = purchased`.

Flujo:
1. Verifica propiedad del usuario.
2. Verifica idempotencia (refund ya existe → retorna 409 con estado actual).
3. Llama `ShipStationAdapter.voidLabel({ providerShipmentId })`.
4. Si ShipStation aprueba (`approved: true`), llama RPC `void_label_refund_transaction` via service_role.
5. RPC atomicamente: `label_status → voided`, `payment_status → refunded`, insert `balance_movement` tipo `refund`.

Respuesta exitosa:
```json
{ "labelStatus": "voided", "refunded": true, "message": "ShipStation label voided successfully." }
```

Si ShipStation void falla (label ya enviada, plazo vencido, etc.): el endpoint no modifica el balance. Solo retorna el error.

### Variables requeridas FASE 4A

```text
SHIPSTATION_API_KEY       # requerida
SHIPSTATION_API_SECRET    # recomendada (Basic Auth key:secret)
SHIPSTATION_BASE_URL      # opcional; default: https://ssapi.shipstation.com
```

`SHIPSTATION_WEBHOOK_SECRET` — requerida para FASE 5 (webhooks). Ver seccion FASE 5 mas abajo.

### Autenticacion ShipStation

ShipStation V1 usa Basic Auth: `Authorization: Basic base64(apiKey:apiSecret)`.
Si solo se configura `SHIPSTATION_API_KEY`, se usa `base64(apiKey:)` (password vacio).

### Campos requeridos para rates ShipStation

El endpoint `POST /api/rates` con `provider: "shipstation"` requiere:

```json
{
  "provider": "shipstation",
  "origin": {
    "city": "Austin",
    "state": "TX",
    "postalCode": "78756",
    "country": "US"
  },
  "destination": {
    "city": "Miami",
    "state": "FL",
    "postalCode": "33101",
    "country": "US"
  },
  "parcel": {
    "weight": 1.5,
    "weightUnit": "lb"
  },
  "courier": "stamps_com"
}
```

Campos obligatorios:
- `origin.postalCode` y `destination.postalCode`
- `parcel.weight > 0`
- `courier` (carrier code de ShipStation: `stamps_com`, `ups`, `fedex`, `dhl_express`, etc.)

### Errores manejados FASE 4A

| Situacion | Clase de error | HTTP |
|---|---|---|
| API key faltante | `ProviderUnavailableError` | 503 |
| 401/403 de ShipStation | `ProviderAuthError` | 401 |
| 429 rate limit | `ProviderRateLimitError` | 429 |
| 400 payload invalido | `InvalidPayloadError` | 400 |
| Postal code faltante | `InvalidAddressError` | 400 |
| Sin carrier code | `InvalidPayloadError` | 400 |
| Timeout/network | `ProviderUnavailableError` / `ProviderTimeoutError` | 503/504 |
| Sin rates devueltos | `ProviderUnavailableError` | 503 |

No se exponen secretos ni claves en los mensajes de error.

## FASE 4E — Validacion real controlada

FASE 4E no modifica codigo. Prepara el proceso de aplicacion y prueba real.

Checklist completo: `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md`

Incluye:
- Orden de migraciones: FASE 1C primero, luego RPC de FASE 4D.
- Verificacion de tipo de `balance_movements.id` antes de aplicar (debe ser `text`).
- Verificaciones SQL de columnas, funciones, permisos y RLS.
- Curls de ejemplo para rates, labels y void.
- Tabla de errores esperados.
- Checklist de aprobacion para habilitar produccion.

No conectar a produccion publica hasta completar el checklist.

## FASE 5 — Webhooks ShipStation

Endpoint: `POST /api/webhooks/shipstation`

### Como funciona

ShipStation V1 envia webhooks con payload ligero:

```json
{
  "resource_url": "https://ssapi.shipstation.com/shipments?shipmentId=12345",
  "resource_type": "ITEM_SHIPPED"
}
```

El endpoint:

1. Valida el secreto (query `?secret=` o header `x-shipflow-webhook-secret`).
2. Hace fetch a `resource_url` usando `SHIPSTATION_API_KEY` / `SHIPSTATION_API_SECRET` para obtener datos reales del shipment.
3. Normaliza el evento y genera un `event_id` (SHA-256 de `provider:resource_type:resource_url`).
4. Deduplica contra `webhook_events` por `provider + event_id`.
5. Inserta en `webhook_events` con `status = received`.
6. Busca el shipment relacionado por `provider_shipment_id`, `tracking_number` o `idempotency_key`.
7. Actualiza `shipments.status` y `shipments.label_status` segun estado de ShipStation.
8. Inserta `tracking_event` con `source = "shipstation_webhook"`, `is_real = true`.
9. Marca webhook como `status = processed`.

### Configuracion en ShipStation Dashboard

ShipStation V1 no soporta HMAC. El secreto va en la URL:

```
https://TU_DOMINIO/api/webhooks/shipstation?secret=TU_SHIPSTATION_WEBHOOK_SECRET
```

Eventos configurables:
- `ITEM_SHIPPED` — label comprada/enviada → tracking "En transito"
- `ORDER_NOTIFY` — cambio de estado de orden → actualiza status segun SS

### Variables nuevas FASE 5

```text
SHIPSTATION_WEBHOOK_SECRET   # REQUERIDA; genera con: openssl rand -hex 32
```

### Archivos nuevos

- `shipflow-web/app/api/webhooks/shipstation/route.ts` — endpoint
- `shipflow-web/lib/server/webhooks/shipstation.ts` — helpers, tipos, normalizador

### Checklist de prueba

`docs/SHIPSTATION_WEBHOOK_TEST_CHECKLIST.md`

### Mapeo de estados ShipStation → ShipFlow

| ShipStation status      | shipments.status (ES) | shipments.label_status |
|-------------------------|-----------------------|------------------------|
| `shipped` / `in_transit` | En transito           | —                      |
| `delivered`             | Entregado             | —                      |
| `exception`             | Excepcion             | —                      |
| `voided` / `cancelled`  | Cancelado             | voided                 |
| `awaiting_shipment`     | Pendiente             | —                      |

### Deuda pendiente

- Webhooks de tracking de carriers directos (USPS, UPS, FedEx, DHL) siguen pendientes.
- Mobile (FASE 6) todavia no consume estos webhooks directamente.
- ShipStation no garantiza delivery/exception webhooks en V1 sin configuracion adicional de tracking.

## Pirate Ship

Pirate Ship queda como opcion pendiente/no oficial hasta confirmar disponibilidad de API publica oficial y terminos de uso. No debe asumirse como proveedor integrable sin validacion previa.

## Adapter Pattern FASE 3

Estructura actual:

```text
shipflow-web/lib/logistics
├── adapters
│   ├── LogisticsAdapter.ts
│   ├── MockAdapter.ts
│   ├── ShipStationAdapter.ts
├── registry.ts
├── pricing.ts
├── types.ts
└── errors.ts
```

Contrato conceptual:

```ts
type LogisticsAdapter = {
  getRates(input: RateInput): Promise<RateResult[]>;
  createLabel(input: CreateLabelInput): Promise<LabelResult>;
  voidLabel(input: VoidLabelInput): Promise<VoidLabelResult>;
  trackShipment?(input: TrackingInput): Promise<TrackingResult>;
};
```

Estado:

- `MockAdapter`/internal esta activo para rates y labels internas.
- `pricing.ts` prepara `provider_cost`, `platform_markup`, `customer_price` y `currency`.
- `registry.ts` permite seleccionar `internal`, `mock` o `shipstation`.
- `ShipStationAdapter` existe solo como skeleton; no hace llamadas externas reales.

## Endpoints futuros

```text
POST /api/rates
POST /api/labels
POST /api/labels/[id]/void
POST /api/webhooks/shipstation
```

Reglas:

- Todos los endpoints de usuario deben validar sesion.
- `/api/labels` debe ser transaccional e idempotente.
- `/api/webhooks/shipstation` debe validar firma/secreto.
- Mobile debe consumir estos endpoints, no Supabase directo para operaciones sensibles.

Estado FASE 2/3/4A/4B/4D:

- `POST /api/rates` ya existe. Default usa el adapter internal/mock sobre `couriers`. Si el body trae `provider: "shipstation"`, llama a ShipStation real (FASE 4A).
- `POST /api/labels` ya existe y crea label interna/mock (default) o label real ShipStation (FASE 4B). Persistencia atomica via RPC (FASE 4D). Requiere `SUPABASE_SERVICE_ROLE_KEY` para provider shipstation.
- `POST /api/labels/[id]/void` actualizado en FASE 4D: para provider shipstation, llama void real en ShipStation y refund atomico via RPC. Para labels internas, sigue siendo void local limitado.
- `POST /api/webhooks/shipstation` sigue pendiente (FASE 5).

ADVERTENCIA: `POST /api/labels` con `provider: "shipstation"` compra un label REAL. Requiere migracion FASE 1C aplicada, `SUPABASE_SERVICE_ROLE_KEY` configurado y migration `20260514_create_label_transaction_rpc.sql` aplicada. Seguir `docs/SHIPSTATION_REAL_TEST_CHECKLIST.md` antes de usar en produccion.

## Pricing futuro

Campos necesarios:

- `provider_cost`: costo cobrado por proveedor.
- `platform_markup`: margen de ShipFlow.
- `customer_price`: precio final al usuario.

Regla:

```text
customer_price = provider_cost + platform_markup
```

El cliente puede mostrar estimaciones, pero el backend debe calcular y persistir el precio confiable.

## Idempotencia

Crear labels reales debe usar `idempotency_key`.

Debe evitar:

- Doble compra de label.
- Doble descuento de balance.
- Duplicados por retry.
- Estados incompletos si el proveedor responde tarde.

## Webhooks

Los webhooks deben:

- Guardar payload crudo.
- Validar autenticidad.
- Ser idempotentes.
- Actualizar `label_status`, `payment_status` o tracking segun aplique.
- Mantener auditoria.

## Tracking real

Tracking futuro deberia poder venir de:

- ShipStation.
- Carrier directo.
- Webhooks.
- Polling controlado.

El fallback debe estar claramente marcado como fallback para no confundirse con estado real.
