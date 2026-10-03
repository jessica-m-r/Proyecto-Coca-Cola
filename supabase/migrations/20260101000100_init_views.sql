-- ============================================================================
-- Coca-Cola Event Intelligence
-- Migration 002: Vistas analíticas para Recharts / Power BI
-- Todas las vistas exponen `evento_id` + `evento_nombre` para filtros directos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v_event_kpis
-- Registrados, asistentes, % asistencia, interacciones, conversiones, NPS.
-- Usa agregados FILTER para evitar el fan-out de los JOINs.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_event_kpis AS
SELECT
  e.id                                              AS evento_id,
  e.nombre                                          AS evento_nombre,
  e.estado::TEXT                                    AS evento_estado,
  e.fecha_inicio,
  e.fecha_fin,
  te.nombre                                         AS tipo_evento,
  c.nombre                                          AS campana,
  e.aforo,
  COALESCE(reg.total_registrados, 0)                AS total_registrados,
  COALESCE(reg.total_nuevos, 0)                     AS total_nuevos,
  COALESCE(reg.total_recurrentes, 0)                AS total_recurrentes,
  COALESCE(chk.total_check_ins, 0)                  AS total_asistentes,
  ROUND(
    CASE
      WHEN COALESCE(reg.total_registrados, 0) = 0 THEN 0
      ELSE (COALESCE(chk.total_check_ins, 0)::NUMERIC
            / reg.total_registrados * 100)
    END, 2)                                         AS pct_asistencia,
  COALESCE(pi.total_interacciones, 0)               AS total_interacciones,
  COALESCE(pi.total_degustaciones, 0)               AS total_degustaciones,
  COALESCE(pi.calificacion_promedio, 0)             AS calificacion_promedio,
  COALESCE(pi.indice_agrado, 0)                     AS indice_agrado,
  COALESCE(la.total_actividades, 0)                 AS total_actividades,
  COALESCE(la.total_conversion, 0)                  AS total_conversion_actividad,
  COALESCE(sv.total_encuestas, 0)                   AS total_encuestas,
  COALESCE(sv.nps_promedio, 0)                      AS nps_promedio,
  ROUND(
    CASE
      WHEN COALESCE(sv.total_encuestas, 0) = 0 THEN 0
      ELSE (COALESCE(pi.total_interacciones, 0)::NUMERIC
            / sv.total_encuestas)
    END, 2)                                         AS interacciones_por_encuesta,
  COALESCE(vt.total_ventas, 0)                      AS total_ventas,
  COALESCE(vt.ingresos_totales, 0)                  AS ingresos_totales,
  COALESCE(cp.total_cupones, 0)                     AS total_cupones,
  COALESCE(cp.total_cupones_canjeados, 0)           AS total_cupones_canjeados,
  ROUND(
    CASE
      WHEN COALESCE(cp.total_cupones, 0) = 0 THEN 0
      ELSE (COALESCE(cp.total_cupones_canjeados, 0)::NUMERIC
            / cp.total_cupones * 100)
    END, 2)                                         AS pct_canje_cupones
FROM evento e
LEFT JOIN tipo_evento te ON te.id = e.tipo_evento_id
LEFT JOIN campana     c  ON c.id  = e.campana_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_registrados,
    COUNT(*) FILTER (WHERE NOT ra.es_recurrente)     AS total_nuevos,
    COUNT(*) FILTER (WHERE ra.es_recurrente)         AS total_recurrentes
  FROM registro_asistido ra
  WHERE ra.evento_id = e.id
) reg ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT ci.registro_asistido_id)   AS total_check_ins
  FROM check_in ci
  JOIN registro_asistido r2 ON r2.id = ci.registro_asistido_id
  WHERE r2.evento_id = e.id
    AND ci.validado
) chk ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_interacciones,
    COUNT(*) FILTER (WHERE NOT p.compro)            AS total_degustaciones,
    ROUND(AVG(p.calificacion)::NUMERIC, 2)          AS calificacion_promedio,
    ROUND(
      (COUNT(*) FILTER (WHERE p.le_gusto)::NUMERIC
       / NULLIF(COUNT(*) FILTER (WHERE p.le_gusto IS NOT NULL), 0) * 100), 2
    )                                               AS indice_agrado
  FROM producto_interaccion p
  JOIN registro_asistido r3 ON r3.id = p.registro_asistido_id
  WHERE r3.evento_id = e.id
) pi ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_actividades,
    COUNT(*) FILTER (WHERE la.convertido)           AS total_conversion
  FROM log_activity la
  JOIN registro_asistido r4 ON r4.id = la.registro_asistido_id
  WHERE r4.evento_id = e.id
) la ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_encuestas,
    ROUND(AVG(s.nps)::NUMERIC, 2)                   AS nps_promedio
  FROM surveys s
  JOIN registro_asistido r5 ON r5.id = s.registro_asistido_id
  WHERE r5.evento_id = e.id
) sv ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_ventas,
    COALESCE(SUM(v.total), 0)                       AS ingresos_totales
  FROM venta v
  WHERE v.evento_id = e.id
) vt ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS total_cupones,
    COUNT(*) FILTER (WHERE c.estado = 'canjeado')   AS total_cupones_canjeados
  FROM cupon c
  WHERE c.evento_id = e.id
) cp ON TRUE;

COMMENT ON VIEW v_event_kpis IS
  'KPIs maestros por evento: registros, check-ins, % asistencia, interacciones, conversión y satisfacción (NPS).';

-- ----------------------------------------------------------------------------
-- v_participant_type
-- Nuevos vs recurrentes por evento + desglose de rango de edad.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_participant_type AS
SELECT
  e.id                                AS evento_id,
  e.nombre                            AS evento_nombre,
  ra.es_recurrente,
  CASE WHEN ra.es_recurrente THEN 'Recurrente' ELSE 'Nuevo' END AS tipo_participante,
  COALESCE(u.rango_edad::TEXT, 'Sin dato') AS rango_edad,
  u.genero,
  u.ciudad,
  COUNT(*)                            AS total_personas
FROM evento e
JOIN registro_asistido ra ON ra.evento_id = e.id
JOIN usuario u            ON u.id = ra.usuario_id
GROUP BY
  e.id, e.nombre,
  ra.es_recurrente,
  COALESCE(u.rango_edad::TEXT, 'Sin dato'),
  u.genero,
  u.ciudad;

COMMENT ON VIEW v_participant_type IS
  'Composición de audiencia por evento: nuevos vs recurrentes, con corte por rango de edad, género y ciudad.';

-- ----------------------------------------------------------------------------
-- v_product_interest
-- Ranking de productos más populares e índice de agrado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_product_interest AS
SELECT
  p.id                                    AS producto_id,
  p.nombre                                AS producto,
  tp.nombre                               AS tipo_producto,
  e.id                                    AS evento_id,
  e.nombre                                AS evento_nombre,
  COUNT(*)                                AS total_interacciones,
  COUNT(*) FILTER (WHERE pi.le_gusto)      AS total_les_gusto,
  COUNT(*) FILTER (WHERE pi.compro)       AS total_compras,
  COUNT(*) FILTER (WHERE pi.recibio_promo) AS total_promos,
  ROUND(AVG(pi.calificacion)::NUMERIC, 2)  AS calificacion_promedio,
  ROUND(
    (COUNT(*) FILTER (WHERE pi.le_gusto)::NUMERIC
     / NULLIF(COUNT(*) FILTER (WHERE pi.le_gusto IS NOT NULL), 0) * 100), 2
  )                                       AS indice_agrado,
  ROUND(
    (COUNT(*) FILTER (WHERE pi.compro)::NUMERIC
     / NULLIF(COUNT(*), 0) * 100), 2
  )                                       AS tasa_conversion,
  ROUND(
    (COALESCE(SUM(v.ingresos), 0))::NUMERIC, 2) AS ingresos_totales,
  RANK() OVER (
    PARTITION BY e.id ORDER BY COUNT(*) DESC
  )                                       AS ranking_interaccion
FROM producto_interaccion pi
JOIN producto          p  ON p.id  = pi.producto_id
JOIN tipo_producto     tp ON tp.id = p.tipo_producto_id
JOIN registro_asistido ra ON ra.id = pi.registro_asistido_id
JOIN evento            e  ON e.id  = ra.evento_id
LEFT JOIN LATERAL (
  SELECT SUM(ve.total) AS ingresos
  FROM venta ve
  WHERE ve.evento_id = e.id
    AND ve.producto_id = p.id
) v ON TRUE
GROUP BY e.id, e.nombre, p.id, p.nombre, tp.nombre;

COMMENT ON VIEW v_product_interest IS
  'Ranking de productos por evento: interacciones, índice de agrado, tasa de conversión e ingresos.';

-- ----------------------------------------------------------------------------
-- v_funnel_levels
-- Embudo de conversión del participante: registro -> check-in -> actividad
-- -> interacción de producto -> compra -> cupón canjeado -> venta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_funnel_levels AS
WITH etapas AS (
  SELECT
    n AS nivel,
    (ARRAY[
      'Registrado',
      'Check-in validado',
      'Participó en actividad',
      'Interactuó con producto',
      'Compró producto',
      'Tiene cupón canjeado',
      'Generó venta'
    ])[n] AS etapa
  FROM generate_series(1, 7) AS n
),
base AS (
  SELECT e.id AS evento_id, e.nombre AS evento_nombre, COUNT(ra.id) AS registrados
  FROM evento e
  LEFT JOIN registro_asistido ra ON ra.evento_id = e.id
  GROUP BY e.id, e.nombre
)
SELECT
  b.evento_id,
  b.evento_nombre,
  et.nivel,
  et.etapa,
  COALESCE(m.personas, 0) AS personas,
  ROUND(
    COALESCE(m.personas, 0)::NUMERIC
    / NULLIF(b.registrados, 0) * 100, 2
  ) AS pct_sobre_registrados
FROM base b
CROSS JOIN etapas et
LEFT JOIN LATERAL (
  SELECT CASE et.nivel
    WHEN 1 THEN (SELECT COUNT(DISTINCT ra.usuario_id)
                 FROM registro_asistido ra WHERE ra.evento_id = b.evento_id)
    WHEN 2 THEN (SELECT COUNT(DISTINCT ci.registro_asistido_id)
                 FROM check_in ci
                 JOIN registro_asistido ra ON ra.id = ci.registro_asistido_id
                 WHERE ra.evento_id = b.evento_id AND ci.validado)
    WHEN 3 THEN (SELECT COUNT(DISTINCT la.registro_asistido_id)
                 FROM log_activity la
                 JOIN registro_asistido ra ON ra.id = la.registro_asistido_id
                 WHERE ra.evento_id = b.evento_id AND la.participo)
    WHEN 4 THEN (SELECT COUNT(DISTINCT pi.registro_asistido_id)
                 FROM producto_interaccion pi
                 JOIN registro_asistido ra ON ra.id = pi.registro_asistido_id
                 WHERE ra.evento_id = b.evento_id)
    WHEN 5 THEN (SELECT COUNT(DISTINCT pi.registro_asistido_id)
                 FROM producto_interaccion pi
                 JOIN registro_asistido ra ON ra.id = pi.registro_asistido_id
                 WHERE ra.evento_id = b.evento_id AND pi.compro)
    WHEN 6 THEN (SELECT COUNT(DISTINCT c.usuario_id)
                 FROM cupon c
                 WHERE c.evento_id = b.evento_id AND c.estado = 'canjeado')
    WHEN 7 THEN (SELECT COUNT(DISTINCT v.usuario_id)
                 FROM venta v
                 WHERE v.evento_id = b.evento_id AND v.usuario_id IS NOT NULL)
  END AS personas
) m ON TRUE;
COMMENT ON VIEW v_funnel_levels IS
  'Embudo de conversión por evento con 7 etapas y % sobre el total de registrados.';

-- ----------------------------------------------------------------------------
-- v_activity_performance (extra: ranking de actividades para el dashboard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_activity_performance AS
SELECT
  a.id                     AS actividad_id,
  a.nombre                 AS actividad,
  ta.nombre                AS tipo_actividad,
  e.id                     AS evento_id,
  e.nombre                 AS evento_nombre,
  COUNT(la.id)             AS total_registros,
  COUNT(la.id) FILTER (WHERE la.convertido) AS total_conversion,
  COALESCE(SUM(la.minutos_participacion), 0) AS minutos_totales,
  ROUND(AVG(la.minutos_participacion)::NUMERIC, 2) AS minutos_promedio,
  ROUND(
    (COUNT(la.id) FILTER (WHERE la.convertido)::NUMERIC
     / NULLIF(COUNT(la.id), 0) * 100), 2
  )                        AS pct_conversion
FROM actividad a
JOIN tipo_actividad ta ON ta.id = a.tipo_actividad_id
JOIN evento e          ON e.id  = a.evento_id
LEFT JOIN log_activity la ON la.actividad_id = a.id
GROUP BY a.id, a.nombre, ta.nombre, e.id, e.nombre;

COMMENT ON VIEW v_activity_performance IS
  'Participación y conversión por actividad dentro de cada evento.';

-- ----------------------------------------------------------------------------
-- v_coupon_performance (extra: postevento, canje y ventas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_coupon_performance AS
SELECT
  c.id                          AS cupon_id,
  c.codigo,
  c.estado::TEXT                AS estado,
  pr.nombre                     AS promocion,
  tp.nombre                     AS tipo_promocion,
  e.id                          AS evento_id,
  e.nombre                      AS evento_nombre,
  u.nombre                      AS participante,
  u.email,
  u.celular,
  c.generado_en,
  c.canjeado_en,
  v.id                          AS venta_id,
  v.total                       AS venta_total
FROM cupon c
JOIN promocion pr   ON pr.id  = c.promocion_id
JOIN tipo_promocion tp ON tp.id = pr.tipo_promocion_id
JOIN evento e       ON e.id   = c.evento_id
JOIN usuario u      ON u.id   = c.usuario_id
LEFT JOIN venta v   ON v.cupon_id = c.id;

COMMENT ON VIEW v_coupon_performance IS
  'Seguimiento de cupones: promoción, estado, participante y venta asociada.';