-- ============================================================================
-- Coca-Cola Event Intelligence
-- Seed: catalogos + dataset de demo para validar vistas y dashboards.
-- Ejecutar con: psql -f supabase/seed.sql
-- ============================================================================

-- -------------------------
-- Roles
-- -------------------------
INSERT INTO role (nombre, descripcion) VALUES
  ('administrador', 'Acceso total: eventos, campanas, usuarios y configuracion'),
  ('organizador',   'Opera sus eventos: participantes, QR, check-in, actividades y degustaciones'),
  ('marketing',     'Analiza dashboards, campanas y KPIs'),
  ('participante',  'Asiste a eventos, responde encuestas y canjea cupones')
ON CONFLICT (nombre) DO NOTHING;

-- -------------------------
-- Catalogos
-- -------------------------
INSERT INTO tipo_evento (nombre, descripcion) VALUES
  ('Festival',      'Festival de musica o marca'),
  ('Activacion',    'Activacion de marca en plaza'),
  ('Sampling',      'Muestreo y degustacion'),
  ('Feria',         'Feria o exposicion del sector'),
  ('Conferencia',   'Evento corporativo B2B')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_producto (nombre, descripcion) VALUES
  ('Gaseosa',    'Mezclas gaseosas')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_producto (nombre, descripcion) VALUES
  ('Gaseosa', 'Mezclas gaseosas'),
  ('Agua',    'Agua mineral y saborizada'),
  ('Energizante', 'Bebidas energizantes'),
  ('Jugo',     'Jugos y smoothies'),
  ('Sin azucar', 'Variantes zero / sin azucar'),
  ('Empaque',  'Botellas y latas retornables')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_actividad (nombre, descripcion) VALUES
  ('Degustacion',    'Prueba de producto guiada'),
  ('Charla',         'Charla o taller'),
  ('Show',           'Espectaculo en vivo'),
  ('Zona de juego',  'Experiencia ludica'),
  ('Fotografia',     'Activacion de marca / selfie')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_promocion (nombre, descripcion) VALUES
  ('Cupon_descuento',   'Descuento sobre el precio de lista'),
  ('Producto_gratis',   'Producto de regalo'),
  ('Muestra',           'Muestra de producto'),
  ('Pase_vip',          'Acceso VIP a zona restringida'),
  ('Combo',             'Pack de productos')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO preferencia_calif (nombre, descripcion) VALUES
  ('Producto',    'Calidad del producto'),
  ('Espacio',     'Ambiente y organizacion del evento'),
  ('Personal',    'Trato del equipo en pista'),
  ('Animacion',   'Shows y actividades'),
  ('Recomienda',  'Intencion de recompra / recomendacion')
ON CONFLICT (nombre) DO NOTHING;

-- -------------------------
-- Staff
-- -------------------------
INSERT INTO usuario (role_id, nombre, email, celular, rango_edad, ciudad, acepta_marketing)
SELECT r.id, 'Laura Admin', 'admin@coca.test', '+51900100001', '35-44', 'Lima', TRUE
FROM role r WHERE r.nombre = 'administrador'
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuario (role_id, nombre, email, celular, rango_edad, ciudad, acepta_marketing)
SELECT r.id, 'Diego Organizador', 'organizador@coca.test', '+51900100002', '35-44', 'Lima', TRUE
FROM role r WHERE r.nombre = 'organizador'
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuario (role_id, nombre, email, celular, rango_edad, ciudad, acepta_marketing)
SELECT r.id, 'Mila Marketing', 'marketing@coca.test', '+51900100003', '25-34', 'Bogota', TRUE
FROM role r WHERE r.nombre = 'marketing'
ON CONFLICT (email) DO NOTHING;

-- -------------------------
-- Campanas
-- -------------------------
INSERT INTO campana (nombre, descripcion, fecha_inicio, fecha_fin, presupuesto, activa)
SELECT 'Verano Explotivo', 'Campana de verano 2026', '2026-01-01', '2026-03-31', 25000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM campana WHERE nombre = 'Verano Explotivo');

INSERT INTO campana (nombre, descripcion, fecha_inicio, fecha_fin, presupuesto, activa)
SELECT 'Temporada Dorada', 'Campana de fin de ano', '2026-11-01', '2026-12-31', 48000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM campana WHERE nombre = 'Temporada Dorada');

-- -------------------------
-- Eventos
-- -------------------------
INSERT INTO evento (nombre, descripcion, tipo_evento_id, campana_id, organizador_id,
                    estado, fecha_inicio, fecha_fin, ciudad, lugar, aforo)
SELECT 'Festival Lima 2026', 'Festival de musica con activacion de marca',
       te.id, c.id, u.id, 'finalizado',
       '2026-02-13 14:00:00+00', '2026-02-14 02:00:00+00',
       'Lima', 'Plaza de Armas', 800
FROM tipo_evento te, campana c, usuario u
WHERE te.nombre = 'Festival' AND c.nombre = 'Verano Explotivo'
  AND u.email = 'organizador@coca.test'
  AND NOT EXISTS (SELECT 1 FROM evento WHERE nombre = 'Festival Lima 2026');

INSERT INTO evento (nombre, descripcion, tipo_evento_id, campana_id, organizador_id,
                    estado, fecha_inicio, fecha_fin, ciudad, lugar, aforo)
SELECT 'Sampling Miraflores', 'Ruta de muestreo en centros comerciales',
       te.id, c.id, u.id, 'activo',
       '2026-03-01 10:00:00+00', '2026-03-31 22:00:00+00',
       'Lima', 'Jirangayero 1234', 150
FROM tipo_evento te, campana c, usuario u
WHERE te.nombre = 'Sampling' AND c.nombre = 'Verano Explotivo'
  AND u.email = 'organizador@coca.test'
  AND NOT EXISTS (SELECT 1 FROM evento WHERE nombre = 'Sampling Miraflores');

-- -------------------------
-- Productos
-- -------------------------
INSERT INTO producto (tipo_producto_id, nombre, sku, precio)
SELECT tp.id, v.nombre, v.sku, v.precio
FROM tipo_producto tp
JOIN (VALUES
  ('Gaseosa',     'Coca-Cola Original 500ml',   'CC-ORIG-500', 3.50),
  ('Gaseosa',     'Coca-Cola Zero 500ml',       'CC-ZERO-500', 3.50),
  ('Agua',        'Coca-Cola Agua 500ml',        'AGUA-500',    2.50),
  ('Energizante', 'Top Cola 250ml',              'TOP-250',     5.00),
  ('Jugo',        'Fanta Naranja 500ml',         'FAN-500',    3.20)
) AS v(tipo, nombre, sku, precio) ON v.tipo = tp.nombre
WHERE NOT EXISTS (SELECT 1 FROM producto WHERE producto.sku = v.sku);

-- -------------------------
-- Producto por evento
-- -------------------------
INSERT INTO evento_producto (evento_id, producto_id, stock_inicial, stock_actual, destacado)
SELECT e.id, pr.id, 500, 500, (pr.sku IN ('CC-ORIG-500', 'CC-ZERO-500'))
FROM evento e
CROSS JOIN producto pr
WHERE e.nombre IN ('Festival Lima 2026', 'Sampling Miraflores')
  AND NOT EXISTS (
    SELECT 1 FROM evento_producto ep
    WHERE ep.evento_id = e.id AND ep.producto_id = pr.id
  );

-- -------------------------
-- Actividades
-- -------------------------
INSERT INTO actividad (evento_id, tipo_actividad_id, nombre, descripcion, cupo)
SELECT e.id, ta.id, 'Degustacion Signature', 'Cabina de degustacion de la nueva formula', 60
FROM evento e, tipo_actividad ta
WHERE e.nombre = 'Festival Lima 2026' AND ta.nombre = 'Degustacion'
  AND NOT EXISTS (SELECT 1 FROM actividad WHERE nombre = 'Degustacion Signature');

INSERT INTO actividad (evento_id, tipo_actividad_id, nombre, descripcion, cupo)
SELECT e.id, ta.id, 'Charla con la marca', 'Historia de la marca y el sabor original', 80
FROM evento e, tipo_actividad ta
WHERE e.nombre = 'Festival Lima 2026' AND ta.nombre = 'Charla'
  AND NOT EXISTS (SELECT 1 FROM actividad WHERE nombre LIKE 'Charla con%');

-- -------------------------
-- Dataset de participantes
-- -------------------------
INSERT INTO usuario (role_id, nombre, email, celular, rango_edad, genero, ciudad, acepta_marketing)
SELECT r.id,
       'Part ' || LPAD(g::TEXT, 3, '0'),
       'participante' || LPAD(g::TEXT, 3, '0') || '@coca.test',
       '+51999' || LPAD(g::TEXT, 6, '0'),
       (ARRAY['18-24','25-34','35-44','45-54','55+'])[1 + (g % 5)]::rango_edad,
       (ARRAY['F','M','X'])[1 + (g % 3)],
       (ARRAY['Lima','Bogota','Medellin','Arequipa'])[1 + (g % 4)],
       (g % 3 = 0)
FROM role r, generate_series(1, 120) AS g
WHERE r.nombre = 'participante'
  AND NOT EXISTS (
    SELECT 1 FROM usuario u2
    WHERE u2.email = 'participante' || LPAD(g::TEXT, 3, '0') || '@coca.test'
  );

-- -------------------------
-- Registros: 90 al Festival (40 recurrentes de la edicion previa), 60 al Sampling
-- -------------------------
INSERT INTO registro_asistido (evento_id, usuario_id, fuente, aceptado_consentimiento, aceptado_marketing)
SELECT e.id,
       u.id,
       (ARRAY['web','presencial','import','qr','app'])[1 + (i % 5)]::fuente_registro,
       TRUE,
       (i % 3 = 0)
FROM evento e
CROSS JOIN generate_series(1, 90) AS i
JOIN LATERAL (
  SELECT u2.id
  FROM usuario u2
  WHERE u2.email = 'participante' || LPAD((((i - 1) % 120) + 1)::TEXT, 3, '0') || '@coca.test'
) u ON TRUE
WHERE e.nombre = 'Festival Lima 2026'
  AND NOT EXISTS (
    SELECT 1 FROM registro_asistido ra
    WHERE ra.evento_id = e.id AND ra.usuario_id = u.id
  );

INSERT INTO registro_asistido (evento_id, usuario_id, fuente, aceptado_consentimiento, aceptado_marketing)
SELECT e.id,
       u.id,
       (ARRAY['web','presencial','qr'])[1 + (i % 3)]::fuente_registro,
       TRUE,
       (i % 2 = 0)
FROM evento e
CROSS JOIN generate_series(1, 60) AS i
JOIN LATERAL (
  SELECT u2.id
  FROM usuario u2
  WHERE u2.email = 'participante' || LPAD((60 + (i % 60))::TEXT, 3, '0') || '@coca.test'
) u ON TRUE
WHERE e.nombre = 'Sampling Miraflores'
  AND NOT EXISTS (
    SELECT 1 FROM registro_asistido ra
    WHERE ra.evento_id = e.id AND ra.usuario_id = u.id
  );

-- -------------------------
-- Check-ins: 70 de 90 en Festival, 38 de 60 en Sampling
-- -------------------------
INSERT INTO check_in (registro_asistido_id, validado, validado_por, hora_ingreso, hora_salida)
SELECT ra.id, TRUE, uo.id,
       ra.registrado_en + ((ra.id % 180) || ' minutes')::INTERVAL,
       ra.registrado_en + (((ra.id % 180) + 45 + (ra.id % 60)) || ' minutes')::INTERVAL
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
JOIN usuario uo ON uo.email = 'organizador@coca.test'
WHERE e.nombre = 'Festival Lima 2026'
  AND ra.id <= (SELECT MIN(id) + 69 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM check_in ci WHERE ci.registro_asistido_id = ra.id);

INSERT INTO check_in (registro_asistido_id, validado, validado_por, hora_ingreso, hora_salida)
SELECT ra.id, TRUE, uo.id,
       ra.registrado_en + ((ra.id % 120) || ' minutes')::INTERVAL,
       ra.registrado_en + (((ra.id % 120) + 25) || ' minutes')::INTERVAL
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
JOIN usuario uo ON uo.email = 'organizador@coca.test'
WHERE e.nombre = 'Sampling Miraflores'
  AND ra.id <= (SELECT MIN(id) + 37 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM check_in ci WHERE ci.registro_asistido_id = ra.id);

-- -------------------------
-- Logs de actividad
-- -------------------------
INSERT INTO log_activity (registro_asistido_id, actividad_id, participo, minutos_participacion, convertido)
SELECT ra.id, a.id, TRUE, 5 + (ra.id % 20), (ra.id % 3 = 0)
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
JOIN actividad a          ON a.evento_id = e.id
WHERE e.nombre = 'Festival Lima 2026'
  AND ra.id <= (SELECT MIN(id) + 79 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (
    SELECT 1 FROM log_activity la
    WHERE la.registro_asistido_id = ra.id AND la.actividad_id = a.id
  );

-- -------------------------
-- Interacciones de producto (calificacion 1-5, agrado, compra, promo)
-- -------------------------
INSERT INTO producto_interaccion
  (registro_asistido_id, producto_id, calificacion, le_gusto, compro, recibio_promo, commentary)
SELECT ra.id,
       pr.id,
       1 + (ra.id + pr.id) % 5,
       (ra.id + pr.id) % 4 <> 0,
       (ra.id + pr.id) % 3 = 0,
       (ra.id + pr.id) % 5 = 0,
       NULL
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
CROSS JOIN producto pr
WHERE e.nombre = 'Festival Lima 2026'
  AND ra.id <= (SELECT MIN(id) + 59 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (
    SELECT 1 FROM producto_interaccion pi
    WHERE pi.registro_asistido_id = ra.id AND pi.producto_id = pr.id
  );

INSERT INTO producto_interaccion
  (registro_asistido_id, producto_id, calificacion, le_gusto, compro, recibio_promo)
SELECT ra.id,
       pr.id,
       1 + (ra.id * 3 + pr.id) % 5,
       (ra.id + pr.id * 2) % 5 <> 0,
       (ra.id * 2 + pr.id) % 4 = 0,
       (ra.id + pr.id) % 7 = 0
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
CROSS JOIN producto pr
WHERE e.nombre = 'Sampling Miraflores'
  AND ra.id <= (SELECT MIN(id) + 44 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (
    SELECT 1 FROM producto_interaccion pi
    WHERE pi.registro_asistido_id = ra.id AND pi.producto_id = pr.id
  );

-- -------------------------
-- Calificaciones y encuestas
-- -------------------------
INSERT INTO calificacion (registro_asistido_id, preferencia_calif_id, puntaje)
SELECT ra.id, pc.id, 1 + (ra.id + pc.id) % 5
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
CROSS JOIN preferencia_calif pc
WHERE e.nombre = 'Festival Lima 2026'
  AND ra.id <= (SELECT MIN(id) + 49 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (
    SELECT 1 FROM calificacion c
    WHERE c.registro_asistido_id = ra.id AND c.preferencia_calif_id = pc.id
  );

INSERT INTO surveys (registro_asistido_id, organizacion, atencion, nps, reporto_queja)
SELECT ra.id,
       1 + (ra.id % 5),
       1 + ((ra.id * 3) % 5),
       (ra.id * 7) % 11,
       (ra.id % 13 = 0)
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
WHERE e.nombre = 'Festival Lima 2026'
  AND ra.id <= (SELECT MIN(id) + 54 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM surveys s WHERE s.registro_asistido_id = ra.id);

INSERT INTO surveys (registro_asistido_id, organizacion, atencion, nps, reporto_queja)
SELECT ra.id,
       1 + (ra.id % 5),
       1 + ((ra.id * 2) % 5),
       (ra.id * 5) % 11,
       (ra.id % 17 = 0)
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
WHERE e.nombre = 'Sampling Miraflores'
  AND ra.id <= (SELECT MIN(id) + 29 FROM registro_asistido WHERE evento_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM surveys s WHERE s.registro_asistido_id = ra.id);

-- -------------------------
-- Promociones, cupones, ventas y seguimiento
-- -------------------------
INSERT INTO promocion (evento_id, tipo_promocion_id, nombre, descripcion, valor, fecha_inicio, fecha_fin, stock)
SELECT e.id, tp.id, '2x1 en Original 500ml', 'Promocion de lanzamiento', 3.50,
       e.fecha_inicio, e.fecha_fin, 300
FROM evento e, tipo_promocion tp
WHERE e.nombre = 'Festival Lima 2026' AND tp.nombre = 'Cupon_descuento'
  AND NOT EXISTS (SELECT 1 FROM promocion WHERE nombre = '2x1 en Original 500ml');

INSERT INTO promocion (evento_id, tipo_promocion_id, nombre, descripcion, valor, fecha_inicio, fecha_fin, stock)
SELECT e.id, tp.id, 'Muestra de Zero', 'Muestra mini para llevar', 0,
       e.fecha_inicio, e.fecha_fin, 500
FROM evento e, tipo_promocion tp
WHERE e.nombre = 'Sampling Miraflores' AND tp.nombre = 'Muestra'
  AND NOT EXISTS (SELECT 1 FROM promocion WHERE nombre = 'Muestra de Zero');

-- Cupones para 35 asistentes al Festival
INSERT INTO cupon (promocion_id, evento_id, usuario_id, codigo, estado, generado_en, canjeado_en)
SELECT pr.id, e.id, ra.usuario_id,
       'CC-' || UPPER(SUBSTRING(MD5(ra.usuario_id::TEXT), 1, 10)),
       CASE
         WHEN ra.id % 3 = 0 THEN 'canjeado'::estado_cupon
         WHEN ra.id % 3 = 1 THEN 'entregado'::estado_cupon
         ELSE 'generado'::estado_cupon
       END,
       e.fecha_inicio + (ra.id || ' minutes')::INTERVAL,
       CASE WHEN ra.id % 3 = 0 THEN e.fecha_inicio + (ra.id || ' minutes')::INTERVAL ELSE NULL END
FROM evento e
JOIN promocion pr        ON pr.evento_id = e.id
JOIN registro_asistido ra ON ra.evento_id = e.id
WHERE e.nombre = 'Festival Lima 2026'
  AND NOT EXISTS (SELECT 1 FROM cupon c WHERE c.evento_id = e.id);

-- Ventas (el trigger de cupon actualiza estado y el de stock descuenta)
INSERT INTO venta (evento_id, usuario_id, producto_id, cupon_id, cantidad, precio_unitario, metodo_pago)
SELECT ra.evento_id, ra.usuario_id, pr.id, c.id, 1 + (ra.id % 3), pr.precio,
       (ARRAY['tarjeta','efectivo','yape'])[1 + (ra.id % 3)]
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
JOIN cupon c              ON c.usuario_id = ra.usuario_id AND c.evento_id = e.id
JOIN producto pr          ON pr.sku IN ('CC-ORIG-500', 'FAN-500')
WHERE e.nombre = 'Festival Lima 2026'
  AND c.estado = 'canjeado'
  AND NOT EXISTS (SELECT 1 FROM venta v WHERE v.cupon_id = c.id);

-- Seguimiento post-evento
INSERT INTO seguimiento (evento_id, usuario_id, tipo, resultado, contacto, Conversion, notas)
SELECT ra.evento_id, ra.usuario_id,
       (ARRAY['whatsapp','email','llamada','sms'])[1 + (ra.id % 4)]::tipo_seguimiento,
       (ARRAY['respondio','sin_respuesta','reprogramado'])[1 + (ra.id % 3)],
       '+51999' || LPAD((ra.id % 120)::TEXT, 6, '0'),
       (ra.id % 4 = 0),
       CASE WHEN ra.id % 4 = 0 THEN 'Mostro interes en la promocion 2x1' ELSE NULL END
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
WHERE e.nombre = 'Festival Lima 2026'
  AND NOT EXISTS (SELECT 1 FROM seguimiento s WHERE s.evento_id = e.id AND s.usuario_id = ra.usuario_id);

-- -------------------------
-- Ranking del Festival (participantes con mayor actividad)
-- -------------------------
INSERT INTO ranking (evento_id, usuario_id, puntos, posicion)
SELECT e.id, x.usuario_id, x.puntos,
       RANK() OVER (ORDER BY x.puntos DESC)
FROM evento e
CROSS JOIN LATERAL (
  SELECT ra.usuario_id, (COUNT(la.id) * 10 + COALESCE(SUM(pi.calificacion), 0))::INT AS puntos
  FROM registro_asistido ra
  LEFT JOIN log_activity la ON la.registro_asistido_id = ra.id
  LEFT JOIN producto_interaccion pi ON pi.registro_asistido_id = ra.id
  WHERE ra.evento_id = e.id
  GROUP BY ra.usuario_id
  ORDER BY 2 DESC
  LIMIT 20
) x
WHERE e.nombre = 'Festival Lima 2026'
  AND NOT EXISTS (SELECT 1 FROM ranking r WHERE r.evento_id = e.id);