import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Motor de predicción y recomendación (MVP del PRD-Prediccion-ML-Supabase).
 *
 * Implementa en TypeScript los modelos del PRD con degradación controlada:
 *  - M1: afinidad usuario-producto y recomendador Top-K (sección 7.2)
 *  - M2: probabilidad de asistencia con regresión logística entrenada en vivo (7.3)
 *  - M4: segmentación por arquetipos de comportamiento (7.5 / seed §17)
 *  - M5: pronóstico bottom-up de evento futuro con score de éxito (7.6)
 * Lee todo de Supabase (fuente de verdad) y nunca falla por falta de datos:
 * responde con heurísticas marcando `origen` y `confianza` (sección 9).
 */

export type Origen = "modelo" | "heuristica";
export type Confianza = "baja" | "media" | "alta";

// ---------------------------------------------------------------------------
// Tipos de filas (solo las columnas que usa el motor)
// ---------------------------------------------------------------------------

type Evento = {
  id: number; nombre: string; tipo_evento_id: number; ciudad: string | null;
  fecha_inicio: string; estado: string; organizador_id: number | null;
  participantes_esperados: number | null; presupuesto: number | null;
};
type Usuario = {
  id: number; role_id: number; nombre: string; apellido: string;
  ciudad: string | null; rango_edad: string | null; activo: boolean;
};
type Registro = {
  id: number; evento_id: number; usuario_id: number; fuente_registro: string;
  consentimiento: boolean; codigo_promocional: string | null; registered_at: string;
};
type CheckIn = { id: number; registro_id: number };
type LogActivity = { id: number; registro_id: number; es_conversion: boolean };
type ProdInter = {
  id: number; registro_id: number; producto_id: number; calificacion: number | null;
  nivel_agrado: string | null; compraria: boolean | null; quiere_promos: boolean | null;
};
type Venta = { id: number; registro_id: number; producto_id: number; cantidad: number };
type Cupon = { id: number; promocion_id: number; registro_id: number; estado: string };
type Promocion = { id: number; producto_id: number | null };
type Survey = { id: number; registro_id: number; general: number | null; nps: number | null };
type PrefCalif = {
  id: number; usuario_id: number; producto_id: number;
  preferencia: string | null; calificacion: number | null;
};
type Producto = {
  id: number; tipo_producto_id: number; nombre: string; sabor: string | null;
  categoria: string | null; activo: boolean;
};
type EventKpi = {
  evento_id: number; tipo_evento: string | null; registrados: number;
  asistentes: number; pct_asistencia: number; pct_participacion: number;
  tasa_conversion: number; canjes: number; satisfaccion: number | null; nps: number;
  conversiones: number; presupuesto: number | null;
};

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------

const LIMIT = 20000;

async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabaseAdmin.from(table).select("*").limit(LIMIT);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

interface Dataset {
  eventos: Evento[]; usuarios: Usuario[]; registros: Registro[]; checkIns: CheckIn[];
  logs: LogActivity[]; interacciones: ProdInter[]; ventas: Venta[]; cupones: Cupon[];
  promociones: Promocion[]; surveys: Survey[]; preferencias: PrefCalif[];
  productos: Producto[]; kpis: EventKpi[];
}

async function loadDataset(): Promise<Dataset> {
  const [eventos, usuarios, registros, checkIns, logs, interacciones, ventas,
    cupones, promociones, surveys, preferencias, productos, kpis] = await Promise.all([
    fetchAll<Evento>("evento"),
    fetchAll<Usuario>("usuario"),
    fetchAll<Registro>("registro_asistido"),
    fetchAll<CheckIn>("check_in"),
    fetchAll<LogActivity>("log_activity"),
    fetchAll<ProdInter>("producto_interaccion"),
    fetchAll<Venta>("venta"),
    fetchAll<Cupon>("cupon"),
    fetchAll<Promocion>("promocion"),
    fetchAll<Survey>("surveys"),
    fetchAll<PrefCalif>("preferencia_calif"),
    fetchAll<Producto>("producto"),
    fetchAll<EventKpi>("v_event_kpis"),
  ]);
  return { eventos, usuarios, registros, checkIns, logs, interacciones,
    ventas, cupones, promociones, surveys, preferencias, productos, kpis };
}

// ---------------------------------------------------------------------------
// M2 — Regresión logística (entrenamiento en vivo)
// ---------------------------------------------------------------------------

function standardize(X: number[][]) {
  const n = X.length, d = X[0]?.length ?? 0;
  const mean = new Array(d).fill(0), std = new Array(d).fill(1);
  if (!n) return { X, mean, std };
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / n;
  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
  return { X: X.map((r) => r.map((v, j) => (v - mean[j]) / std[j])), mean, std };
}

function trainLogistic(X: number[][], y: number[], iters = 400, lr = 0.3, l2 = 0.01) {
  const n = X.length, d = X[0]?.length ?? 0;
  const w = new Array(d).fill(0);
  if (!n) return w;
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  for (let it = 0; it < iters; it++) {
    const grad = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < d; j++) grad[j] += (err * X[i][j]) / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (grad[j] + l2 * w[j]);
  }
  return w;
}

function predictProba(w: number[], x: number[]) {
  let z = 0;
  for (let j = 0; j < w.length; j++) z += w[j] * x[j];
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
}

function auc(y: number[], p: number[]) {
  const pos = p.filter((_, i) => y[i] === 1), neg = p.filter((_, i) => y[i] === 0);
  if (!pos.length || !neg.length) return null;
  let conc = 0;
  for (const a of pos) for (const b of neg) conc += a > b ? 1 : a === b ? 0.5 : 0;
  return conc / (pos.length * neg.length);
}

function brier(y: number[], p: number[]) {
  if (!y.length) return null;
  return y.reduce((s, yi, i) => s + (p[i] - yi) ** 2, 0) / y.length;
}

// ---------------------------------------------------------------------------
// Análisis completo (se calcula junto y se cachea)
// ---------------------------------------------------------------------------

export interface Segmento {
  codigo: string; nombre: string; descripcion: string; n_usuarios: number;
  tasa_asistencia: number; tasa_participacion: number; tasa_canje: number;
  satisfaccion_promedio: number | null; sabor_preferido: string | null;
  producto_preferido: string | null; rango_edad_frecuente: string | null;
  ciudad_principal: string | null; productos_top: { producto: string; sabor: string | null; afinidad: number }[];
}

export interface Recomendacion {
  productoId: number; nombre: string; sabor: string | null;
  posicion: number; score: number; origen: string; razon: string;
}

export interface PrediccionUsuario {
  usuario_id: number; etiqueta: string; prob_asistencia: number;
  factores: string[]; recomendado: boolean;
}

export interface PronosticoEvento {
  evento_id: number | null; evento_nombre: string; fecha: string | null;
  origen: Origen; confianza: Confianza;
  registrados_actuales: number; audiencia_modelada: number;
  asistentes: { p10: number; p50: number; p90: number };
  participacion_pct: number; conversion_pct: number; canjes_esperados: number;
  satisfaccion: number | null; nps: number | null;
  conversiones_esperadas: number;
  score_exito: number; pesos: Record<string, number>;
  factores: string[]; eventos_similares: number;
  advertencia: string;
}

export interface Analisis {
  calculado_at: string;
  calidad: { logs_sin_checkin: number; interacciones_sin_checkin: number;
    surveys_sin_checkin: number; calificaciones_fuera_rango: number };
  modelos: { tipo: string; algoritmo: string; estado: string;
    n_filas: number; n_eventos: number; metricas: Record<string, number | null> }[];
  segmentos: Segmento[];
  afinidad: Map<number, Map<number, number>>;
  popularidad: Map<number, number>;
  productoPorId: Map<number, Producto>;
  proximoEvento: Evento | null;
  pronostico: PronosticoEvento | null;
  m2: { w: number[]; mean: number[]; std: number[]; fuentes: string[];
    tipos: number[]; baseRate: number; valido: boolean };
  prediccionesProximo: PrediccionUsuario[];
  totalUsuarios: number; usuariosConSenal: number;
}

// Mapa de texto de preferencia a valor (PRD 7.2)
function textoANivel(t: string | null): number | null {
  if (!t) return null;
  const s = t.toLowerCase();
  if (s.includes("favorit")) return 1.0;
  if (s.includes("gusta") && !s.includes("no")) return 0.75;
  if (s.includes("neutral") || s.includes("regular")) return 0.5;
  if (s.includes("no")) return 0.0;
  return null;
}

function levelAfinidad(nivel: string | null): number | null {
  if (!nivel) return null;
  const s = nivel.toLowerCase();
  if (s.includes("mucho") || s.includes("excelente")) return 1.0;
  if (s.includes("agrada") || s.includes("bien") || s.includes("gusta")) return 0.75;
  if (s.includes("neutral") || s.includes("regular")) return 0.5;
  if (s.includes("no") || s.includes("poco") || s.includes("malo")) return 0.0;
  return null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; value: Analisis } | null = null;

export async function getAnalisis(): Promise<Analisis> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const ds = await loadDataset();
  const value = analizar(ds);
  cache = { at: Date.now(), value };
  return value;
}

function analizar(ds: Dataset): Analisis {
  const {
    eventos, usuarios, registros, checkIns, logs, interacciones, ventas,
    cupones, promociones, surveys, preferencias, productos, kpis,
  } = ds;

  // ---- Índices base -------------------------------------------------------
  const eventoPorId = new Map(eventos.map((e) => [e.id, e]));
  const registroPorId = new Map(registros.map((r) => [r.id, r]));
  const checkPorRegistro = new Set(checkIns.map((c) => c.registro_id));
  const productoPorId = new Map(productos.map((p) => [p.id, p]));
  const usuariosParticipantes = usuarios.filter((u) => u.role_id === 4 && u.activo);
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));

  const registrosDe = (uid: number) => registros.filter((r) => r.usuario_id === uid);
  const asistioRegistro = (rid: number) => checkPorRegistro.has(rid);

  // ---- Calidad de datos (PRD 2.3.5) ---------------------------------------
  const calidad = {
    logs_sin_checkin: logs.filter((l) => !checkPorRegistro.has(l.registro_id)).length,
    interacciones_sin_checkin: interacciones.filter((i) => !checkPorRegistro.has(i.registro_id)).length,
    surveys_sin_checkin: surveys.filter((s) => !checkPorRegistro.has(s.registro_id)).length,
    calificaciones_fuera_rango:
      interacciones.filter((i) => i.calificacion != null && (i.calificacion < 1 || i.calificacion > 5)).length +
      preferencias.filter((p) => p.calificacion != null && (p.calificacion < 1 || p.calificacion > 5)).length,
  };

  // ---- M2: features de asistencia (PRD 7.3) -------------------------------
  const cerrados = eventos.filter((e) => e.estado === "cerrado").sort((a, b) =>
    a.fecha_inicio.localeCompare(b.fecha_inicio));
  const fuentes = [...new Set(registros.map((r) => r.fuente_registro))].sort();
  const tipos = [...new Set(eventos.map((e) => e.tipo_evento_id))].sort();

  // historial previo por registro (sin fuga: solo eventos con fecha anterior)
  const feats = registros.map((r) => {
    const ev = eventoPorId.get(r.evento_id)!;
    const user = usuarioPorId.get(r.usuario_id);
    const previos = registrosDe(r.usuario_id).filter((r2) => {
      const e2 = eventoPorId.get(r2.evento_id);
      return e2 && e2.fecha_inicio < ev.fecha_inicio;
    });
    const prevAsist = previos.filter((r2) => asistioRegistro(r2.id)).length;
    const dias = Math.max(0, (new Date(ev.fecha_inicio).getTime() - new Date(r.registered_at).getTime()) / 86400000);
    const dow = new Date(ev.fecha_inicio).getDay();
    return {
      registro: r, evento: ev, usuario: user,
      asistio: asistioRegistro(r.id) ? 1 : 0,
      dias_anticipacion: Math.min(dias, 60),
      misma_ciudad: user?.ciudad && ev.ciudad && user.ciudad === ev.ciudad ? 1 : 0,
      fin_semana: dow === 0 || dow === 6 ? 1 : 0,
      prev_reg: Math.min(previos.length, 5),
      prev_asist: Math.min(prevAsist, 5),
      tasa_previa: previos.length ? prevAsist / previos.length : null,
      consentimiento: r.consentimiento ? 1 : 0,
      uso_codigo: r.codigo_promocional ? 1 : 0,
    };
  });

  const baseRate = feats.length ? feats.reduce((s, f) => s + f.asistio, 0) / feats.length : 0.5;

  const toVector = (f: (typeof feats)[number], base: number) => [
    f.dias_anticipacion, f.misma_ciudad, f.fin_semana, f.prev_reg, f.prev_asist,
    f.tasa_previa ?? base, f.consentimiento, f.uso_codigo,
    ...fuentes.slice(1).map((fu) => (f.registro.fuente_registro === fu ? 1 : 0)),
    ...tipos.slice(1).map((t) => (f.evento.tipo_evento_id === t ? 1 : 0)),
  ];

  const trainRows = feats.filter((f) => f.evento.estado === "cerrado");
  const Xraw = trainRows.map((f) => toVector(f, baseRate));
  const y = trainRows.map((f) => f.asistio);
  const { X, mean, std } = standardize(Xraw);
  const w = trainLogistic(X, y);
  const pTrain = X.map((row) => predictProba(w, row));
  const aucVal = auc(y, pTrain);
  const brierVal = brier(y, pTrain);
  const m2Valido = trainRows.length >= 300 && cerrados.length >= 3;

  // ---- M1: afinidad usuario-producto (PRD 7.2) ----------------------------
  const interPorUsuarioProd = new Map<string, { n: number; calif: number[]; compraria: boolean; promos: boolean }>();
  for (const i of interacciones) {
    const r = registroPorId.get(i.registro_id);
    if (!r) continue;
    const key = `${r.usuario_id}:${i.producto_id}`;
    const cur = interPorUsuarioProd.get(key) ?? { n: 0, calif: [], compraria: false, promos: false };
    cur.n += 1;
    if (i.calificacion != null) cur.calif.push(i.calificacion);
    if (i.compraria) cur.compraria = true;
    if (i.quiere_promos) cur.promos = true;
    interPorUsuarioProd.set(key, cur);
  }
  const comprasPorUP = new Map<string, number>();
  for (const v of ventas) {
    const r = registroPorId.get(v.registro_id);
    if (!r) continue;
    const key = `${r.usuario_id}:${v.producto_id}`;
    comprasPorUP.set(key, (comprasPorUP.get(key) ?? 0) + v.cantidad);
  }
  const promoPorId = new Map(promociones.map((p) => [p.id, p]));
  const canjesPorUP = new Map<string, number>();
  for (const c of cupones) {
    if (c.estado !== "canjeado") continue;
    const r = registroPorId.get(c.registro_id);
    const promo = promoPorId.get(c.promocion_id);
    if (!r || !promo?.producto_id) continue;
    const key = `${r.usuario_id}:${promo.producto_id}`;
    canjesPorUP.set(key, (canjesPorUP.get(key) ?? 0) + 1);
  }

  const afinidad = new Map<number, Map<number, number>>();
  const addAfin = (uid: number, pid: number, v: number) => {
    if (!afinidad.has(uid)) afinidad.set(uid, new Map());
    const m = afinidad.get(uid)!;
    m.set(pid, Math.max(m.get(pid) ?? 0, v));
  };

  const activos = productos.filter((p) => p.activo);
  const usuariosConSenalSet = new Set<number>([
    ...preferencias.map((p) => p.usuario_id),
    ...[...interPorUsuarioProd.keys()].map((k) => Number(k.split(":")[0])),
  ]);

  for (const pref of preferencias) {
    if (!productoPorId.get(pref.producto_id)?.activo) continue;
    const rating = pref.calificacion != null ? (pref.calificacion - 1) / 4 : textoANivel(pref.preferencia);
    if (rating == null) continue;
    const key = `${pref.usuario_id}:${pref.producto_id}`;
    const inter = interPorUsuarioProd.get(key);
    const compras = comprasPorUP.get(key) ?? 0;
    const canjes = canjesPorUP.get(key) ?? 0;
    const compraria = inter?.compraria ? 1 : 0;
    const compraN = Math.min(1, compras / 3), canjeN = Math.min(1, canjes / 2);
    let score: number;
    if (rating <= 0.1) score = Math.min(0.10, 0.10);
    else score = 0.45 * rating + 0.20 * compraria + 0.20 * compraN + 0.15 * canjeN;
    addAfin(pref.usuario_id, pref.producto_id, Number(score.toFixed(4)));
  }
  for (const [key, inter] of interPorUsuarioProd) {
    const [uid, pid] = key.split(":").map(Number);
    if (!productoPorId.get(pid)?.activo) continue;
    const promCalif = inter.calif.length ? inter.calif.reduce((a, b) => a + b, 0) / inter.calif.length : null;
    const rating = promCalif != null ? (promCalif - 1) / 4 : levelAfinidad(interacciones.find((i) => i.registro_id && i.producto_id === pid && registroPorId.get(i.registro_id)?.usuario_id === uid)?.nivel_agrado ?? null);
    if (rating == null) continue;
    const compras = comprasPorUP.get(key) ?? 0, canjes = canjesPorUP.get(key) ?? 0;
    const compraria = inter.compraria ? 1 : 0;
    const compraN = Math.min(1, compras / 3), canjeN = Math.min(1, canjes / 2);
    const score = rating <= 0.1 ? 0.10 : 0.45 * rating + 0.20 * compraria + 0.20 * compraN + 0.15 * canjeN;
    addAfin(uid, pid, Number(score.toFixed(4)));
  }

  // Popularidad (interacciones + ventas)
  const popularidad = new Map<number, number>();
  for (const i of interacciones) popularidad.set(i.producto_id, (popularidad.get(i.producto_id) ?? 0) + 1);
  for (const v of ventas) popularidad.set(v.producto_id, (popularidad.get(v.producto_id) ?? 0) + 2);
  const maxPop = Math.max(1, ...popularidad.values());

  // ---- M4: segmentos por arquetipo (PRD 7.5 / §17) ------------------------
  const behavior = usuariosParticipantes.map((u) => {
    const regs = registrosDe(u.id);
    const asist = regs.filter((r) => asistioRegistro(r.id)).length;
    const logsU = logs.filter((l) => registroPorId.get(l.registro_id)?.usuario_id === u.id);
    const canjesU = cupones.filter((c) => c.estado === "canjeado" && registroPorId.get(c.registro_id)?.usuario_id === u.id).length;
    const intersU = interacciones.filter((i) => registroPorId.get(i.registro_id)?.usuario_id === u.id);
    const surU = surveys.filter((s) => registroPorId.get(s.registro_id)?.usuario_id === u.id);
    const califs = [...intersU.map((i) => i.calificacion).filter((c): c is number => c != null)];
    const sat = surU.length ? surU.reduce((s, x) => s + (x.general ?? 0), 0) / surU.length : null;
    return {
      usuario: u, regs: regs.length, asist, logs: logsU.length, canjes: canjesU,
      inters: intersU.length, califProm: califs.length ? califs.reduce((a, b) => a + b, 0) / califs.length : null,
      sat,
    };
  });

  const clasificar = (b: (typeof behavior)[number]) => {
    if (b.asist >= 2) return "seg_fieles";
    if (b.inters >= 2) return "seg_exploradores";
    if (b.canjes >= 1) return "seg_promos";
    return "seg_ocasionales";
  };
  const metaSegmento: Record<string, { nombre: string; descripcion: string }> = {
    seg_fieles: { nombre: "Fieles al evento", descripcion: "Han asistido a 2 o más eventos; alta propensión a repetir." },
    seg_exploradores: { nombre: "Exploradores de sabores", descripcion: "Prueban y califican varios productos; perfil degustador." },
    seg_promos: { nombre: "Cazadores de promos", descripcion: "Activan cupones y buscan beneficios; sensibles a promociones." },
    seg_ocasionales: { nombre: "Ocasionales", descripcion: "Asistencia y participación baja; requieren activación." },
  };

  const segmentos: Segmento[] = Object.keys(metaSegmento).map((codigo) => {
    const miembros = behavior.filter((b) => clasificar(b) === codigo);
    const n = miembros.length;
    const tasaAsist = n ? miembros.reduce((s, b) => s + (b.regs ? b.asist / b.regs : 0), 0) / n : 0;
    const tasaPart = n ? miembros.reduce((s, b) => s + (b.asist ? b.logs / b.asist : 0), 0) / n : 0;
    const tasaCanje = n ? miembros.reduce((s, b) => s + (b.asist ? b.canjes / b.asist : 0), 0) / n : 0;
    const sats = miembros.map((b) => b.sat).filter((s): s is number => s != null);
    const satProm = sats.length ? sats.reduce((a, b) => a + b, 0) / sats.length : null;

    // sabor y producto preferido del segmento
    const califPorProducto = new Map<number, number[]>();
    for (const b of miembros) {
      const prefs = preferencias.filter((p) => p.usuario_id === b.usuario.id && p.calificacion != null);
      const inters = interacciones.filter((i) => registroPorId.get(i.registro_id)?.usuario_id === b.usuario.id && i.calificacion != null);
      for (const p of prefs) {
        const arr = califPorProducto.get(p.producto_id) ?? [];
        arr.push(p.calificacion!); califPorProducto.set(p.producto_id, arr);
      }
      for (const i of inters) {
        const arr = califPorProducto.get(i.producto_id) ?? [];
        arr.push(i.calificacion!); califPorProducto.set(i.producto_id, arr);
      }
    }
    const ranked = [...califPorProducto.entries()]
      .map(([pid, arr]) => ({ pid, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
      .sort((a, b) => b.avg - a.avg);
    const topProd = ranked[0] ? productoPorId.get(ranked[0].pid) : undefined;
    const saborCounts = new Map<string, number>();
    for (const { pid, avg } of ranked) {
      const p = productoPorId.get(pid);
      if (p?.sabor) saborCounts.set(p.sabor, (saborCounts.get(p.sabor) ?? 0) + avg);
    }
    const saborTop = [...saborCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const edades = miembros.map((b) => b.usuario.rango_edad).filter((e): e is string => !!e);
    const edadTop = [...new Set(edades)].map((e) => ({ e, c: edades.filter((x) => x === e).length })).sort((a, b) => b.c - a.c)[0]?.e ?? null;
    const ciudades = miembros.map((b) => b.usuario.ciudad).filter((c): c is string => !!c);
    const ciudadTop = [...new Set(ciudades)].map((c) => ({ c, n: ciudades.filter((x) => x === c).length })).sort((a, b) => b.n - a.n)[0]?.c ?? null;

    // afinidad media por producto dentro del segmento
    const afinPorProducto = new Map<number, number[]>();
    for (const b of miembros) {
      const m = afinidad.get(b.usuario.id);
      if (!m) continue;
      for (const [pid, v] of m) {
        const arr = afinPorProducto.get(pid) ?? [];
        arr.push(v); afinPorProducto.set(pid, arr);
      }
    }
    const productosTop = [...afinPorProducto.entries()]
      .map(([pid, arr]) => ({ producto: productoPorId.get(pid)?.nombre ?? `#${pid}`, sabor: productoPorId.get(pid)?.sabor ?? null, afinidad: Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3)) }))
      .sort((a, b) => b.afinidad - a.afinidad).slice(0, 3);

    return {
      codigo, nombre: metaSegmento[codigo].nombre, descripcion: metaSegmento[codigo].descripcion,
      n_usuarios: n, tasa_asistencia: Number((tasaAsist * 100).toFixed(1)),
      tasa_participacion: Number((tasaPart * 100).toFixed(1)),
      tasa_canje: Number((tasaCanje * 100).toFixed(1)),
      satisfaccion_promedio: satProm != null ? Number(satProm.toFixed(2)) : null,
      sabor_preferido: saborTop, producto_preferido: topProd?.nombre ?? null,
      rango_edad_frecuente: edadTop, ciudad_principal: ciudadTop, productos_top: productosTop,
    };
  }).filter((s) => s.n_usuarios > 0);

  // ---- M5: pronóstico del próximo evento (PRD 7.6, bottom-up) -------------
  const proximo = eventos
    .filter((e) => e.estado === "planificado" || e.estado === "en_curso")
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] ?? null;

  let pronostico: PronosticoEvento | null = null;
  const prediccionesProximo: PrediccionUsuario[] = [];

  if (proximo) {
    const fProx = feats.filter((f) => f.evento.id === proximo.id);
    const prob = (f: (typeof feats)[number]) =>
      m2Valido ? predictProba(w, toVector(f, baseRate).map((v, j) => (v - mean[j]) / std[j]))
               : Math.max(0.05, Math.min(0.95, baseRate * (1 + 0.15 * (f.misma_ciudad + f.fin_semana - 1))));
    const probs = fProx.map(prob);
    const esperados = proximo.participantes_esperados ?? Math.max(fProx.length, Math.round(kpis.reduce((s, k) => s + k.registrados, 0) / Math.max(1, kpis.length)));
    const pSinteticos = Math.max(0, esperados - fProx.length);
    const pNuevo = Math.max(0.05, Math.min(0.9, baseRate - 0.05));
    const mean50 = probs.reduce((a, b) => a + b, 0) + pSinteticos * pNuevo;
    const varianza = (probs.reduce((s, p) => s + p * (1 - p), 0) + pSinteticos * pNuevo * (1 - pNuevo)) * 1.2;
    const sd = Math.sqrt(Math.max(varianza, 1));
    const clamp = (v: number) => Math.max(0, Math.min(esperados, Math.round(v)));
    const asistentes = { p10: clamp(mean50 - 1.2816 * sd), p50: clamp(mean50), p90: clamp(mean50 + 1.2816 * sd) };

    // tasas históricas por tipo con contracción empírica hacia la media global
    const kpisTipo = kpis.filter((k) => eventoPorId.get(k.evento_id)?.tipo_evento_id === proximo.tipo_evento_id && eventoPorId.get(k.evento_id)?.estado === "cerrado");
    const globalMean = (sel: (k: EventKpi) => number) =>
      kpis.length ? kpis.reduce((s, k) => s + (sel(k) || 0), 0) / kpis.length : null;
    const shrink = (vals: number[], global: number | null, k = 2) => {
      if (!vals.length) return global;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const g = global ?? m;
      return (vals.length * m + k * g) / (vals.length + k);
    };
    const participacion = shrink(kpisTipo.map((k) => k.pct_participacion), globalMean((k) => k.pct_participacion)) ?? 50;
    const conversion = shrink(kpisTipo.map((k) => k.tasa_conversion), globalMean((k) => k.tasa_conversion)) ?? 20;
    const canjeRate = shrink(
      kpisTipo.map((k) => (k.asistentes ? (k.canjes / k.asistentes) * 100 : 0)).filter((v) => v > 0),
      globalMean((k) => (k.asistentes ? (k.canjes / k.asistentes) * 100 : 0)),
    ) ?? 15;
    const satisfaccion = shrink(
      kpisTipo.map((k) => k.satisfaccion ?? 0).filter((v) => v > 0),
      globalMean((k) => k.satisfaccion ?? 0),
    );
    const nps = shrink(kpisTipo.map((k) => k.nps), globalMean((k) => k.nps));
    const conversionesEsperadas = Math.round(asistentes.p50 * (conversion / 100));

    // score de éxito (PRD 7.6, pesos iniciales)
    const pesos = { conversion: 0.25, participacion: 0.20, satisfaccion: 0.20, asistencia: 0.15, nps: 0.10, eficiencia: 0.10 };
    const hist = (f: (k: EventKpi) => number) => kpis.map(f);
    const norm = (v: number, vals: number[]) => {
      if (!vals.length) return 0.5;
      const lo = Math.min(...vals), hi = Math.max(...vals);
      return hi - lo < 1e-9 ? 0.5 : Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    };
    const pctAsistEsperado = esperados ? (asistentes.p50 / esperados) * 100 : 0;
    const efis = proximo.presupuesto ? conversionesEsperadas / proximo.presupuesto : 0;
    const score = Math.round(100 * (
      pesos.conversion * norm(conversion, hist((k) => k.tasa_conversion)) +
      pesos.participacion * norm(participacion, hist((k) => k.pct_participacion)) +
      pesos.satisfaccion * norm(satisfaccion ?? 0, hist((k) => k.satisfaccion ?? 0)) +
      pesos.asistencia * norm(pctAsistEsperado, hist((k) => k.pct_asistencia)) +
      pesos.nps * norm(nps ?? 0, hist((k) => k.nps)) +
      pesos.eficiencia * norm(efis, hist((k) => (k.presupuesto ? k.conversiones / k.presupuesto : 0)))
    ));

    const nSimilares = kpisTipo.length;
    const confianza: Confianza = nSimilares >= 8 ? "alta" : nSimilares >= 3 ? "media" : "baja";
    const dow = new Date(proximo.fecha_inicio).getDay();
    const mismaCiudadPct = fProx.length ? Math.round((fProx.filter((f) => f.misma_ciudad).length / fProx.length) * 100) : 0;
    const factores: string[] = [];
    if (dow === 0 || dow === 6) factores.push("Fin de semana (+ asistirá más gente)");
    else factores.push("Día laboral (− ligera presión a la asistencia)");
    factores.push(`${mismaCiudadPct}% de la audiencia es de la misma ciudad`);
    if (baseRate >= 0.6) factores.push("Tasa histórica de asistencia alta");
    factores.push(`${nSimilares} eventos históricos del mismo tipo (${confianza} confianza)`);

    pronostico = {
      evento_id: proximo.id, evento_nombre: proximo.nombre, fecha: proximo.fecha_inicio,
      origen: m2Valido ? "modelo" : "heuristica", confianza,
      registrados_actuales: fProx.length, audiencia_modelada: esperados,
      asistentes, participacion_pct: Number(participacion.toFixed(1)),
      conversion_pct: Number(conversion.toFixed(1)),
      canjes_esperados: Math.round(asistentes.p50 * (canjeRate / 100)),
      satisfaccion: satisfaccion != null ? Number(satisfaccion.toFixed(2)) : null,
      nps: nps != null ? Number(nps.toFixed(1)) : null,
      conversiones_esperadas: conversionesEsperadas,
      score_exito: score, pesos, factores, eventos_similares: nSimilares,
      advertencia: "Estimación basada en asociaciones del historial; no implica causalidad.",
    };

    // predicciones individuales del próximo evento
    const probsOrdenadas = [...probs].sort((a, b) => a - b);
    const q20 = probsOrdenadas.length
      ? probsOrdenadas[Math.floor(probsOrdenadas.length * 0.2)]
      : 0;
    fProx.forEach((f, idx) => {
      const p = probs[idx];
      const fac: string[] = [];
      if (f.tasa_previa != null) fac.push(f.tasa_previa >= baseRate ? "Asiste con frecuencia" : "Asistencia previa baja");
      if (f.misma_ciudad) fac.push("Vive en la ciudad del evento");
      if (f.fin_semana) fac.push("Evento en fin de semana");
      if (f.uso_codigo) fac.push("Usó código promocional");
      if (f.prev_reg === 0) fac.push("Cliente nuevo");
      prediccionesProximo.push({
        usuario_id: f.registro.usuario_id,
        etiqueta: `${f.usuario?.nombre ?? "Cliente"} ${f.usuario?.apellido ?? ""}`.trim(),
        prob_asistencia: Number(p.toFixed(3)),
        factores: fac.slice(0, 3),
        recomendado: p <= q20,
      });
    });
    prediccionesProximo.sort((a, b) => b.prob_asistencia - a.prob_asistencia);
  }

  return {
    calculado_at: new Date().toISOString(),
    calidad,
    modelos: [
      {
        tipo: "recomendador_producto", algoritmo: "híbrido afinidad + contenido + popularidad",
        estado: usuariosConSenalSet.size >= 150 ? "activo" : "candidato",
        n_filas: preferencias.length + interacciones.length, n_eventos: cerrados.length,
        metricas: { usuarios_con_senal: usuariosConSenalSet.size, productos_activos: activos.length },
      },
      {
        tipo: "prediccion_asistencia", algoritmo: "regresión logística (entrenamiento en vivo)",
        estado: m2Valido ? "activo" : "candidato",
        n_filas: trainRows.length, n_eventos: cerrados.length,
        metricas: { auc: aucVal ? Number(aucVal.toFixed(3)) : null, brier: brierVal ? Number(brierVal.toFixed(3)) : null },
      },
      {
        tipo: "segmentacion", algoritmo: "arquetipos de comportamiento (reglas)",
        estado: usuariosParticipantes.length >= 200 ? "activo" : "candidato",
        n_filas: usuariosParticipantes.length, n_eventos: cerrados.length,
        metricas: { n_segmentos: segmentos.length },
      },
      {
        tipo: "pronostico_evento", algoritmo: "bottom-up + contracción empírica",
        estado: pronostico ? "activo" : "candidato",
        n_filas: trainRows.length, n_eventos: cerrados.length,
        metricas: pronostico ? { score_exito: pronostico.score_exito } : {},
      },
    ],
    segmentos,
    afinidad, popularidad, productoPorId,
    proximoEvento: proximo, pronostico,
    m2: { w, mean, std, fuentes, tipos, baseRate, valido: m2Valido },
    prediccionesProximo,
    totalUsuarios: usuariosParticipantes.length,
    usuariosConSenal: usuariosConSenalSet.size,
  };
}

// ---------------------------------------------------------------------------
// M1 — Recomendaciones Top-K para un usuario (PRD 7.2 / UC1)
// ---------------------------------------------------------------------------

export function recomendarProductos(
  a: Analisis, usuarioId: number, k = 5,
): { origen: Origen; items: Recomendacion[] } {
  const afines = a.afinidad.get(usuarioId);
  const tipoDe = (pid: number) => a.productoPorId.get(pid)?.tipo_producto_id;
  const saborDe = (pid: number) => a.productoPorId.get(pid)?.sabor;
  const items: Recomendacion[] = [];

  const activos = [...a.productoPorId.values()].filter((p) => p.activo);
  for (const p of activos) {
    const conocida = afines?.get(p.id);
    if (conocida != null) {
      if (conocida <= 0.12) continue; // no recomendar lo que no le gusta
      items.push({
        productoId: p.id, nombre: p.nombre, sabor: p.sabor, posicion: 0,
        score: conocida, origen: "personalizado",
        razon: "Coincide con tus gustos y calificaciones previas",
      });
      continue;
    }
    // contenido: parecido a lo que le gusta
    let base = 0, motivo = "";
    if (afines) {
      for (const [qid, v] of afines) {
        if (v < 0.3 || qid === p.id) continue;
        let sim = 0;
        if (tipoDe(qid) === p.tipo_producto_id) sim = v * 0.85;
        else if (saborDe(qid) && saborDe(qid) === p.sabor) sim = v * 0.75;
        if (sim > base) {
          base = sim;
          motivo = `Parecido a ${a.productoPorId.get(qid)?.nombre ?? "otro producto"} que te gusta`;
        }
      }
    }
    const pop = 0.25 * ((a.popularidad.get(p.id) ?? 0) / Math.max(1, Math.max(...a.popularidad.values())));
    items.push({
      productoId: p.id, nombre: p.nombre, sabor: p.sabor, posicion: 0,
      score: Number((base + pop).toFixed(3)),
      origen: base > 0 ? "personalizado" : "popularidad",
      razon: base > pop && motivo ? motivo : "Popular entre asistentes de eventos similares",
    });
  }
  items.sort((x, y2) => y2.score - x.score);
  return {
    origen: afines && afines.size > 0 ? "modelo" : "heuristica",
    items: items.slice(0, k).map((it, i) => ({ ...it, posicion: i + 1 })),
  };
}
