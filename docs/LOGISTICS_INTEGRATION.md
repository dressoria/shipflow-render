# Integracion logistica

## Estado actual de providers

Actualmente no existe integracion real para comprar labels.

Detectado:

- USPS
- UPS
- FedEx
- DHL

Uso actual:

- Solo tracking preparado.
- Las tarifas son calculadas localmente.
- Las labels son visuales/imprimibles.
- FASE 3 agrega una capa Adapter Pattern internal/mock.
- No hay ShipStation.
- No hay Shippo.
- No hay EasyPost.
- No hay ShipEngine.
- No hay webhooks logisticos reales.
- No hay manifests ni pickups.
- No hay void/cancel de label real.

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

### Estado FASE 4A / 4B

FASE 4A implemento rates reales. FASE 4B implementa labels reales.

- `getRates()`: implementado. Llama a `POST /shipments/getrates` en ShipStation V1 API.
- `createLabel()`: implementado. Flujo V1: `POST /orders/createorder` → `POST /orders/createlabelfororder`. Devuelve `trackingNumber`, `providerShipmentId`, `providerLabelId`, `providerServiceCode`. `labelUrl = null` (V1 devuelve base64, no URL).
- `voidLabel()`: devuelve error controlado `NOT_IMPLEMENTED` (501). FASE 4D.
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

ADVERTENCIA: Esta llamada compra un label REAL en ShipStation si las credenciales estan configuradas. Requiere que la migracion FASE 1C este aplicada. No usar en produccion hasta activar la RPC atomica.

### Variables requeridas FASE 4A

```text
SHIPSTATION_API_KEY       # requerida
SHIPSTATION_API_SECRET    # recomendada (Basic Auth key:secret)
SHIPSTATION_BASE_URL      # opcional; default: https://ssapi.shipstation.com
```

`SHIPSTATION_WEBHOOK_SECRET` se usara en FASE 5; no configurar todavia.

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

Estado FASE 2/3/4A:

- `POST /api/rates` ya existe. Default usa el adapter internal/mock sobre `couriers`. Si el body trae `provider: "shipstation"`, llama a ShipStation real (FASE 4A).
- `POST /api/labels` ya existe y crea label interna/mock; no compra label real. ShipStation labels son FASE 4B.
- `POST /api/labels/[id]/void` ya existe como void interno limitado; no llama proveedor ni hace refund real.
- `POST /api/webhooks/shipstation` sigue pendiente (FASE 5).
- Labels reales ShipStation quedan para FASE 4B.
- Void/refund real queda para FASE 4C.

ADVERTENCIA: `POST /api/labels` con `provider: "shipstation"` compra un label REAL. Requiere migracion FASE 1C aplicada. No usar en produccion hasta activar la RPC atomica y validar con pruebas manuales completas.

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
