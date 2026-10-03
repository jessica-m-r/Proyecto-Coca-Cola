-- ============================================================================
-- Coca-Cola Event Intelligence
-- Migration 003: Row Level Security
--
-- Modelo de roles:
--   administrador  -> todo
--   organizador   -> eventos propios + operational data de esos eventos
--   marketing     -> lectura de métricas y campanas
--   participante   -> solo sus propios registros, qr, cupones y ventas
--
-- Todas las PK/FK del esquema remoto son INTEGER. usuario.id no está enlazado
-- a auth.users, así que el usuario actual se resuelve por el email del JWT de
-- Supabase Auth (auth.jwt() ->> 'email') contra usuario.email.
-- Las tablas operativas se enlazan al evento/usuario vía registro_asistido
-- (columna registro_id).
-- ============================================================================

CREATE OR REPLACE FUNCTION current_usuario_id()
RETURNS INTEGER AS $$
  SELECT u.id
  FROM usuario u
  WHERE lower(u.email) = lower(auth.jwt() ->> 'email')
    AND u.activo
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT r.nombre INTO v_role
  FROM usuario u
  JOIN role r ON r.id = u.role_id
  WHERE u.id = current_usuario_id();

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'administrador';
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('administrador', 'organizador', 'marketing');
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_organizador_of(p_evento_id INTEGER)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM evento e
    WHERE e.id = p_evento_id
      AND e.organizador_id = current_usuario_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Eventos visibles: admin ve todos; organizador los propios; marketing todos.
CREATE OR REPLACE FUNCTION can_access_evento(p_evento_id INTEGER)
RETURNS BOOLEAN AS $$
  SELECT CASE current_user_role()
    WHEN 'administrador' THEN TRUE
    WHEN 'organizador'  THEN is_organizador_of(p_evento_id)
    WHEN 'marketing'     THEN TRUE
    ELSE FALSE
  END;
$$ LANGUAGE sql STABLE SET search_path = public;

-- Las tablas hijas de registro_asistido necesitan cruzarlo sin que su propia
-- RLS interfiera, por eso se resuelve con SECURITY DEFINER.
CREATE OR REPLACE FUNCTION usuario_id_via_registro(p_registro_id INTEGER)
RETURNS INTEGER AS $$
  SELECT usuario_id FROM registro_asistido WHERE id = p_registro_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION evento_id_via_registro(p_registro_id INTEGER)
RETURNS INTEGER AS $$
  SELECT evento_id FROM registro_asistido WHERE id = p_registro_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- =========================
-- Catalogo: lectura global
-- =========================

ALTER TABLE role                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_evento         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_producto       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_actividad      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_promocion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferencia_calif   ENABLE ROW LEVEL SECURITY;

CREATE POLICY catálogos_lectura ON tipo_evento
  FOR SELECT USING (TRUE);

CREATE POLICY productos_tipos_lectura ON tipo_producto
  FOR SELECT USING (TRUE);

CREATE POLICY actividades_tipos_lectura ON tipo_actividad
  FOR SELECT USING (TRUE);

CREATE POLICY promociones_tipos_lectura ON tipo_promocion
  FOR SELECT USING (TRUE);

-- preferencia_calif es por usuario (usuario_id, producto_id), no un catálogo.
CREATE POLICY preferencias_lectura ON preferencia_calif
  FOR SELECT TO authenticated
  USING (usuario_id = current_usuario_id() OR is_staff());

CREATE POLICY preferencias_escritura ON preferencia_calif
  FOR ALL TO authenticated
  USING (usuario_id = current_usuario_id() OR is_admin())
  WITH CHECK (usuario_id = current_usuario_id() OR is_admin());

-- role: solo admin escribe; lectura autenticada
CREATE POLICY roles_lectura ON role
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY roles_escritura ON role
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =========================
-- usuario
-- =========================

ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

-- Participante: lee y actualiza su propia fila.
-- Staff: lee todos; admin escribe.
CREATE POLICY usuario_lectura ON usuario
  FOR SELECT TO authenticated
  USING (id = current_usuario_id() OR is_staff());

CREATE POLICY usuario_update ON usuario
  FOR UPDATE TO authenticated
  USING (id = current_usuario_id() OR is_admin())
  WITH CHECK (id = current_usuario_id() OR is_admin());

CREATE POLICY usuario_insert ON usuario
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR role_id = (SELECT id FROM role WHERE nombre = 'participante'));

-- Staff también puede dar de alta participantes (registro presencial).
CREATE POLICY usuario_insert_staff ON usuario
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- =========================
-- campana / evento
-- =========================

ALTER TABLE campana ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento  ENABLE ROW LEVEL SECURITY;

CREATE POLICY campana_lectura ON campana
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY campana_escritura ON campana
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY evento_lectura ON evento
  FOR SELECT TO authenticated
  USING (is_staff() OR EXISTS (
    SELECT 1 FROM registro_asistido ra
    WHERE ra.evento_id = evento.id AND ra.usuario_id = current_usuario_id()
  ));

CREATE POLICY evento_insert ON evento
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR organizador_id = current_usuario_id());

CREATE POLICY evento_update ON evento
  FOR UPDATE TO authenticated
  USING (can_access_evento(id))
  WITH CHECK (can_access_evento(id));

CREATE POLICY evento_delete ON evento
  FOR DELETE TO authenticated
  USING (is_admin());

-- =========================
-- producto / evento_producto
-- =========================

ALTER TABLE producto        ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY producto_lectura ON producto
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY producto_escritura ON producto
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY evento_producto_lectura ON evento_producto
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY evento_producto_escritura ON evento_producto
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id))
  WITH CHECK (can_access_evento(evento_id));

-- =========================
-- registro_asistido / qr / check_in
-- =========================

ALTER TABLE registro_asistido ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr               ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in         ENABLE ROW LEVEL SECURITY;

CREATE POLICY registro_lectura ON registro_asistido
  FOR SELECT TO authenticated
  USING (usuario_id = current_usuario_id() OR can_access_evento(evento_id));

CREATE POLICY registro_insert ON registro_asistido
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = current_usuario_id() OR can_access_evento(evento_id));

CREATE POLICY registro_update ON registro_asistido
  FOR UPDATE TO authenticated
  USING (usuario_id = current_usuario_id() OR can_access_evento(evento_id))
  WITH CHECK (usuario_id = current_usuario_id() OR can_access_evento(evento_id));

CREATE POLICY qr_lectura ON qr
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

-- El escaneo valida el codigo antes del login: lectura acotada a QR no usados.
CREATE POLICY qr_scan ON qr
  FOR SELECT TO anon, authenticated
  USING (NOT usado);

CREATE POLICY check_in_lectura ON check_in
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY check_in_insert ON check_in
  FOR INSERT TO authenticated
  WITH CHECK (can_access_evento(evento_id_via_registro(registro_id)));

CREATE POLICY check_in_update ON check_in
  FOR UPDATE TO authenticated
  USING (can_access_evento(evento_id_via_registro(registro_id)));

-- =========================
-- actividad / log_activity / producto_interaccion
-- =========================

ALTER TABLE actividad           ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_activity        ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_interaccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY actividad_lectura ON actividad
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY actividad_escritura ON actividad
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id))
  WITH CHECK (can_access_evento(evento_id));

CREATE POLICY log_lectura ON log_activity
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY log_escritura ON log_activity
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id_via_registro(registro_id)))
  WITH CHECK (can_access_evento(evento_id_via_registro(registro_id)));

CREATE POLICY pi_lectura ON producto_interaccion
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY pi_escritura ON producto_interaccion
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id_via_registro(registro_id)))
  WITH CHECK (can_access_evento(evento_id_via_registro(registro_id)));

-- =========================
-- ranking / calificacion / surveys
-- =========================

ALTER TABLE ranking      ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys      ENABLE ROW LEVEL SECURITY;

-- ranking es un agregado por (evento, producto): no tiene usuario_id.
CREATE POLICY ranking_lectura ON ranking
  FOR SELECT TO authenticated
  USING (can_access_evento(evento_id));

CREATE POLICY ranking_escritura ON ranking
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id))
  WITH CHECK (can_access_evento(evento_id));

-- calificacion tiene evento_id y usuario_id directos.
CREATE POLICY calificacion_lectura ON calificacion
  FOR SELECT TO authenticated
  USING (usuario_id = current_usuario_id() OR can_access_evento(evento_id));

CREATE POLICY calificacion_escritura ON calificacion
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id))
  WITH CHECK (can_access_evento(evento_id));

CREATE POLICY surveys_lectura ON surveys
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR is_staff()
  );

-- Participante responde su propia encuesta; staff la registra en campo.
CREATE POLICY surveys_insert ON surveys
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR is_staff()
  );

-- =========================
-- promocion / cupon / venta / seguimiento
-- =========================

ALTER TABLE promocion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupon      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY promocion_lectura ON promocion
  FOR SELECT TO authenticated USING (TRUE);

-- promocion cuelga de campana (no de evento): la gestionan admin y marketing.
CREATE POLICY promocion_escritura ON promocion
  FOR ALL TO authenticated
  USING (current_user_role() IN ('administrador', 'marketing'))
  WITH CHECK (current_user_role() IN ('administrador', 'marketing'));

-- cupon.registro_id es nullable: un cupón sin registro solo lo ve staff con
-- acceso global (can_access_evento(NULL) es TRUE para admin/marketing).
CREATE POLICY cupon_lectura ON cupon
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY cupon_insert ON cupon
  FOR INSERT TO authenticated
  WITH CHECK (
    can_access_evento(evento_id_via_registro(registro_id))
    OR usuario_id_via_registro(registro_id) = current_usuario_id()
  );

CREATE POLICY cupon_update ON cupon
  FOR UPDATE TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  )
  WITH CHECK (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY venta_lectura ON venta
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY venta_insert ON venta
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY seguimiento_lectura ON seguimiento
  FOR SELECT TO authenticated
  USING (
    usuario_id_via_registro(registro_id) = current_usuario_id()
    OR can_access_evento(evento_id_via_registro(registro_id))
  );

CREATE POLICY seguimiento_escritura ON seguimiento
  FOR ALL TO authenticated
  USING (can_access_evento(evento_id_via_registro(registro_id)))
  WITH CHECK (can_access_evento(evento_id_via_registro(registro_id)));

-- =========================
-- Vistas de dashboards
-- =========================

ALTER VIEW v_event_kpis             SET (security_invoker = ON);
ALTER VIEW v_participant_type       SET (security_invoker = ON);
ALTER VIEW v_product_interest       SET (security_invoker = ON);
ALTER VIEW v_product_ranking_global SET (security_invoker = ON);
ALTER VIEW v_funnel_levels          SET (security_invoker = ON);
ALTER VIEW v_activity_performance   SET (security_invoker = ON);
ALTER VIEW v_asistentes             SET (security_invoker = ON);
ALTER VIEW v_city_map               SET (security_invoker = ON);
ALTER VIEW v_hourly_traffic         SET (security_invoker = ON);
ALTER VIEW v_recurrence             SET (security_invoker = ON);

GRANT SELECT ON
  v_event_kpis, v_participant_type, v_product_interest, v_product_ranking_global,
  v_funnel_levels, v_activity_performance, v_asistentes, v_city_map,
  v_hourly_traffic, v_recurrence
TO authenticated;
