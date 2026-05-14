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

ShipStation esta pendiente. Debe integrarse despues de corregir seguridad, RLS, balance y backend transaccional.

ShipStation no debe ser llamado desde web client ni desde mobile. Debe vivir en backend.

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

Estado FASE 2/3:

- `POST /api/rates` ya existe y usa el adapter internal/mock sobre `couriers`.
- `POST /api/labels` ya existe y crea label interna/mock mediante la capa `lib/logistics`; no compra label real.
- `POST /api/labels/[id]/void` ya existe como void interno limitado; no llama proveedor ni hace refund real.
- `POST /api/webhooks/shipstation` sigue pendiente.
- La integracion real de ShipStation queda para FASE 4.

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
