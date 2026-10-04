"use client"

import { useEffect, useState } from "react"

type Pronostico = {
  evento_id: number | null
  evento_nombre: string
  fecha: string | null
  origen: string
  confianza: string
  registrados_actuales: number
  audiencia_modelada: number
  asistentes: { p10: number; p50: number; p90: number }
  participacion_pct: number
  conversion_pct: number
  conversiones_esperadas: number
  canjes_esperados: number
  satisfaccion: number | null
  nps: number | null
  score_exito: number
  factores: string[]
  eventos_similares: number
  advertencia: string
}

type Modelo = {
  tipo: string
  algoritmo: string
  estado: string
  n_filas: number
  n_eventos: number
  metricas: Record<string, number | null>
}

type OverviewData = {
  calculado_at: string
  total_usuarios: number
  usuarios_con_senal: number
  calidad: Record<string, number>
  modelos: Modelo[]
  segmentos_resumen: { codigo: string; nombre: string; n_usuarios: number; sabor_preferido: string | null }[]
  pronostico: Pronostico | null
  predicciones_n: number
}

type Segmento = {
  codigo: string
  nombre: string
  descripcion: string
  n_usuarios: number
  tasa_asistencia: number
  tasa_participacion: number
  tasa_canje: number
  satisfaccion_promedio: number | null
  sabor_preferido: string | null
  producto_preferido: string | null
  rango_edad_frecuente: string | null
  ciudad_principal: string | null
  productos_top: { producto: string; sabor: string | null; afinidad: number }[]
}

type Prediccion = {
  usuario_id: number
  etiqueta: string
  prob_asistencia: number
  factores: string[]
  recomendado: boolean
}

type PrediccionesData = {
  origen: string
  confianza: string
  evento: { id: number | null; nombre: string; fecha: string | null }
  agregado: {
    registrados_actuales: number
    asistentes_esperados: number
    pct_asistencia_esperado: number
    rango: { p10: number; p50: number; p90: number }
  }
  predicciones?: Prediccion[]
}

const fmtFecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" }) : "—"

const clamp = (v: number) => Math.max(0, Math.min(100, v))

const factorTone = (f: string) => (f.includes("−") ? "down" : f.includes("+") ? "up" : "flat")
const factorMark: Record<string, string> = { up: "↑", down: "↓", flat: "•" }

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function MlPredictions({
  role,
}: {
  role: "organizador" | "administrador" | "marketing"
}) {
  const [ov, setOv] = useState<OverviewData | null>(null)
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [pred, setPred] = useState<PrediccionesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const esAdmin = role === "administrador"

  useEffect(() => {
    let vivo = true
    setLoading(true)
    Promise.all([
      fetch("/api/ml/overview").then((r) => r.json()),
      fetch("/api/ml/segmentos").then((r) => r.json()),
      fetch(`/api/ml/predicciones?k=15${esAdmin ? "&detalle=1" : ""}`).then((r) => r.json()),
    ])
      .then(([o, s, p]) => {
        if (!vivo) return
        if (o.ok) setOv(o.data)
        if (s.ok) setSegmentos(s.data.segmentos)
        if (p.ok) setPred(p.data)
        if (!o.ok && !s.ok && !p.ok) setError("No se pudieron cargar las predicciones")
      })
      .catch(() => vivo && setError("No se pudieron cargar las predicciones"))
      .finally(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [esAdmin])

  if (loading) {
    return (
      <div className="panel" style={{ padding: 32, textAlign: "center" }}>
        <p>Entrenando modelos y calculando predicciones…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel" style={{ padding: 24 }}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          Verifica la conexión con Supabase (frontend/.env.local) y vuelve a intentar.
        </p>
      </div>
    )
  }

  const pr = ov?.pronostico ?? null
  const m2 = ov?.modelos.find((m) => m.tipo === "prediccion_asistencia")
  const auc = m2?.metricas.auc ?? null
  const brier = m2?.metricas.brier ?? null
  const scoreColor = pr
    ? pr.score_exito >= 70
      ? "#16855b"
      : pr.score_exito >= 45
        ? "#a56500"
        : "#f40009"
    : "#f40009"
  const segTotal = segmentos.reduce((acc, s) => acc + s.n_usuarios, 0) || 1

  return (
    <>
      <div className="dashboard-title compact">
        <div>
          <span>PREDICCIÓN DE COMPORTAMIENTO</span>
          <h1>Predicciones IA</h1>
          <p>
            Modelos entrenados con {ov?.usuarios_con_senal ?? 0} clientes con señales de
            gusto sobre {ov?.total_usuarios ?? 0} participantes.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {pr && (
            <span className="badge badge-green">
              {pr.origen === "modelo" ? "MODELO ACTIVO" : "HEURÍSTICA"}
            </span>
          )}
          <span className="badge badge-neutral">
            CONFIANZA: {(pr?.confianza ?? "baja").toUpperCase()}
          </span>
        </div>
      </div>

      {pr ? (
        <>
          <div className="kpi-grid ml-kpis">
            <article className="kpi-card">
              <span>ASISTENTES ESPERADOS</span>
              <strong>{pr.asistentes.p50}</strong>
              <small>
                Rango probable {pr.asistentes.p10}–{pr.asistentes.p90} · {pr.evento_nombre}
              </small>
            </article>
            <article className="kpi-card">
              <span>SCORE DE ÉXITO</span>
              <strong>{pr.score_exito}/100</strong>
              <small>Ponderado: conversión, participación, satisfacción…</small>
            </article>
            <article className="kpi-card">
              <span>CONVERSIONES ESTIMADAS</span>
              <strong>{pr.conversiones_esperadas}</strong>
              <small>Tasa esperada {pr.conversion_pct}% · {pr.canjes_esperados} canjes</small>
            </article>
            <article className="kpi-card">
              <span>AUDIENCIA</span>
              <strong>{pr.audiencia_modelada}</strong>
              <small>{pr.registrados_actuales} ya inscritos · meta del evento</small>
            </article>
            <article className="kpi-card">
              <span>SATISFACCIÓN PROYECTADA</span>
              <strong>{pr.satisfaccion != null ? pr.satisfaccion : "—"}</strong>
              <small>NPS {pr.nps != null ? pr.nps : "—"} · {pr.eventos_similares} eventos similares</small>
            </article>
            <article className="kpi-card">
              <span>PRECISIÓN DEL MODELO (M2)</span>
              <strong>{auc != null ? auc.toFixed(2) : "—"}</strong>
              <small>ROC-AUC sobre {m2?.n_filas ?? 0} inscripciones · Brier {brier != null ? brier.toFixed(3) : "—"}</small>
            </article>
          </div>

          <div className="dashboard-grid lower">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>PRÓXIMO EVENTO</span>
                  <h3>Factores que mueven la predicción</h3>
                </div>
                <span className={`badge ${pr.confianza === "alta" ? "badge-green" : pr.confianza === "media" ? "badge-yellow" : "badge-neutral"}`}>
                  {pr.confianza.toUpperCase()}
                </span>
              </div>
              <div className="ml-event-head" style={{ marginTop: 16 }}>
                <span><CalendarIcon /></span>
                <div>
                  <small>Próximo evento · {fmtFecha(pr.fecha)}</small>
                  <strong>{pr.evento_nombre}</strong>
                </div>
              </div>
              <ul className="ml-factors">
                {pr.factores.map((f) => {
                  const tone = factorTone(f)
                  return (
                    <li key={f} className={tone}>
                      <b aria-hidden>{factorMark[tone]}</b>
                      <span>{f}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="ml-note">{pr.advertencia}</p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>INDICADOR COMPUESTO</span>
                  <h3>Score de éxito proyectado</h3>
                </div>
              </div>
              <div className="ml-gauge-wrap">
                <div
                  className="ml-gauge"
                  role="img"
                  aria-label={`Score de éxito ${pr.score_exito} de 100`}
                  style={{
                    background: `conic-gradient(${scoreColor} 0 ${clamp(pr.score_exito)}%, #efefef ${clamp(pr.score_exito)}% 100%)`,
                  }}
                >
                  <div>
                    <strong style={{ color: scoreColor }}>{pr.score_exito}</strong>
                    <small>DE 100</small>
                  </div>
                </div>
                <div className="ml-breakdown">
                  {[
                    { label: "Conversión esperada", pct: clamp(pr.conversion_pct), value: `${pr.conversion_pct}%` },
                    { label: "Participación", pct: clamp(pr.participacion_pct), value: `${pr.participacion_pct}%` },
                    {
                      label: "Satisfacción",
                      pct: pr.satisfaccion != null ? clamp((pr.satisfaccion / 5) * 100) : 0,
                      value: pr.satisfaccion != null ? `${pr.satisfaccion}/5` : "Sin datos",
                    },
                  ].map((row) => (
                    <div className="progress-row" key={row.label}>
                      <span>
                        {row.label}
                        <b>{row.value}</b>
                      </span>
                      <div>
                        <i style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="ml-note">
                Rango probable de asistencia (P10–P90): <b>{pr.asistentes.p10}–{pr.asistentes.p90}</b> personas ·
                NPS proyectado <b>{pr.nps ?? "—"}</b> · {pr.eventos_similares} eventos similares de referencia.
              </p>
            </article>
          </div>

          <div className="dashboard-grid lower">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>PRONÓSTICO DEL PRÓXIMO EVENTO</span>
                  <h3>Proyección de audiencia y conversión</h3>
                </div>
                <div className="legend"><i />Proyección · banda punteada P10–P90</div>
              </div>
              {(() => {
                const aud = Math.max(pr.audiencia_modelada, pr.registrados_actuales, pr.asistentes.p90, 1)
                const rows = [
                  { label: "Audiencia modelada", value: pr.audiencia_modelada, caption: "Base de clientes con señales de gusto", muted: true },
                  { label: "Registrados actuales", value: pr.registrados_actuales, caption: "Personas ya inscritas al evento" },
                  { label: "Asistentes esperados", value: pr.asistentes.p50, caption: `Estimación central · rango ${pr.asistentes.p10}–${pr.asistentes.p90}`, band: true },
                  { label: "Conversiones esperadas", value: pr.conversiones_esperadas, caption: `Tasa esperada ${pr.conversion_pct}%` },
                  { label: "Canjes esperados", value: pr.canjes_esperados, caption: "Cupones proyectados al canje" },
                ]
                return (
                  <div className="ml-funnel">
                    {rows.map((r) => {
                      const pct = (r.value / aud) * 100
                      return (
                        <div className="ml-funnel-row" key={r.label}>
                          <div>
                            <span className="ml-row-label">
                              {r.label}
                              <small>{r.caption}</small>
                            </span>
                            <b>{r.value}</b>
                          </div>
                          <div className="ml-track">
                            <i
                              className={r.muted ? "muted" : ""}
                              style={{ width: `${r.value > 0 ? Math.max(pct, 1.5) : 0}%` }}
                            />
                            {r.band && (
                              <span
                                className="ml-band"
                                style={{
                                  left: `${Math.max((pr.asistentes.p10 / aud) * 100, 0)}%`,
                                  width: `${Math.max(((pr.asistentes.p90 - pr.asistentes.p10) / aud) * 100, 1.5)}%`,
                                }}
                              />
                            )}
                          </div>
                          <span className="ml-pct">{Math.round(pct)}% de la audiencia</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>MOTOR ML · ESTADO</span>
                  <h3>Modelos y calidad de datos</h3>
                </div>
                {auc != null && <span className="badge badge-green">ROC-AUC {auc.toFixed(2)}</span>}
              </div>
              <div className="ml-models">
                {(ov?.modelos ?? []).length > 0 ? (
                  (ov?.modelos ?? []).map((m) => (
                    <div key={m.tipo}>
                      <div>
                        <strong>{m.tipo.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</strong>
                        <small>{m.algoritmo}</small>
                      </div>
                      <small style={{ whiteSpace: "nowrap" }}>{m.n_filas.toLocaleString("es-BO")} filas</small>
                      <span className={`badge ${m.estado === "activo" ? "badge-green" : "badge-yellow"}`}>
                        {m.estado.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="stats-panel-empty">Sin modelos registrados todavía.</p>
                )}
              </div>
              <div className="ml-quality">
                <div>
                  <span>CLIENTES TOTALES</span>
                  <b>{ov?.total_usuarios ?? 0}</b>
                </div>
                <div>
                  <span>CON SEÑAL DE GUSTO</span>
                  <b>{ov?.usuarios_con_senal ?? 0}</b>
                </div>
                <div>
                  <span>ACTIVIDAD SIN CHECK-IN</span>
                  <b>{ov?.calidad.logs_sin_checkin ?? 0}</b>
                </div>
                <div>
                  <span>CALIF. FUERA DE RANGO</span>
                  <b>{ov?.calidad.calificaciones_fuera_rango ?? 0}</b>
                </div>
              </div>
              <p className="ml-note">
                Las filas con actividad sin check-in y calificaciones fuera de rango se excluyen del
                entrenamiento{brier != null ? <> · Brier score M2: {brier.toFixed(3)} (menor es mejor)</> : null}.
              </p>
            </article>
          </div>
        </>
      ) : (
        <div className="panel" style={{ padding: 24 }}>
          <p>No hay eventos planificados para pronosticar. Crea un evento en estado
            “planificado” y el motor estimará asistencia, conversiones y score de éxito.</p>
        </div>
      )}

      <div className="dashboard-title compact" style={{ marginTop: 28 }}>
        <div>
          <span>SEGMENTACIÓN AUTOMÁTICA</span>
          <h3 style={{ fontSize: 18 }}>Segmentos por comportamiento y sabor preferido</h3>
        </div>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {segmentos.map((s) => {
          const share = Math.round((s.n_usuarios / segTotal) * 100)
          return (
            <article className="panel" key={s.codigo} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <strong style={{ fontSize: 14, lineHeight: 1.3 }}>{s.nombre}</strong>
                <span className="badge badge-red" style={{ flexShrink: 0 }}>{s.n_usuarios} clientes</span>
              </div>
              <div className="ml-share">
                <div><i style={{ width: `${share}%` }} /></div>
                <small>{share}% de la base</small>
              </div>
              <p style={{ fontSize: 13, opacity: 0.75, marginTop: 10, lineHeight: 1.55 }}>{s.descripcion}</p>
              <div className="ml-seg-stats">
                <div>
                  <span>SABOR PREFERIDO</span>
                  <b>{s.sabor_preferido ?? "—"}</b>
                </div>
                <div>
                  <span>PRODUCTO ESTRELLA</span>
                  <b>{s.producto_preferido ?? "—"}</b>
                </div>
                <div>
                  <span>ASISTENCIA</span>
                  <b>{s.tasa_asistencia}%</b>
                </div>
                <div>
                  <span>PARTICIPACIÓN</span>
                  <b>{s.tasa_participacion}%</b>
                </div>
                <div>
                  <span>CANJE</span>
                  <b>{s.tasa_canje}%</b>
                </div>
                <div>
                  <span>SATISFACCIÓN</span>
                  <b>{s.satisfaccion_promedio ?? "—"}</b>
                </div>
                <div>
                  <span>CIUDAD PRINCIPAL</span>
                  <b>{s.ciudad_principal ?? "—"}</b>
                </div>
                <div>
                  <span>EDAD FRECUENTE</span>
                  <b>{s.rango_edad_frecuente ?? "—"}</b>
                </div>
              </div>
              {s.productos_top.length > 0 && (
                <div className="ml-tags" style={{ marginTop: 12 }}>
                  {s.productos_top.map((p) => (
                    <span key={p.producto}>{p.producto} · afinidad {p.afinidad}</span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {esAdmin && pred?.predicciones && pred.predicciones.length > 0 && (
        <>
          <div className="dashboard-title compact" style={{ marginTop: 28 }}>
            <div>
              <span>PRONÓSTICO POR PERSONA</span>
              <h3 style={{ fontSize: 18 }}>
                Probabilidad de asistencia · {pred.evento.nombre}
              </h3>
            </div>
          </div>
          <div className="panel table-panel">
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>P(ASISTIR)</th>
                    <th>FACTORES</th>
                    <th>ACCIÓN SUGERIDA</th>
                  </tr>
                </thead>
                <tbody>
                  {pred.predicciones.map((p) => {
                    const pct = Math.round(p.prob_asistencia * 100)
                    return (
                      <tr key={p.usuario_id}>
                        <td>
                          <div>
                            <strong>{p.etiqueta}</strong>
                            <small>#{p.usuario_id}</small>
                          </div>
                        </td>
                        <td>
                          <div className="ml-prob">
                            <div><i style={{ width: `${pct}%` }} /></div>
                            <b>{pct}%</b>
                          </div>
                        </td>
                        <td>
                          <div className="ml-tags">
                            {p.factores.length > 0
                              ? p.factores.map((f) => <span key={f}>{f}</span>)
                              : "—"}
                          </div>
                        </td>
                        <td>
                          {p.recomendado ? (
                            <span className="badge badge-yellow">Recordatorio WhatsApp</span>
                          ) : (
                            <span className="badge badge-green">Confirmado probable</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ padding: "10px 16px", fontSize: 11, opacity: 0.65, lineHeight: 1.6 }}>
              Agregado: {pred.agregado.asistentes_esperados} asistentes esperados de{" "}
              {pred.agregado.registrados_actuales} inscritos (
              {pred.agregado.pct_asistencia_esperado}%). Los datos por persona son
              estimaciones del modelo y se muestran solo al rol administrador.
            </p>
          </div>
        </>
      )}

      {!esAdmin && pred && (
        <div className="panel" style={{ marginTop: 20, padding: 18 }}>
          <div className="panel-head">
            <div>
              <span>AGREGADO</span>
              <h3>Asistencia esperada del evento</h3>
            </div>
            <span className="badge badge-neutral">{pred.agregado.pct_asistencia_esperado}%</span>
          </div>
          <div className="ml-track" style={{ marginTop: 14 }}>
            <i style={{ width: `${clamp(pred.agregado.pct_asistencia_esperado)}%` }} />
          </div>
          <p style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
            <b>{pred.evento.nombre}</b>: {pred.agregado.asistentes_esperados} asistentes esperados de{" "}
            {pred.agregado.registrados_actuales} inscritos, rango probable{" "}
            {pred.agregado.rango.p10}–{pred.agregado.rango.p90}. El detalle por persona
            está disponible solo para administración.
          </p>
        </div>
      )}
    </>
  )
}
