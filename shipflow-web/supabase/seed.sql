insert into public.couriers (
  id,
  nombre,
  activo,
  logo_url,
  cobertura,
  precio_base,
  precio_por_kg,
  permite_contra_entrega,
  comision_contra_entrega,
  tiempo_estimado,
  notas
) values
  (
    'usps',
    'USPS',
    true,
    '/images/couriers/usps.svg',
    'Nationwide',
    4.95,
    0.85,
    false,
    0.00,
    '2-5 business days',
    'Affordable nationwide postal service for lightweight parcels.'
  ),
  (
    'ups',
    'UPS',
    true,
    '/images/couriers/ups.svg',
    'Nationwide',
    7.80,
    1.15,
    false,
    0.00,
    '1-3 business days',
    'Reliable ground and express shipping for small businesses.'
  ),
  (
    'fedex',
    'FedEx',
    true,
    '/images/couriers/fedex.svg',
    'Nationwide',
    8.25,
    1.20,
    false,
    0.00,
    '1-3 business days',
    'Express and ground options for ecommerce shipments.'
  ),
  (
    'dhl',
    'DHL',
    true,
    '/images/couriers/dhl.svg',
    'U.S. and international',
    9.40,
    1.35,
    false,
    0.00,
    '2-6 business days',
    'Strong international coverage with domestic handoff support.'
  )
on conflict (id) do update
set
  nombre = excluded.nombre,
  activo = excluded.activo,
  logo_url = excluded.logo_url,
  cobertura = excluded.cobertura,
  precio_base = excluded.precio_base,
  precio_por_kg = excluded.precio_por_kg,
  permite_contra_entrega = excluded.permite_contra_entrega,
  comision_contra_entrega = excluded.comision_contra_entrega,
  tiempo_estimado = excluded.tiempo_estimado,
  notas = excluded.notas,
  updated_at = now();

-- Initial admin user:
-- 1. Create the Supabase Auth user with email admin@shipflow.local.
-- 2. Then run:
-- update public.profiles set role = 'admin' where email = 'admin@shipflow.local';
