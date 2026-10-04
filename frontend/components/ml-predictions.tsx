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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <div className="kpi-grid">
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
              <strong>{m2?.metricas.auc != null ? m2.metricas.auc : "—"}</strong>
              <small>ROC-AUC sobre {m2?.n_filas ?? 0} inscripciones · Brier {m2?.metricas.brier ?? "—"}</small>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>PRÓXIMO EVENTO · {fmtFecha(pr.fecha)}</span>
                  <h3>Factores que mueven la predicción</h3>
                </div>
              </div>
              <div className="alert-list" style={{ display: "grid", gap: 10 }}>
                {pr.factores.map((f) => (
                  <div key={f} className="alert-green" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <i />
                    <span>
                      <strong style={{ display: "block", fontSize: 14 }}>{f}</strong>
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>{pr.advertencia}</p>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>MOTOR ML · ESTADO</span>
                  <h3>Modelos y calidad de datos</h3>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>MODELO</th>
                      <th>ALGORITMO</th>
                      <th>ESTADO</th>
                      <th>FILAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ov?.modelos ?? []).map((m) => (
                      <tr key={m.tipo}>
                        <td>{m.tipo}</td>
                        <td style={{ fontSize: 12 }}>{m.algoritmo}</td>
                        <td>
                          <span className={`badge ${m.estado === "activo" ? "badge-green" : "badge-yellow"}`}>
                            {m.estado}
                          </span>
                        </td>
                        <td>{m.n_filas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                Calidad: {ov?.calidad.logs_sin_checkin ?? 0} actividad sin check-in ·{" "}
                {ov?.calidad.calificaciones_fuera_rango ?? 0} calificaciones fuera de rango (excluidas del
                entrenamiento).
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
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {segmentos.map((s) => (
          <article className="panel" key={s.codigo} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{s.nombre}</strong>
              <span className="badge badge-red">{s.n_usuarios} clientes</span>
            </div>
            <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>{s.descripcion}</p>
            <div style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 13 }}>
              <span>
                🥤 Sabor preferido: <b>{s.sabor_preferido ?? "—"}</b>
              </span>
              <span>
                🏆 Producto estrella: <b>{s.producto_preferido ?? "—"}</b>
              </span>
              <span>
                📊 Asistencia <b>{s.tasa_asistencia}%</b> · participación <b>{s.tasa_participacion}%</b>
              </span>
              <span>
                🎟️ Canje <b>{s.tasa_canje}%</b> · satisfacción <b>{s.satisfaccion_promedio ?? "—"}</b>
              </span>
              <span>
                📍 {s.ciudad_principal ?? "—"} · edad {s.rango_edad_frecuente ?? "—"}
              </span>
            </div>
            {s.productos_top.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {s.productos_top.map((p) => (
                  <span key={p.producto} className="badge badge-neutral">
                    {p.producto} · {p.afinidad}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
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
                  {pred.predicciones.map((p) => (
                    <tr key={p.usuario_id}>
                      <td>
                        {p.etiqueta} <span style={{ opacity: 0.5 }}>#{p.usuario_id}</span>
                      </td>
                      <td>
                        <b>{Math.round(p.prob_asistencia * 100)}%</b>
                      </td>
                      <td style={{ fontSize: 12 }}>{p.factores.join(" · ") || "—"}</td>
                      <td>
                        {p.recomendado ? (
                          <span className="badge badge-yellow">Recordatorio WhatsApp</span>
                        ) : (
                          <span className="badge badge-green">Confirmado probable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ padding: "10px 16px", fontSize: 12, opacity: 0.65 }}>
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
          <strong>Asistencia esperada de tu evento (agregado)</strong>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            {pred.evento.nombre}: <b>{pred.agregado.asistentes_esperados}</b> asistentes
            esperados ({pred.agregado.pct_asistencia_esperado}%), rango{" "}
            {pred.agregado.rango.p10}–{pred.agregado.rango.p90}. El detalle por persona
            está disponible solo para administración.
          </p>
        </div>
      )}
    </>
  )
}
