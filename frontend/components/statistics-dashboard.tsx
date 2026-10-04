"use client"

import { useEffect, useState } from "react"
import type { EventKpis, Statistics } from "@/lib/statistics.types"

const number = (value: number | null | undefined) => (value ?? 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })
const measured = (value: number | null | undefined, suffix = "") => value == null ? "Sin datos" : `${number(value)}${suffix}`

type DashboardIconName = "users" | "check" | "spark" | "chart" | "ticket" | "heart" | "download" | "arrow"

function DashboardIcon({ name }: { name: DashboardIconName }) {
  const paths = {
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></>,
    chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    ticket: <><path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" /><path d="M13 7v11" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Metric({ label, value, hint, icon = "chart", trend }: { label: string; value: string; hint?: string; icon?: DashboardIconName; trend?: number[] }) {
  return <article className="kpi-card">
    <div className="kpi-icon"><DashboardIcon name={icon} /></div>
    <span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}
    {trend?.length ? <div className="sparkline" aria-hidden="true">{trend.slice(-10).map((count, index) => <i key={index} style={{ height: `${count / Math.max(1, ...trend) * 100}%` }} />)}</div> : null}
  </article>
}

export default function StatisticsDashboard({ page = "Vista general", role = "administrador", onPage }: { page?: string; role?: "administrador" | "organizador" | "marketing"; onPage?: (page: string) => void }) {
  const [data, setData] = useState<Statistics | null>(null)
  const [eventId, setEventId] = useState("")
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let pending = false
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return
      pending = true
      try {
        const response = await fetch(`/api/estadisticas${eventId ? `?evento_id=${eventId}` : ""}`, { cache: "no-store", signal: controller.signal })
        const json = await response.json()
        if (disposed) return
        if (!response.ok || !json.ok) throw new Error(json.error ?? "No se pudieron cargar los datos")
        setData(json.data)
        setError(null)
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : "No se pudieron cargar los datos")
      } finally {
        pending = false
        if (!disposed) setLoading(false)
      }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30000)
    const onVisible = () => { if (document.visibilityState === "visible") void refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      disposed = true
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [eventId, revision])

  const selected = data?.selected
  const overview = page === "Vista general" || page === "Resumen ejecutivo" || page === "Power BI" || page === "Insights IA"
  const show = (...pages: string[]) => overview || pages.includes(page)
  const isHome = page === "Vista general" || page === "Resumen ejecutivo"
  const hourlyMax = Math.max(1, ...(data?.hourly.map((hour) => hour.checkins ?? 0) ?? []))
  const peak = data?.hourly.reduce<Statistics["hourly"][number] | null>((best, hour) => !best || (hour.checkins ?? 0) > (best.checkins ?? 0) ? hour : best, null)
  const alerts: { tone: string; title: string; description: string }[] = []
  if (selected) {
    if (selected.participantes_esperados && (selected.asistentes ?? 0) >= selected.participantes_esperados * 0.9) alerts.push({ tone: "red", title: "Asistencia cerca de la meta", description: `${number(selected.asistentes)} de ${number(selected.participantes_esperados)} asistentes previstos` })
    if (!(selected.encuestas_respondidas ?? 0)) alerts.push({ tone: "yellow", title: "Encuestas pendientes", description: "Todavía no hay respuestas para medir la satisfacción." })
    if (!(selected.registrados ?? 0)) alerts.push({ tone: "yellow", title: "Sin inscripciones", description: "El evento todavía no tiene participantes registrados." })
    if ((selected.registrados ?? 0) > 0 && !(selected.asistentes ?? 0)) alerts.push({ tone: "yellow", title: "Sin ingresos registrados", description: "Las inscripciones aún no tienen check-in." })
  }

  function exportData() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `estadisticas-evento-${selected?.evento_id ?? "todos"}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <div className="dashboard-title">
      <div><span>{isHome ? role === "marketing" ? "ANÁLISIS DE CAMPAÑA" : role === "administrador" ? "CONTROL CENTRAL" : "OPERACIÓN EN TIEMPO REAL" : "MEDICIÓN DEL EVENTO"}</span><h1>{isHome ? role === "marketing" ? "Resumen ejecutivo" : role === "administrador" ? "Resumen de la plataforma" : selected?.evento ?? "Vista general" : page}</h1><p>{isHome && role === "organizador" ? [selected?.fecha_inicio ? new Date(selected.fecha_inicio).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" }) : null, selected?.ciudad].filter(Boolean).join(" · ") : selected?.evento ?? "Resultados de tus eventos"}</p></div>
      <div className="title-actions stats-actions">
        <span className={`badge ${error ? "badge-yellow" : "badge-green"}`}><i className="live-dot" />{error ? "SIN ACTUALIZAR" : "AUTOACTUALIZADO"}</span>
        <select aria-label="Seleccionar evento" value={eventId || String(selected?.evento_id ?? "")} disabled={!data?.events.length} onChange={(event) => setEventId(event.target.value)}>
          {!data?.events.length && <option value="">Sin eventos</option>}
          {data?.events.map((event) => <option key={event.evento_id} value={String(event.evento_id)}>{event.evento}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => setRevision((value) => value + 1)} disabled={loading}>Actualizar</button>
        <button className="btn btn-primary" onClick={exportData} disabled={!data}>Exportar <DashboardIcon name="download" /></button>
      </div>
    </div>
    {error && <div className="stats-notice stats-error" role="alert"><p>{error}</p></div>}
    {loading && <p className="stats-notice" role="status">Cargando estadísticas…</p>}
    {data && <p className="stats-updated">Última consulta: {new Date(data.updatedAt).toLocaleTimeString("es-BO")} · Se actualiza cada 30 segundos.</p>}
    {data && !selected && <div className="panel stats-notice">No tienes eventos registrados. Las estadísticas aparecerán al crear eventos y registrar su actividad.</div>}
    {selected && data && <>
      <div className="kpi-grid">
        <Metric label="PARTICIPANTES" value={number(selected.registrados)} hint={`${number(selected.nuevos)} nuevos · ${number(selected.recurrentes)} recurrentes`} icon="users" />
        <Metric label="ASISTENTES" value={number(selected.asistentes)} hint={`${measured(selected.pct_asistencia, "%")} asistencia`} icon="check" trend={data.hourly.map((hour) => hour.checkins ?? 0)} />
        <Metric label="INTERACCIONES" value={number(selected.interacciones_producto)} hint="Interacciones con productos" icon="spark" />
        <Metric label="CONVERSIONES" value={number(selected.conversiones)} hint={`${measured(selected.tasa_conversion, "%")} tasa`} icon="chart" />
        <Metric label="CANJES" value={number(selected.canjes)} hint="Cupones canjeados" icon="ticket" />
        <Metric label="SATISFACCIÓN" value={(selected.encuestas_respondidas ?? 0) > 0 ? measured(selected.satisfaccion) : "—"} hint={(selected.encuestas_respondidas ?? 0) > 0 ? `${number(selected.encuestas_respondidas)} encuestas respondidas` : "Sin encuestas todavía"} icon="heart" />
      </div>
      {isHome && role === "marketing" && <div className="natural-summary"><DashboardIcon name="spark" /><div><strong>Resumen del evento</strong><p>Asistieron <b>{number(selected.asistentes)} personas</b>, se registraron {number(selected.interacciones_producto)} interacciones con productos y <b>{number(selected.conversiones)} conversiones</b>. {data.activities[0] && <>La actividad con mayor participación fue <b>{data.activities[0].actividad}</b>.</>}</p></div>{onPage && <button onClick={() => onPage("Indicadores")}>Ver indicadores <DashboardIcon name="arrow" /></button>}</div>}
      {!isHome && show("Indicadores", "Satisfacción y NPS", "Promociones") && <div className="indicator-grid">
        <Metric label="NPS" value={(selected.encuestas_respondidas ?? 0) > 0 ? measured(selected.nps) : "Sin encuestas"} />
        <Metric label="INGRESOS" value={`Bs ${number(selected.monto_ventas)}`} hint={`${number(selected.ventas_atribuibles)} ventas atribuibles`} />
        <Metric label="RECURRENCIA" value={measured(selected.pct_recurrencia, "%")} hint={`${number(selected.recurrentes)} recurrentes`} />
        <Metric label="PARTICIPACIÓN" value={measured(selected.pct_participacion, "%")} />
        <Metric label="CONSENTIMIENTO" value={number(selected.registros_con_consentimiento)} />
        <Metric label="META DE ASISTENCIA" value={selected.participantes_esperados ? measured(selected.pct_meta_asistentes, "%") : "Sin meta"} hint={selected.participantes_esperados ? `${number(selected.asistentes)} / ${number(selected.participantes_esperados)}` : undefined} />
      </div>}
      <div className="dashboard-grid">
        {show("Indicadores") && <article className="panel chart-panel"><div className="panel-head"><div><span>AFLUENCIA</span><h3>Ingresos por hora</h3></div><div className="legend"><i />Check-ins{peak && (peak.checkins ?? 0) > 0 && <b>Pico: {peak.franja ?? `${peak.hora_del_dia ?? ""}:00`}</b>}</div></div>
          {data.hourly.length ? <div className="chart stats-vertical-chart"><div className="chart-grid">{[0, 1, 2, 3].map((line) => <i key={line} />)}</div><div className="bars">{data.hourly.map((hour, index) => <div key={`${hour.hora}-${index}`}><span style={{ height: `${(hour.checkins ?? 0) / hourlyMax * 85}%`, minHeight: 0 }} data-value={hour.checkins ?? 0} title={`${hour.franja ?? hour.hora}: ${number(hour.checkins)} ingresos`} /><small>{hour.franja ?? (hour.hora_del_dia !== null ? `${hour.hora_del_dia}:00` : hour.hora ?? "Sin hora")}</small></div>)}</div></div> : <div className="stats-chart-empty">Sin ingresos registrados.</div>}
        </article>}
        {isHome && <article className="panel progress-panel"><div className="panel-head"><div><span>OBJETIVOS</span><h3>Progreso del evento</h3></div>{onPage && <button onClick={() => onPage(role === "organizador" ? "Actividades" : "Indicadores")}>Ver detalle</button>}</div>
          {[
            { label: "Meta de asistencia", detail: selected.participantes_esperados ? `${number(selected.asistentes)} / ${number(selected.participantes_esperados)}` : "Sin meta definida", pct: selected.pct_meta_asistentes },
            { label: "Asistencia", detail: `${number(selected.asistentes)} / ${number(selected.registrados)}`, pct: selected.pct_asistencia },
            { label: "Participación", detail: `${number(selected.asistentes_con_actividad)} asistentes activos`, pct: selected.pct_participacion },
            { label: "Conversiones", detail: `${number(selected.conversiones)} · ${measured(selected.tasa_conversion, "%")}`, pct: selected.tasa_conversion },
          ].map((item) => <div className="progress-row" key={item.label}><span>{item.label}<b>{item.detail}</b></span><div><i style={{ width: `${Math.max(0, Math.min(100, item.pct ?? 0))}%` }} /></div></div>)}
        </article>}
        {!isHome && show("Indicadores", "Embudo") && <article className="panel"><div className="panel-head"><div><span>EMBUDO</span><h3>Niveles de interacción</h3></div></div>
          {data.funnel.length ? <div className="funnel stats-funnel">{data.funnel.map((stage) => <div key={stage.nivel} style={{ width: `${Math.max(25, (stage.personas ?? 0) / Math.max(1, ...data.funnel.map((row) => row.personas ?? 0)) * 100)}%` }}><span>{stage.nivel}. {stage.etapa}</span><b>{number(stage.personas)}</b></div>)}</div> : <p>Sin datos del embudo.</p>}
        </article>}
        {!isHome && show("Indicadores") && <article className="panel"><div className="panel-head"><div><span>ACTIVIDADES</span><h3>Mayor participación</h3></div></div>
          {data.activities.length ? <div className="stats-list">{data.activities.map((activity) => <div key={activity.actividad_id}><span><strong>{activity.actividad}</strong><small>{number(activity.participantes_unicos)} personas · {number(activity.participaciones)} participaciones</small></span><b>{number(activity.conversiones)} conversiones</b></div>)}</div> : <p>Sin actividades registradas.</p>}
        </article>}
        {!isHome && show("Productos", "Satisfacción y NPS") && <article className="panel"><div className="panel-head"><div><span>PRODUCTOS</span><h3>Interés por producto</h3></div></div>
          {data.products.length ? <div className="stats-list">{data.products.map((product, index) => <div key={`${product.producto_id}-${index}`}><span><strong>{product.producto}</strong><small>{number(product.interacciones)} interacciones · {number(product.personas_interesadas)} personas interesadas</small></span><b>{measured(product.pct_interes, "%")}</b></div>)}</div> : <p>Sin interacciones con productos.</p>}
        </article>}
        {!isHome && show("Mapa de asistentes", "Segmentación") && <article className="panel"><div className="panel-head"><div><span>AUDIENCIA</span><h3>Asistentes por ciudad</h3></div></div>
          {data.cities.length ? <div className="stats-list">{data.cities.map((city, index) => <div key={`${city.ciudad}-${index}`}><span>{city.ciudad ?? "Sin ciudad"}</span><b>{number(city.asistentes)} · {measured(city.pct, "%")}</b></div>)}</div> : <p>Sin asistentes registrados.</p>}
        </article>}
      </div>
      {isHome && <div className="dashboard-grid lower"><article className="panel"><div className="panel-head"><div><span>ACTIVIDADES</span><h3>Mayor participación</h3></div>{onPage && <button onClick={() => onPage(role === "organizador" ? "Actividades" : "Productos")}>Ver todas</button>}</div>
        {data.activities.length ? <div className="ranking stats-ranking">{data.activities.slice(0, 4).map((activity, index) => <div key={activity.actividad_id}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{activity.actividad}</strong><small>{number(activity.participantes_unicos)} participantes</small></span><div className="stats-ranking-track"><i style={{ width: `${(activity.participantes_unicos ?? 0) / Math.max(1, ...data.activities.map((row) => row.participantes_unicos ?? 0)) * 100}%` }} /></div><em title="Conversiones">{number(activity.conversiones)}</em></div>)}</div> : <p className="stats-panel-empty">Sin actividades registradas.</p>}
      </article><article className="panel alerts"><div className="panel-head"><div><span>ALERTAS</span><h3>Requiere atención</h3></div><span className={`badge ${alerts.length ? "badge-yellow" : "badge-green"}`}>{alerts.length ? `${alerts.length} avisos` : "Sin alertas"}</span></div>
        {alerts.length ? alerts.map((alert) => <div key={alert.title} className={`alert-${alert.tone}`}><i /><span><strong>{alert.title}</strong><small>{alert.description}</small></span></div>) : <p className="stats-panel-empty">No hay avisos pendientes según los registros del evento.</p>}
      </article></div>}
      {!isHome && show("Comparar eventos", "Reporte ejecutivo", "Reportes") && <div className="panel stats-event-table"><h3>Eventos disponibles</h3><table><thead><tr><th>Evento</th><th>Estado</th><th>Registros</th><th>Asistentes</th><th>Conversiones</th></tr></thead><tbody>{data.events.map((event: EventKpis) => <tr key={event.evento_id}><td>{event.evento}</td><td>{event.estado}</td><td>{number(event.registrados)}</td><td>{number(event.asistentes)}</td><td>{number(event.conversiones)}</td></tr>)}</tbody></table></div>}
      {page === "Power BI" && <p className="stats-notice">Estos resultados provienen de la base de datos. La integración externa con Power BI todavía no está configurada.</p>}
      {page === "Insights IA" && <p className="stats-notice">Mostramos las métricas registradas. El análisis con IA todavía no está configurado.</p>}
    </>}
  </>
}
