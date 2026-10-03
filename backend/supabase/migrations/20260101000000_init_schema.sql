-- ============================================================================
-- Coca-Cola Event Intelligence
-- Migration 001: Enums, tables, indexes, constraints, triggers
-- Target: PostgreSQL 15+ / Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE estado_evento AS ENUM (
  'borrador',
  'activo',
  'finalizado',
  'cancelado'
);

CREATE TYPE fuente_registro AS ENUM (
  'web',
  'presencial',
  'import',
  'qr',
  'app'
);

CREATE TYPE estado_cupon AS ENUM (
  'generado',
  'entregado',
  'canjeado',
  'expirado',
  'anulado'
);

CREATE TYPE tipo_seguimiento AS ENUM (
  'whatsapp',
  'email',
  'llamada',
  'sms',
  'otro'
);

CREATE TYPE rango_edad AS ENUM (
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+'
);

-- ============================================================================
-- ROLES Y USUARIOS
-- ============================================================================

CREATE TABLE role (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(50)  NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE usuario (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           INTEGER     NOT NULL REFERENCES role (id) ON DELETE RESTRICT,
  nombre            VARCHAR(150) NOT NULL,
  email             CITEXT      NOT NULL UNIQUE,
  celular           VARCHAR(30) NOT NULL UNIQUE,
  rango_edad        rango_edad,
  fecha_nacimiento  DATE,
  genero            VARCHAR(50),
  ciudad            VARCHAR(120),
  direccion         TEXT,
  ocupacion         VARCHAR(120),
  acepta_marketing  BOOLEAN     NOT NULL DEFAULT FALSE,
  activo            BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_usuario_rol CHECK (role_id > 0)
);

CREATE INDEX idx_usuario_role      ON usuario (role_id);
CREATE INDEX idx_usuario_activo    ON usuario (activo);
CREATE INDEX idx_usuario_rango_edad ON usuario (rango_edad);
CREATE INDEX idx_usuario_nombre    ON usuario (nombre);

-- ============================================================================
-- EVENTOS Y CAMPAÑAS
-- ============================================================================

CREATE TABLE tipo_evento (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE campana (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  fecha_inicio DATE        NOT NULL,
  fecha_fin    DATE        NOT NULL,
  presupuesto  NUMERIC(14, 2),
  activa       BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_campana_fechas CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT chk_campana_presupuesto CHECK (presupuesto IS NULL OR presupuesto >= 0)
);

CREATE INDEX idx_campana_activa ON campana (activa);

CREATE TABLE evento (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(200) NOT NULL,
  descripcion       TEXT,
  tipo_evento_id    INTEGER      NOT NULL REFERENCES tipo_evento (id) ON DELETE RESTRICT,
  campana_id        INTEGER      REFERENCES campana (id) ON DELETE SET NULL,
  organizador_id    UUID         NOT NULL REFERENCES usuario (id) ON DELETE RESTRICT,
  estado            estado_evento NOT NULL DEFAULT 'borrador',
  fecha_inicio      TIMESTAMPTZ  NOT NULL,
  fecha_fin         TIMESTAMPTZ  NOT NULL,
  ciudad            VARCHAR(120),
  lugar             VARCHAR(200),
  direccion         TEXT,
  aforo             INTEGER,
  presupuesto        NUMERIC(14, 2),
  objetivo          TEXT,
  activo            BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_evento_fechas      CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT chk_evento_aforo       CHECK (aforo IS NULL OR aforo > 0),
  CONSTRAINT chk_evento_presupuesto CHECK (presupuesto IS NULL OR presupuesto >= 0)
);

CREATE INDEX idx_evento_tipo       ON evento (tipo_evento_id);
CREATE INDEX idx_evento_campana    ON evento (campana_id);
CREATE INDEX idx_evento_organizador ON evento (organizador_id);
CREATE INDEX idx_evento_estado     ON evento (estado);
CREATE INDEX idx_evento_fecha_inicio ON evento (fecha_inicio DESC);

-- ============================================================================
-- PRODUCTOS
-- ============================================================================

CREATE TABLE tipo_producto (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE producto (
  id               SERIAL PRIMARY KEY,
  tipo_producto_id INTEGER      NOT NULL REFERENCES tipo_producto (id) ON DELETE RESTRICT,
  nombre           VARCHAR(150) NOT NULL,
  descripcion      TEXT,
  sku              VARCHAR(80) UNIQUE,
  precio           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_producto_precio CHECK (precio >= 0)
);

CREATE INDEX idx_producto_tipo  ON producto (tipo_producto_id);
CREATE INDEX idx_producto_activo ON producto (activo);

-- N:M evento <-> producto
CREATE TABLE evento_producto (
  id             SERIAL PRIMARY KEY,
  evento_id      UUID     NOT NULL REFERENCES evento (id)   ON DELETE CASCADE,
  producto_id    INTEGER  NOT NULL REFERENCES producto (id) ON DELETE RESTRICT,
  stock_inicial  INTEGER  NOT NULL DEFAULT 0,
  stock_actual   INTEGER  NOT NULL DEFAULT 0,
  destacado      BOOLEAN  NOT NULL DEFAULT FALSE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_evento_producto UNIQUE (evento_id, producto_id),
  CONSTRAINT chk_ep_stock_inicial CHECK (stock_inicial >= 0),
  CONSTRAINT chk_ep_stock_actual  CHECK (stock_actual  >= 0)
);

CREATE INDEX idx_evento_producto_producto ON evento_producto (producto_id);

CREATE TABLE preferencia_calif (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- PARTICIPACIÓN Y ACCESO
-- ============================================================================

CREATE TABLE registro_asistido (
  id                   SERIAL PRIMARY KEY,
  evento_id            UUID           NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  usuario_id           UUID           NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  fuente               fuente_registro NOT NULL DEFAULT 'web',
  aceptado_consentimiento BOOLEAN     NOT NULL DEFAULT FALSE,
  aceptado_marketing   BOOLEAN         NOT NULL DEFAULT FALSE,
  es_recurrente        BOOLEAN         NOT NULL DEFAULT FALSE,
  registrado_en        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  notas                TEXT,

  CONSTRAINT uq_registro_evento_usuario UNIQUE (evento_id, usuario_id)
);

CREATE INDEX idx_registro_evento  ON registro_asistido (evento_id);
CREATE INDEX idx_registro_usuario ON registro_asistido (usuario_id);
CREATE INDEX idx_registro_fecha   ON registro_asistido (registrado_en DESC);
CREATE INDEX idx_registro_recurrente ON registro_asistido (es_recurrente) WHERE es_recurrente;

-- 1:1 con registro_asistido
CREATE TABLE qr (
  id                    SERIAL PRIMARY KEY,
  registro_asistido_id  INTEGER     NOT NULL UNIQUE
                          REFERENCES registro_asistido (id) ON DELETE CASCADE,
  codigo                UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  url_qr                TEXT,
  activo                BOOLEAN     NOT NULL DEFAULT TRUE,
  generado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usado_en              TIMESTAMPTZ,
  veces_usado            INTEGER    NOT NULL DEFAULT 0,

  CONSTRAINT chk_qr_veces_usado CHECK (veces_usado >= 0)
);

CREATE UNIQUE INDEX uq_qr_registro ON qr (registro_asistido_id);
CREATE INDEX idx_qr_activo ON qr (activo);

CREATE TABLE check_in (
  id                   SERIAL PRIMARY KEY,
  registro_asistido_id INTEGER     NOT NULL REFERENCES registro_asistido (id) ON DELETE CASCADE,
  hora_ingreso         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hora_salida          TIMESTAMPTZ,
  validado             BOOLEAN     NOT NULL DEFAULT FALSE,
  validado_por         UUID        REFERENCES usuario (id) ON DELETE SET NULL,
  dispositivo          VARCHAR(80),
  notas                TEXT,

  CONSTRAINT chk_check_in_salida CHECK (hora_salida IS NULL OR hora_salida >= hora_ingreso)
);

CREATE INDEX idx_check_in_registro ON check_in (registro_asistido_id);
CREATE INDEX idx_check_in_ingreso  ON check_in (hora_ingreso DESC);
CREATE INDEX idx_check_in_validado ON check_in (validado);

-- ============================================================================
-- ACTIVIDADES E INTERACCIONES
-- ============================================================================

CREATE TABLE tipo_actividad (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE actividad (
  id                  SERIAL PRIMARY KEY,
  evento_id           UUID     NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  tipo_actividad_id   INTEGER  NOT NULL REFERENCES tipo_actividad (id) ON DELETE RESTRICT,
  nombre              VARCHAR(200) NOT NULL,
  descripcion         TEXT,
  fecha_inicio        TIMESTAMPTZ,
  fecha_fin           TIMESTAMPTZ,
  cupo                INTEGER,
  activo              BOOLEAN  NOT NULL DEFAULT TRUE,

  CONSTRAINT chk_actividad_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT chk_actividad_cupo   CHECK (cupo IS NULL OR cupo > 0)
);

CREATE INDEX idx_actividad_evento ON actividad (evento_id);
CREATE INDEX idx_actividad_tipo   ON actividad (tipo_actividad_id);

CREATE TABLE log_activity (
  id                   SERIAL PRIMARY KEY,
  registro_asistido_id INTEGER  NOT NULL REFERENCES registro_asistido (id) ON DELETE CASCADE,
  actividad_id         INTEGER  NOT NULL REFERENCES actividad (id) ON DELETE CASCADE,
  participo            BOOLEAN  NOT NULL DEFAULT TRUE,
  minutos_participacion INTEGER NOT NULL DEFAULT 0,
  convertido           BOOLEAN  NOT NULL DEFAULT FALSE,
  registrado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_log_activity UNIQUE (registro_asistido_id, actividad_id),
  CONSTRAINT chk_log_minutos CHECK (minutos_participacion >= 0)
);

CREATE INDEX idx_log_activity_actividad ON log_activity (actividad_id);
CREATE INDEX idx_log_activity_convertido ON log_activity (convertido) WHERE convertido;

CREATE TABLE producto_interaccion (
  id                   SERIAL PRIMARY KEY,
  registro_asistido_id INTEGER  NOT NULL REFERENCES registro_asistido (id) ON DELETE CASCADE,
  producto_id          INTEGER  NOT NULL REFERENCES producto (id) ON DELETE RESTRICT,
  calificacion         SMALLINT,
  le_gusto             BOOLEAN,
  compro                BOOLEAN  NOT NULL DEFAULT FALSE,
  recibio_promo        BOOLEAN  NOT NULL DEFAULT FALSE,
  commentary           TEXT,
  registrado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_producto_interaccion UNIQUE (registro_asistido_id, producto_id),
  CONSTRAINT chk_pi_calificacion CHECK (calificacion IS NULL OR calificacion BETWEEN 1 AND 5)
);

CREATE INDEX idx_pi_producto ON producto_interaccion (producto_id);
CREATE INDEX idx_pi_compro   ON producto_interaccion (compro);
CREATE INDEX idx_pi_promo    ON producto_interaccion (recibio_promo);
CREATE INDEX idx_pi_calif    ON producto_interaccion (calificacion);

-- ============================================================================
-- RANKING Y SATISFACCIÓN
-- ============================================================================

CREATE TABLE ranking (
  id          SERIAL PRIMARY KEY,
  evento_id   UUID     NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  usuario_id  UUID     NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  puntos      INTEGER  NOT NULL DEFAULT 0,
  posicion    INTEGER,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_ranking_evento_usuario UNIQUE (evento_id, usuario_id),
  CONSTRAINT chk_ranking_puntos CHECK (puntos >= 0)
);

CREATE INDEX idx_ranking_evento_posicion ON ranking (evento_id, posicion);

CREATE TABLE calificacion (
  id                   SERIAL PRIMARY KEY,
  registro_asistido_id INTEGER  NOT NULL REFERENCES registro_asistido (id) ON DELETE CASCADE,
  preferencia_calif_id INTEGER  NOT NULL REFERENCES preferencia_calif (id) ON DELETE RESTRICT,
  puntaje              SMALLINT NOT NULL,
  comentario           TEXT,

  CONSTRAINT uq_calificacion UNIQUE (registro_asistido_id, preferencia_calif_id),
  CONSTRAINT chk_calificacion_puntaje CHECK (puntaje BETWEEN 1 AND 5)
);

CREATE INDEX idx_calificacion_preferencia ON calificacion (preferencia_calif_id);

CREATE TABLE surveys (
  id                   SERIAL PRIMARY KEY,
  registro_asistido_id INTEGER     NOT NULL UNIQUE
                         REFERENCES registro_asistido (id) ON DELETE CASCADE,
  organizacion         SMALLINT    NOT NULL,
  atencion             SMALLINT    NOT NULL,
  nps                  SMALLINT    NOT NULL,
  Comentario           TEXT,
  reporto_queja       BOOLEAN     NOT NULL DEFAULT FALSE,
  Respondido_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_surveys_organizacion CHECK (organizacion BETWEEN 1 AND 5),
  CONSTRAINT chk_surveys_atencion     CHECK (atencion     BETWEEN 1 AND 5),
  CONSTRAINT chk_surveys_nps          CHECK (nps          BETWEEN 0 AND 10)
);

CREATE INDEX idx_surveys_nps ON surveys (nps);

-- ============================================================================
-- PROMOCIONES, VENTAS Y POST-EVENTO
-- ============================================================================

CREATE TABLE tipo_promocion (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE promocion (
  id                 SERIAL PRIMARY KEY,
  evento_id          UUID         NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  tipo_promocion_id  INTEGER      NOT NULL REFERENCES tipo_promocion (id) ON DELETE RESTRICT,
  nombre             VARCHAR(200) NOT NULL,
  descripcion        TEXT,
  valor              NUMERIC(10, 2),
  fecha_inicio       TIMESTAMPTZ  NOT NULL,
  fecha_fin          TIMESTAMPTZ  NOT NULL,
  stock              INTEGER      NOT NULL DEFAULT 0,
  activa             BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_promocion_fechas CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT chk_promocion_stock  CHECK (stock >= 0)
);

CREATE INDEX idx_promocion_evento ON promocion (evento_id);

CREATE TABLE cupon (
  id            SERIAL PRIMARY KEY,
  promocion_id  INTEGER      NOT NULL REFERENCES promocion (id) ON DELETE CASCADE,
  evento_id     UUID         NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  usuario_id    UUID         NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  codigo        VARCHAR(64)  NOT NULL UNIQUE,
  estado        estado_cupon NOT NULL DEFAULT 'generado',
  generado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  entregado_en  TIMESTAMPTZ,
  canjeado_en   TIMESTAMPTZ,
  expires_en    TIMESTAMPTZ,

  CONSTRAINT chk_cupon_canje CHECK (
    (estado <> 'canjeado' OR canjeado_en IS NOT NULL)
  )
);

CREATE INDEX idx_cupon_evento  ON cupon (evento_id);
CREATE INDEX idx_cupon_usuario ON cupon (usuario_id);
CREATE INDEX idx_cupon_estado  ON cupon (estado);

CREATE TABLE venta (
  id             SERIAL PRIMARY KEY,
  evento_id      UUID        NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  usuario_id     UUID        REFERENCES usuario (id) ON DELETE SET NULL,
  producto_id    INTEGER     NOT NULL REFERENCES producto (id) ON DELETE RESTRICT,
  cupon_id       INTEGER     REFERENCES cupon (id) ON DELETE SET NULL,
  cantidad       SMALLINT    NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  total          NUMERIC(12, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  metodo_pago    VARCHAR(50),
  vendido_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_venta_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_venta_precio   CHECK (precio_unitario >= 0)
);

CREATE INDEX idx_venta_evento   ON venta (evento_id);
CREATE INDEX idx_venta_usuario  ON venta (usuario_id);
CREATE INDEX idx_venta_producto ON venta (producto_id);
CREATE INDEX idx_venta_fecha    ON venta (vendido_en DESC);

CREATE TABLE seguimiento (
  id                 SERIAL PRIMARY KEY,
  evento_id          UUID             NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
  usuario_id         UUID             NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  tipo               tipo_seguimiento NOT NULL,
  resultado          VARCHAR(50),
  contacto           VARCHAR(120),
  notas              TEXT,
  Conversion         BOOLEAN          NOT NULL DEFAULT FALSE,
  seguido_en         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seguimiento_evento   ON seguimiento (evento_id);
CREATE INDEX idx_seguimiento_usuario  ON seguimiento (usuario_id);
CREATE INDEX idx_seguimiento_tipo     ON seguimiento (tipo);
CREATE INDEX idx_seguimiento_fecha    ON seguimiento (seguido_en DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_updated_at
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_evento_updated_at
  BEFORE UPDATE ON evento
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Marca el primer evento del participante como "no recurrente"
CREATE OR REPLACE FUNCTION fn_marcar_recurrente()
RETURNS TRIGGER AS $$
DECLARE
  v_previas INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_previas
  FROM registro_asistido
  WHERE usuario_id = NEW.usuario_id
    AND id <> NEW.id;

  IF v_previas > 0 THEN
    NEW.es_recurrente := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registro_recurrente
  BEFORE INSERT ON registro_asistido
  FOR EACH ROW EXECUTE FUNCTION fn_marcar_recurrente();

-- Genera el QR (1:1) automáticamente al crear el registro
CREATE OR REPLACE FUNCTION fn_generar_qr()
RETURNS TRIGGER AS $$
DECLARE
  v_base TEXT := current_setting('app.base_url', TRUE);
BEGIN
  INSERT INTO qr (registro_asistido_id)
  VALUES (NEW.id)
  ON CONFLICT (registro_asistido_id) DO NOTHING;

  IF v_base IS NOT NULL AND v_base <> '' THEN
    UPDATE qr
    SET url_qr = v_base || '/escanear?codigo=' || qr.codigo::TEXT
    WHERE registro_asistido_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registro_generar_qr
  AFTER INSERT ON registro_asistido
  FOR EACH ROW EXECUTE FUNCTION fn_generar_qr();

-- Descuenta stock del evento al registrar venta
CREATE OR REPLACE FUNCTION fn_descontar_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE evento_producto
  SET stock_actual = GREATEST(stock_actual - NEW.cantidad, 0)
  WHERE evento_id = NEW.evento_id
    AND producto_id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_stock
  AFTER INSERT ON venta
  FOR EACH ROW EXECUTE FUNCTION fn_descontar_stock();

-- Marca el cupón como canjeado al registrar la venta
CREATE OR REPLACE FUNCTION fn_canjear_cupon()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cupon_id IS NOT NULL THEN
    UPDATE cupon
    SET estado = 'canjeado',
        canjeado_en = NOW()
    WHERE id = NEW.cupon_id
      AND estado IN ('generado', 'entregado');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_cupon
  AFTER INSERT ON venta
  FOR EACH ROW EXECUTE FUNCTION fn_canjear_cupon();