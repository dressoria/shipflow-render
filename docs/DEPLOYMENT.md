# Deployment

## Estado actual de infraestructura

Actualmente el proyecto no tiene configuracion de despliegue propia para VM.

No existe:

- `Dockerfile`.
- `docker-compose.yml`.
- Configuracion de Nginx.
- Configuracion SSL.
- Documentacion de deploy a servidor.

Existe:

- Scripts de build/start en `shipflow-web`.
- Scripts Expo en `shipflow-mobile`.
- README internos con instrucciones basicas.
- `shipflow-web/.env.example` con placeholders sin secretos reales.
- `shipflow-mobile/.env.example` con placeholders sin secretos reales.

## Objetivo futuro

Desplegar `shipflow-web` en una VM por SSH usando:

- Docker.
- docker-compose.
- Nginx como reverse proxy.
- SSL.
- Variables de entorno server-side.

Mobile se debe manejar con flujo Expo/EAS o builds nativos; no se despliega en la VM igual que la web.

## Variables de entorno necesarias

Web publicas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   # OPCIONAL — habilita Google Places Autocomplete y mapa con pin en /crear-guia
                                   # Si está vacía el formulario funciona en modo manual completo
                                   # Con key: aparecen tabs "Buscar dirección" y "Seleccionar en mapa" en el formulario
                                   # El mapa usa Geocoder para reverse geocoding; no necesita librería npm adicional
                                   # Restringir por HTTP referrer en Google Cloud Console antes de producción
                                   # Requiere: Maps JavaScript API + Places API habilitados en el proyecto de Google Cloud
```

Web privadas:

```text
SUPABASE_SERVICE_ROLE_KEY        # REQUERIDA para RPC atomica y webhooks
INTERNAL_API_SECRET
SHIPSTATION_API_KEY              # REQUERIDA para rates/labels/void/webhooks
SHIPSTATION_API_SECRET           # recomendada (Basic Auth key:secret)
SHIPSTATION_BASE_URL             # opcional; default https://ssapi.shipstation.com
SHIPSTATION_WEBHOOK_SECRET       # REQUERIDA para autenticar webhooks entrantes; generar con: openssl rand -hex 32
PAYMENT_PROVIDER_SECRET
WEBHOOK_PAYMENT_SECRET
```

Nota sobre webhooks: ShipStation requiere HTTPS para enviar webhooks. El servidor staging/produccion debe tener SSL configurado antes de registrar la URL del webhook en ShipStation Dashboard.

URL del webhook que registrar en ShipStation:
```
https://TU_DOMINIO/api/webhooks/shipstation?secret=EL_VALOR_DE_SHIPSTATION_WEBHOOK_SECRET
```

Tracking carriers actuales:

```text
USPS_API_URL
USPS_API_KEY
USPS_TRACKING_API_URL
USPS_TRACKING_API_KEY
UPS_API_URL
UPS_API_KEY
UPS_TRACKING_API_URL
UPS_TRACKING_API_KEY
FEDEX_API_URL
FEDEX_API_KEY
FEDEX_TRACKING_API_URL
FEDEX_TRACKING_API_KEY
DHL_API_URL
DHL_API_KEY
DHL_TRACKING_API_URL
DHL_TRACKING_API_KEY
```

Mobile publicas:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_TRACKING_API_URL
```

## Archivos env locales

Para desarrollo local:

```bash
cp shipflow-web/.env.example shipflow-web/.env.local
cp shipflow-mobile/.env.example shipflow-mobile/.env
```

No escribir valores reales en los archivos `.env.example`.

En servidor Docker/VM, las variables reales deben vivir en el `.env` del servidor, secretos del proveedor de infraestructura, o el mecanismo de secrets elegido. No deben ir a GitHub.

## Que debe ir en servidor

- API keys privadas de ShipStation/proveedores.
- Secretos de webhooks.
- Variables de runtime de Next.js.
- Configuracion de dominio/SSL.
- Logs de aplicacion.

## Que no debe ir al repo

- API keys reales.
- Secrets de webhooks.
- Service role key.
- Certificados privados.
- Dumps de base de datos con datos reales.
- Archivos `.env` reales.
- `.env.local` con credenciales reales.

## Plan futuro de deploy

FASE 7 propuesta:

1. Crear `.env.example` para web sin valores reales.
2. Crear Dockerfile para `shipflow-web`.
3. Crear `docker-compose.yml`.
4. Configurar Nginx reverse proxy.
5. Configurar SSL.
6. Definir healthcheck.
7. Documentar comandos SSH.
8. Probar build local.
9. Probar deploy en staging antes de produccion.

## Consideraciones de produccion

Antes de produccion:

- Corregir RLS.
- Mover operaciones sensibles al backend.
- Agregar rate limiting.
- Agregar logs/auditoria.
- Validar webhooks.
- Separar variables publicas y privadas.
- No habilitar dinero real hasta que balance sea seguro.
