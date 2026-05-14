# ShipStation Webhook Test Checklist

## Estado

FASE 5 — Webhooks ShipStation. Implementado en `app/api/webhooks/shipstation/route.ts`.

Este checklist debe completarse manualmente en el entorno staging/producción antes de confirmar que los webhooks funcionan correctamente.

---

## A. Pre-requisitos

### A1. Infraestructura

- [ ] El servidor staging/producción está corriendo con HTTPS (SSL obligatorio — ShipStation no envía webhooks a URLs HTTP).
- [ ] Nginx está configurado y responde en `https://TU_DOMINIO`.
- [ ] El contenedor Docker tiene la variable `SHIPSTATION_WEBHOOK_SECRET` configurada.
- [ ] La migración FASE 1C (`20260514_shipflow_security_logistics_foundation.sql`) está aplicada — sin ella no existe la tabla `webhook_events`.
- [ ] La variable `SUPABASE_SERVICE_ROLE_KEY` está configurada en el servidor.
- [ ] Las variables `SHIPSTATION_API_KEY` y `SHIPSTATION_API_SECRET` están configuradas en el servidor.

### A2. Verificar tabla webhook_events en Supabase SQL Editor

```sql
-- Confirmar que la tabla existe con todos sus campos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'webhook_events'
ORDER BY ordinal_position;
```

Campos esperados: `id`, `provider`, `event_id`, `event_type`, `shipment_id`, `tracking_number`,
`payload`, `received_at`, `processed_at`, `status`, `error`.

```sql
-- Confirmar constraint de status
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'webhook_events_status_check';
```

Esperado: `check (status in ('received', 'processing', 'processed', 'failed', 'ignored'))`.

```sql
-- Confirmar índice de deduplicación
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'webhook_events'
  AND indexname = 'webhook_events_provider_event_id_unique_idx';
```

Esperado: índice único parcial sobre `(provider, event_id) WHERE event_id IS NOT NULL`.

---

## B. Configurar SHIPSTATION_WEBHOOK_SECRET

### B1. Generar un secreto seguro

```bash
# En tu terminal local (NO usar este valor de ejemplo)
openssl rand -hex 32
# Ejemplo de salida: a3f8c2d1e9b7... (64 caracteres hex)
```

### B2. Agregar al servidor

En el servidor (por SSH), agregar al archivo de variables de entorno del contenedor:

```bash
# Editar .env.production (sin mostrar el valor aquí)
SHIPSTATION_WEBHOOK_SECRET=EL_VALOR_GENERADO_CON_OPENSSL
```

Reiniciar el contenedor:

```bash
docker compose up -d --build shipflow-web
```

### B3. Verificar que está configurada (sin mostrar el valor)

```bash
docker exec shipflow-web env | grep SHIPSTATION_WEBHOOK_SECRET | cut -d= -f1
# Debe mostrar: SHIPSTATION_WEBHOOK_SECRET
```

---

## C. Configurar webhook en ShipStation Dashboard

### C1. URL del webhook

ShipStation no soporta firma HMAC en V1. El secreto se pasa como query parameter:

```
https://TU_DOMINIO/api/webhooks/shipstation?secret=EL_VALOR_GENERADO
```

**IMPORTANTE**: No compartir esta URL completa. Contiene el secreto en texto plano en el query parameter. Tratar como secreto de la misma forma que una API key.

Si usas un proxy (Nginx/Cloudflare) que puede inyectar headers, también puedes configurar:

```
Header: x-shipflow-webhook-secret: EL_VALOR_GENERADO
URL: https://TU_DOMINIO/api/webhooks/shipstation
```

El endpoint acepta ambos; el header tiene prioridad.

### C2. Pasos en ShipStation

1. Ir a **Settings → Integrations → Webhooks** (o **Account → API Settings → Webhooks**).
2. Hacer clic en **Add Webhook** / **Subscribe to Webhook**.
3. Configurar:
   - **Event**: `ITEM_SHIPPED` (label purchased/shipped)
   - **Store**: Tu tienda de ShipStation (o "All stores")
   - **URL**: `https://TU_DOMINIO/api/webhooks/shipstation?secret=TU_SECRET`
4. Repetir para `ORDER_NOTIFY` si necesitas actualizaciones de estado de orden.
5. Guardar.

### C3. Eventos soportados

| resource_type  | Descripción                              | Acción en ShipFlow                            |
|----------------|------------------------------------------|-----------------------------------------------|
| `ITEM_SHIPPED` | Label comprada / envío creado            | → tracking "En tránsito", update shipment     |
| `SHIP_NOTIFY`  | Notificación de envío (similar al anterior) | → tracking "En tránsito"                  |
| `ORDER_NOTIFY` | Cambio de estado de orden               | → update shipment según status                |
| Otros          | Cualquier otro evento                   | Se guarda en webhook_events, no se procesa    |

---

## D. Prueba 1 — Verificar endpoint (sin ShipStation)

### D1. Probar que el endpoint responde sin secreto

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://TU_DOMINIO/api/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -d '{"resource_type": "ITEM_SHIPPED", "resource_url": "https://example.com"}'
```

**Esperado: `401`** — rechaza sin secreto.

### D2. Probar que el endpoint responde con secreto incorrecto

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://TU_DOMINIO/api/webhooks/shipstation?secret=SECRETO_INCORRECTO" \
  -H "Content-Type: application/json" \
  -d '{"resource_type": "ITEM_SHIPPED", "resource_url": "https://example.com"}'
```

**Esperado: `401`** — rechaza secreto inválido.

### D3. Probar con secreto correcto (evento desconocido, sin shipment)

```bash
export WH_SECRET="EL_VALOR_DE_SHIPSTATION_WEBHOOK_SECRET"

curl -s -X POST "https://TU_DOMINIO/api/webhooks/shipstation?secret=$WH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "ITEM_SHIPPED",
    "resource_url": "https://ssapi.shipstation.com/shipments?shipmentId=99999999"
  }' | jq .
```

**Esperado:**
```json
{
  "success": true,
  "data": { "received": true, "processed": true },
  "error": null
}
```

El `resource_url` con un shipmentId inexistente fallará al hacer fetch de SS API — esto es esperado. El webhook se guarda de todas formas.

---

## E. Verificar en Supabase SQL Editor (después de D3)

```sql
-- Ver el evento recibido
SELECT id, provider, event_id, event_type, tracking_number,
       shipment_id, status, received_at, processed_at, error
FROM webhook_events
ORDER BY received_at DESC
LIMIT 5;
```

**Esperado:**
- `provider = 'shipstation'`
- `event_type = 'ITEM_SHIPPED'`
- `status = 'processed'` (o `'failed'` si hubo error en el procesamiento)
- `shipment_id = null` (no hay shipment para ese ID de ShipStation ficticio)

---

## F. Prueba 2 — Webhook real (requiere label real con FASE 4)

Esta prueba solo es posible si tienes una label real comprada mediante `POST /api/labels` con `provider: "shipstation"`.

### F1. Obtener datos del shipment de prueba

```sql
-- Obtener el último shipment de ShipStation
SELECT id, tracking_number, provider_shipment_id, provider_service_code,
       label_status, status, customer_price
FROM shipments
WHERE provider = 'shipstation'
  AND label_status = 'purchased'
ORDER BY created_at DESC
LIMIT 1;
```

### F2. Simular webhook ITEM_SHIPPED con datos reales

Reemplaza `PROVIDER_SHIPMENT_ID` con el `provider_shipment_id` real del shipment:

```bash
export WH_SECRET="EL_VALOR_DE_SHIPSTATION_WEBHOOK_SECRET"
export SS_SHIPMENT_ID="PROVIDER_SHIPMENT_ID"

curl -s -X POST "https://TU_DOMINIO/api/webhooks/shipstation?secret=$WH_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"resource_type\": \"ITEM_SHIPPED\",
    \"resource_url\": \"https://ssapi.shipstation.com/shipments?shipmentId=$SS_SHIPMENT_ID\"
  }" | jq .
```

**Esperado:**
```json
{ "success": true, "data": { "received": true, "processed": true }, "error": null }
```

### F3. Verificar actualización en Supabase

```sql
-- Ver que el shipment se actualizó
SELECT id, status, label_status, tracking_number
FROM shipments
WHERE provider = 'shipstation'
ORDER BY created_at DESC
LIMIT 1;
```

Esperado según el estado en ShipStation:
- `status = 'En tránsito'` si el shipment está shipped.

```sql
-- Ver el tracking_event insertado por el webhook
SELECT id, title, description, status, source, is_real, event_date
FROM tracking_events
WHERE source = 'shipstation_webhook'
ORDER BY created_at DESC
LIMIT 5;
```

Esperado:
- `source = 'shipstation_webhook'`
- `is_real = true`
- `title = 'En tránsito'` (para ITEM_SHIPPED)

---

## G. Prueba 3 — Idempotencia (mismo evento, no duplicar)

```bash
# Enviar el mismo webhook dos veces seguidas
curl -s -X POST "https://TU_DOMINIO/api/webhooks/shipstation?secret=$WH_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"resource_type\": \"ITEM_SHIPPED\",
    \"resource_url\": \"https://ssapi.shipstation.com/shipments?shipmentId=$SS_SHIPMENT_ID\"
  }" | jq .
```

**Esperado en el segundo envío:**
```json
{ "success": true, "data": { "received": true, "duplicate": true, "status": "processed" }, "error": null }
```

Verificar en Supabase que no se creó un segundo webhook_event ni un segundo tracking_event:

```sql
SELECT COUNT(*) FROM webhook_events
WHERE provider = 'shipstation' AND event_type = 'ITEM_SHIPPED';
-- Esperado: 1 (o el número de eventos reales; el duplicado no se insertó)

SELECT COUNT(*) FROM tracking_events
WHERE source = 'shipstation_webhook' AND status = 'En tránsito';
-- Esperado: 1 por shipment
```

---

## H. Revisar logs Docker

```bash
docker compose logs --tail=100 shipflow-web | grep -i webhook
```

Verificar:
- Sin secretos en logs.
- Sin stack traces.
- Líneas como `[webhook/shipstation] ...` solo deben aparecer en errores, no en flujo normal.

```bash
# Confirmar que el secreto no aparece en logs
docker compose logs --tail=200 shipflow-web | grep -i "webhook_secret\|WEBHOOK_SECRET"
# Esperado: sin resultados
```

---

## I. Checklist de aprobación antes de producción

### Seguridad

- [ ] `SHIPSTATION_WEBHOOK_SECRET` configurado en servidor (no en repo).
- [ ] El valor del secreto NO aparece en logs de Docker ni Nginx.
- [ ] El endpoint devuelve 401 sin secreto válido.
- [ ] El endpoint devuelve 401 con secreto incorrecto.
- [ ] La URL del webhook no está en el código fuente.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado en servidor (no en repo).

### Funcionalidad

- [ ] El endpoint responde 200 con secreto correcto.
- [ ] Los eventos se guardan en `webhook_events` con `status = processed`.
- [ ] El shipment correspondiente se actualiza con el nuevo status.
- [ ] Se inserta un `tracking_event` con `source = 'shipstation_webhook'` y `is_real = true`.
- [ ] Eventos duplicados (mismo `event_id`) retornan `duplicate: true` sin crear registros nuevos.
- [ ] Eventos sin shipment relacionado se procesan sin error (status = processed, shipment_id = null).

### Infraestructura

- [ ] HTTPS activo — ShipStation requiere HTTPS para webhooks.
- [ ] La URL de webhook está configurada en ShipStation Dashboard.
- [ ] Se probó al menos un evento real de ShipStation (no solo simulado).
- [ ] Los logs de Docker no contienen secretos.

---

## J. Qué queda pendiente (FASE 6+)

- **FASE 6**: Mobile conectado al backend seguro (rates, labels, tracking via API).
- **Tracking por carrier**: El endpoint `POST /api/tracking` puede consultar carriers directos (USPS, UPS, FedEx, DHL) si se configuran las variables de entorno correspondientes. Los webhooks de ShipStation completan el tracking automático para shipments creados vía ShipStation.
- **Storage de label PDFs**: `labelData` (base64) se devuelve solo en la respuesta inmediata. Para almacenamiento permanente, configurar `SHIPFLOW_LABELS_BUCKET` con Supabase Storage.
- **Webhooks de otros proveedores**: El patrón de `webhook_events` está diseñado para soportar múltiples proveedores (campo `provider`). Futuros adapters (Shippo, EasyPost) pueden seguir el mismo patrón.
