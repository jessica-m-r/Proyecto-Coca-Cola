"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import QRCode from "qrcode"
import { BarPlot, Donut, EfficiencyChart, ExperienceRadar, GoalPulse, ProductComparison, TrafficChart } from "./intelligence-charts"
import { applyOperation, createDemoStore, eventMetrics, percent, planScenario, registerParticipant, STORAGE_KEY, type DemoStore, type EventPlan, type Operation, type Participant, type StaffRole } from "@/lib/event-intelligence"
import type { Statistics } from "@/lib/statistics.types"

const Scanner = dynamic(() => import("./qr-scanner-modal"), { ssr: false })
const colors = ["#fb4b65", "#a78bfa", "#2dd4bf", "#38bdf8", "#fbbf24"]
const fmt = (n: number) => n.toLocaleString("es-BO", { maximumFractionDigits: 1 })
const money = (n: number) => `Bs ${n.toLocaleString("es-BO", { maximumFractionDigits: 2 })}`
const date = (value: string) => new Date(value).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/La_Paz" })
const time = (value: string) => new Date(value).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" })
const stamp = () => new Date().toISOString()
const uid = () => crypto.randomUUID()
const CONTEXT_KEY = "cce-workspace-context"

function Glyph({ name = "spark" }: { name?: "spark" | "arrow" | "qr" | "people" | "chart" | "box" | "check" }) {
  const paths = {
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /><path d="M20 2v4m-2-2h4" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    qr: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><path d="M15 15h3v3h3v3h-6v-3" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 6" /></>,
    chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-8" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9" /></>,
    check: <path d="m4 12 5 5L20 6" />,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
function Card({ title, eyebrow, children, wide = false, action }: { title: string; eyebrow?: string; children: React.ReactNode; wide?: boolean; action?: React.ReactNode }) {
  return <section className={`intel-card ${wide ? "intel-wide" : ""}`}><div className="intel-card-head"><div>{eyebrow && <span className="intel-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>
}
function Metric({ label, value, detail, accent = "rose", icon = "chart" }: { label: string; value: string; detail: string; accent?: string; icon?: "chart" | "people" | "box" | "check" }) {
  return <article className={`intel-metric accent-${accent}`}><div className="intel-metric-top"><span>{label}</span><Glyph name={icon} /></div><strong>{value}</strong><p>{detail}</p></article>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="intel-field"><span>{label}</span>{children}</label> }
function Empty({ children }: { children: React.ReactNode }) { return <div className="intel-empty">{children}</div> }
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="intel-table-wrap"><table className="intel-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>{!rows.length && <Empty>Los resultados aparecerán al registrar actividad.</Empty>}</div>
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escaped = rows.map(row => row.map(value => {
    let text = String(value)
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob(["\uFEFF", escaped], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}
function parseQr(text: string) {
  try { const decoded = JSON.parse(text); return typeof decoded.token === "string" ? decoded.token : text } catch { return text }
}

export default function IntelligenceWorkspace({ role, page, onPage, renderManagement }: { role: StaffRole; page: string; onPage: (page: string) => void; renderManagement: (page: string) => React.ReactNode }) {
  const [store, setStore] = useState<DemoStore>(() => createDemoStore())
  const [ready, setReady] = useState(false)
  const [eventId, setEventId] = useState("experience")
  const [source, setSource] = useState<"demo" | "database">("demo")
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [ticket, setTicket] = useState<Participant | null>(null)
  const [resource, setResource] = useState("Productos")
  useEffect(() => {
    let events = createDemoStore().events
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.version === 1 && ["events", "products", "participants", "touches", "samples", "surveys", "coupons", "sales", "followups", "incidents"].every(key => Array.isArray(data[key])) && data.events.some((e: EventPlan) => e.id === "experience")) { setStore(data); events = data.events }
        else setNotice({ text: "Los datos locales no eran compatibles. Se abrió una demostración nueva.", error: true })
      }
    } catch { setNotice({ text: "No se pudo recuperar la demostración guardada. Se abrió una nueva.", error: true }) }
    try {
      const context = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || "null")
      if (events.some(e => e.id === context?.eventId)) setEventId(context.eventId)
      if (context?.source === "demo" || context?.source === "database") setSource(context.source)
    } catch { /* Navigation remains usable when session storage is unavailable. */ }
    setReady(true)
    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try { const data = JSON.parse(e.newValue); if (data.version === 1 && Array.isArray(data.events) && Array.isArray(data.participants)) setStore(data) } catch { /* Keep the last valid local state. */ }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) }
    catch { setNotice({ text: "No se pudo guardar en este navegador. Los cambios solo durarán esta sesión.", error: true }) }
  }, [store, ready])
  useEffect(() => {
    if (!ready) return
    try { sessionStorage.setItem(CONTEXT_KEY, JSON.stringify({ eventId, source })) }
    catch { /* Remembering navigation is optional. */ }
  }, [eventId, source, ready])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6500)
    return () => clearTimeout(timer)
  }, [notice])
  const m = useMemo(() => eventMetrics(store, eventId), [store, eventId])
  const notify = useCallback((text: string, error = false) => setNotice({ text, error }), [])
  const operate = (action: Operation) => {
    try { const next = applyOperation(store, action, uid(), stamp()); setStore(next); notify("Registro guardado. Los indicadores y el inventario se actualizaron."); return true }
    catch (e) { notify(e instanceof Error ? e.message : "No se pudo registrar la acción.", true); return false }
  }
  const register = (data: Omit<Participant, "id" | "token" | "registered" | "entered" | "exited">) => {
    try {
      const next = registerParticipant(store, data, uid(), `CCE-${uid()}`, stamp())
      setStore(next.store); setTicket(next.participant); notify("Inscripción creada. La entrada QR está lista."); return true
    } catch (e) { notify(e instanceof Error ? e.message : "No se pudo inscribir.", true); return false }
  }
  const isOverview = page === "Centro de decisiones" || page === "Mi operación"
  const title = isOverview ? role === "organizador" ? "Tu evento, bajo control." : role === "marketing" ? "Experiencias que dejan resultados." : "Cada inversión, una mejor decisión." : page === "Planificar con IA" ? "Diseña el próximo resultado." : page
  const subtitle = isOverview ? role === "organizador" ? "Ingresos, estaciones y pendientes en un solo lugar." : "Conecta participación, productos y resultados para decidir el próximo paso." : page === "Operación" ? "Un recorrido completo: inscripción, ingreso, experiencia y seguimiento." : page === "Resultados" ? "Personas únicas, acciones verificadas y evidencia para comparar." : page === "Eventos" ? "Define el objetivo y prepara los recursos antes de comenzar." : "Convierte tu historial en cantidades y escenarios concretos."
  const exportReport = () => downloadCsv(`reporte-${m.event.id}-simulado.csv`, [
    ["Coca-Cola Event Intelligence", "DATOS SIMULADOS"], ["Evento", m.event.name], ["Objetivo", m.event.objective], ["Indicador", "Valor"],
    ["Inscritos", m.people.length], ["Asistentes únicos", m.attendees.length], ["Asistencia %", m.attendanceRate], ["Asistentes nuevos", m.newPeople], ["Asistentes recurrentes", m.recurrent], ["Muestras entregadas", m.samples.length], ["Participación %", m.participationRate], ["Consentimientos", m.consent], ["Compradores únicos", m.buyers], ["Conversión a compra %", m.conversionRate], ["Beneficios canjeados", m.redeemed], ["Satisfacción /5", m.satisfaction ?? "Sin respuestas"], ["NPS", m.nps ?? "Sin respuestas"], ["Encuestas", m.surveys.length],
    ...(role === "organizador" ? [] : [["Presupuesto Bs", m.event.budget], ["Gasto real simulado Bs", m.spend], ["Ventas vinculadas Bs", m.revenue], ["Contribución antes del evento Bs", m.contribution], ["Contribución neta atribuida Bs", m.netContribution], ["Costo por comprador Bs", m.costPerBuyer ?? "Sin compras"]] as (string | number)[][]),
    ["Nota", "Ventas vinculadas al evento; no demuestra incremento causal. Costos y precios de ejemplo."], ["Producto", "Muestras", "Intención de compra", "Compradores", "Inventario disponible"], ...m.productRows.map(p => [p.name, p.samples, p.interested, p.buyers, p.remaining]),
  ])
  return <div className="intelligence-workspace">
    <div className="intel-title"><div><span className="intel-eyebrow">EVENT INTELLIGENCE / {role === "organizador" ? "OPERACIÓN" : role === "marketing" ? "MARKETING" : "DIRECCIÓN"}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="intel-orbit" aria-hidden="true"><Glyph /><i /><i /></div></div>
    <div className="intel-context no-print"><div className="intel-source" role="group" aria-label="Origen de datos"><button className={source === "demo" ? "active" : ""} onClick={() => setSource("demo")}>Demostración</button><button className={source === "database" ? "active" : ""} onClick={() => setSource("database")}>Base de datos</button></div>{source === "demo" && <Field label="Evento de trabajo"><select value={eventId} onChange={e => setEventId(e.target.value)}>{store.events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>}<span className={`intel-status ${source === "demo" ? "demo" : "live"}`}><i />{source === "demo" ? "DATOS SIMULADOS" : "CONSULTA DE DATOS"}</span></div>
    {source === "demo" && <p className="intel-disclosure">Entorno de prueba · Datos de ejemplo y cambios guardados en este navegador. No modifica Supabase ni envía mensajes.</p>}
    {notice && <div className={`intel-toast ${notice.error ? "error" : ""}`} role={notice.error ? "alert" : "status"}>{notice.text}<button aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button></div>}
    {source === "database" ? page === "Planificar con IA" ? <DatabasePlanner /> : page === "Recursos" ? <><div className="intel-resource-select"><Field label="Administrar"><select value={resource} onChange={e => setResource(e.target.value)}>{["Productos", "Campañas", "Usuarios y roles"].map(x => <option key={x}>{x}</option>)}</select></Field></div>{renderManagement(resource)}</> : page === "Eventos" ? renderManagement(role === "organizador" ? "Mis eventos" : "Eventos") : page === "Operación" ? <Card title="Operación de prueba disponible en demostración"><p>La captura de este nuevo recorrido funciona en el entorno de prueba local. La base de datos se consulta para indicadores y predicciones; estas acciones todavía no escriben registros operativos en Supabase.</p><button className="intel-button primary" onClick={() => setSource("demo")}>Abrir operación de prueba <Glyph name="arrow" /></button></Card> : <LiveResults role={role} compact={isOverview} onPage={onPage} /> : <>
      {!isOverview && <div className="intel-event-line"><div><span className={`intel-pill ${m.event.status}`}>{m.event.status === "en_curso" ? "En curso" : m.event.status === "cerrado" ? "Finalizado" : "Planificado"}</span><span>{date(m.event.date)} · {m.event.city} · {m.event.place}</span></div><span>Responsable: {m.event.owner}</span></div>}
      {isOverview && <>
        <DecisionPulse metrics={m} role={role} onPage={onPage} />
        <div className="intel-metrics">
          {role === "organizador" ? <>
            <Metric label="Personas en el evento" value={fmt(m.attendees.filter(p => !p.exited).length)} detail={`${m.attendees.length} ingresos · capacidad ${m.event.capacity}`} icon="people" />
            <Metric label="Asistencia efectiva" value={`${fmt(m.attendanceRate)}%`} detail={`${m.attendees.length} de ${m.people.length} inscritos`} accent="violet" icon="check" />
            <Metric label="Muestras entregadas" value={fmt(m.samples.length)} detail={`${new Set(m.samples.map(x => x.participantId)).size} personas únicas`} accent="mint" icon="box" />
            <Metric label="Pendientes de encuesta" value={fmt(m.attendees.length - m.surveys.length)} detail={`${m.surveys.length} respuestas registradas`} accent="blue" />
          </> : <>
            <Metric label={role === "marketing" ? "Compradores verificados" : "Inversión utilizada"} value={role === "marketing" ? fmt(m.buyers) : money(m.spend)} detail={role === "marketing" ? `${fmt(m.conversionRate)}% de asistentes` : `${fmt(percent(m.spend, m.event.budget))}% del presupuesto`} />
            <Metric label="Costo por resultado" value={m.goalValue ? money(m.spend / m.goalValue) : "Sin resultados"} detail={m.event.objective} accent="violet" />
            <Metric label="Asistentes únicos" value={fmt(m.attendees.length)} detail={`${m.newPeople} nuevos · ${m.recurrent} recurrentes`} accent="mint" icon="people" />
            <Metric label="Satisfacción" value={m.satisfaction == null ? "Sin respuestas" : `${fmt(m.satisfaction)} / 5`} detail={`${m.surveys.length} encuestas · NPS ${m.nps ?? "—"}`} accent="blue" />
          </>}
        </div>
        <div className="intel-grid"><Card title={role === "organizador" ? "Ingresos por hora" : "De la experiencia al resultado"} eyebrow="PULSO DEL EVENTO" action={<span className="intel-pill subtle">{role === "organizador" ? "Hora Bolivia" : "Personas únicas"}</span>}>{role === "organizador" ? <TrafficChart data={m.hourly} /> : <Journey registered={m.people.length} attended={m.attendees.length} active={m.activityPeople} sampled={new Set(m.samples.map(x => x.participantId)).size} buyers={m.buyers} />}</Card>
          <Card title="El siguiente paso" eyebrow="RECOMENDACIONES" ><Recommendations store={store} eventId={eventId} role={role} onPlan={() => onPage("Planificar con IA")} onOperate={() => onPage("Operación")} /></Card>
          <Card title="Objetivos del evento" eyebrow={m.event.objective}><Progress label="Asistencia prevista" value={m.attendees.length} target={m.event.target} /><Progress label={m.event.objective} value={m.goalValue} target={m.event.conversionGoal} /><Progress label="Encuestas de asistentes" value={m.surveys.length} target={m.attendees.length} /><p className="intel-footnote">Las metas comerciales y la capacidad física se controlan por separado.</p></Card>
          <Card title={role === "organizador" ? "Inventario y estaciones" : "Productos que despiertan interés"} eyebrow="EXPERIENCIA DE PRODUCTO">{m.productRows.map(p => <div className="intel-product-row" key={p.id}><span className="intel-product-dot" style={{ background: p.color }} /><div><strong>{p.name}</strong><small>{role === "organizador" ? `${p.remaining} unidades disponibles · ${p.samples} muestras` : `${p.interested} con intención de compra · ${p.buyers} compradores`}</small></div><b>{role === "organizador" ? p.remaining : p.rating == null ? "—" : `${fmt(p.rating)} ★`}</b></div>)}<button className="intel-text-button" onClick={() => onPage(role === "organizador" ? "Operación" : "Resultados")}>Ver detalle <Glyph name="arrow" /></button></Card>
        </div>
        <div className="intel-launch"><div><Glyph name={role === "organizador" ? "qr" : "spark"} /><div><h2>{role === "organizador" ? "Cada registro mejora el resultado." : "Prepara el próximo evento con evidencia."}</h2><p>{role === "organizador" ? "Escanea una entrada, registra una muestra o resuelve un pendiente." : "Compara escenarios y calcula muestras, equipo y costo por resultado."}</p></div></div><button className="intel-button primary" onClick={() => onPage(role === "organizador" ? "Operación" : "Planificar con IA")}>{role === "organizador" ? "Abrir operación" : "Planificar con IA"}<Glyph name="arrow" /></button></div>
      </>}
      {page === "Eventos" && <><div className="intel-section-line"><h2>Portafolio de experiencias</h2>{role !== "marketing" && <button className="intel-button primary" onClick={() => setCreateOpen(true)}>+ Crear evento</button>}</div><div className="intel-event-grid">{store.events.map(e => { const k = eventMetrics(store, e.id); return <article className={`intel-event-card ${e.id === eventId ? "selected" : ""}`} key={e.id}><span className="intel-eyebrow">{e.type}</span><h2>{e.name}</h2><p>{date(e.date)} · {e.city}</p><span className={`intel-pill ${e.status}`}>{e.status === "en_curso" ? "En curso" : e.status === "cerrado" ? "Finalizado" : "Planificado"}</span><div className="intel-event-numbers"><div><strong>{k.attendees.length}</strong><span>Asistentes</span></div><div><strong>{k.buyers}</strong><span>Compradores</span></div><div><strong>{fmt(k.conversionRate)}%</strong><span>Conversión</span></div></div><p className="intel-footnote">{e.objective} · Meta: {e.conversionGoal}<br />Campaña: {e.campaign}<br />Aliado: {e.partner}</p><button className="intel-button secondary" onClick={() => { setEventId(e.id); onPage(role === "organizador" ? "Operación" : "Resultados") }}>Abrir evento <Glyph name="arrow" /></button></article> })}</div>{role !== "marketing" && <EventSettings event={m.event} onSave={event => { setStore({ ...store, events: store.events.map(e => e.id === event.id ? event : e) }); notify("Plan del evento actualizado.") }} />}</>}
      {page === "Operación" && <Operations store={store} eventId={eventId} operate={operate} register={register} showTicket={setTicket} notify={notify} onReplenish={(productId, quantity) => { if (!Number.isSafeInteger(quantity) || quantity < 1) { notify("La reposición debe ser una cantidad entera positiva.", true); return }; setStore({ ...store, events: store.events.map(e => e.id === eventId ? { ...e, products: e.products.map(p => p.id === productId ? { ...p, stock: p.stock + quantity } : p) } : e) }); notify("Reposición registrada en el inventario de prueba.") }} onIncident={note => { setStore({ ...store, incidents: [...store.incidents, { id: uid(), eventId, note, at: stamp(), resolved: false }] }); notify("Observación registrada para el responsable.") }} onResolve={id => setStore({ ...store, incidents: store.incidents.map(i => i.id === id ? { ...i, resolved: true } : i) })} />}
      {page === "Resultados" && <><div className="intel-section-line"><div><h2>Informe de resultados</h2><p>{m.event.name} · Simulación · {m.event.objective}</p></div><div className="intel-actions no-print"><button className="intel-button secondary" onClick={exportReport}>Descargar CSV</button><button className="intel-button primary" onClick={() => window.print()}>Imprimir / PDF</button></div></div><DemoResults store={store} eventId={eventId} role={role} /></>}
      {page === "Planificar con IA" && <ScenarioPlanner store={store} role={role} onCreate={() => setCreateOpen(true)} />}
      {page === "Recursos" && <Card title="Catálogo y equipo"><p>Los productos, campañas y usuarios se administran en la base de datos. Las referencias de esta demostración son ficticias y están aisladas.</p><button className="intel-button primary" onClick={() => setSource("database")}>Abrir administración de recursos <Glyph name="arrow" /></button></Card>}
    </>}
    {createOpen && <EventModal products={store.products.map(p => p.id)} onClose={() => setCreateOpen(false)} onCreate={event => { setStore({ ...store, events: [...store.events, event] }); setEventId(event.id); setCreateOpen(false); notify("Evento creado en la demostración. Puedes registrar participantes.") }} />}
    {ticket && <Ticket participant={ticket} event={store.events.find(e => e.id === ticket.eventId)!} onClose={() => setTicket(null)} />}
  </div>
}

function DecisionPulse({ metrics: m, role, onPage }: { metrics: ReturnType<typeof eventMetrics>; role: StaffRole; onPage: (page: string) => void }) {
  const operational = role === "organizador"
  const value = operational ? m.attendees.length : m.goalValue
  const target = operational ? m.event.target : m.event.conversionGoal
  const missing = Math.max(0, target - value)
  const buyers = new Set(m.sales.map(s => s.participantId))
  const followupAudience = m.attendees.filter(p => p.consent && !buyers.has(p.id)).length
  const lowStock = m.productRows.filter(p => p.remaining < 20).length
  const budgetLeft = m.event.budget - m.spend
  return <section className={`decision-pulse ${operational ? "is-operational" : ""}`} aria-label="Avance y próxima decisión">
    <div className="decision-pulse-grid" aria-hidden="true" />
    <div className="decision-pulse-copy">
      <div className="decision-pulse-kicker"><span className={`intel-pill ${m.event.status}`}>{m.event.status === "en_curso" ? "Evento en curso" : m.event.status === "cerrado" ? "Evento finalizado" : "Evento planificado"}</span><span>{date(m.event.date)} · {m.event.city}</span></div>
      <h2>{m.event.name}</h2>
      <p>{target === 0 ? "Define una meta para evaluar el progreso del evento." : missing > 0 ? <>Faltan <strong>{missing} {operational ? "asistentes" : "resultados"}</strong> para alcanzar la meta. {operational ? "Coordina el acceso y las experiencias del equipo." : "Usa la evidencia para elegir el siguiente paso."}</> : <>Meta alcanzada. <strong>{value} {operational ? "asistentes" : "resultados"}</strong> registrados para este objetivo.</>}</p>
      <div className="decision-pulse-signal"><i />{operational ? <><strong>{lowStock}</strong> productos con menos de 20 unidades disponibles</> : role === "marketing" ? <><strong>{followupAudience}</strong> asistentes autorizados para seguimiento, sin compra registrada</> : <><strong>{money(Math.abs(budgetLeft))}</strong> {budgetLeft < 0 ? "por encima del presupuesto" : "disponibles del presupuesto"}</>}</div>
      <div className="decision-pulse-actions"><button className="intel-button primary" onClick={() => onPage(operational ? "Operación" : "Planificar con IA")}>{operational ? "Abrir operación QR" : "Planificar el próximo evento"}<Glyph name={operational ? "qr" : "arrow"} /></button><button className="intel-text-button" onClick={() => onPage("Resultados")}>Explorar resultados <Glyph name="arrow" /></button></div>
    </div>
    <div className="decision-pulse-target"><GoalPulse value={value} target={target} label={operational ? "Meta de asistencia" : m.event.objective} caption="AVANCE DE LA META" /><span>{operational ? "Asistencia prevista" : m.event.objective}</span><small>Responsable: {m.event.owner}</small></div>
  </section>
}

function Progress({ label, value, target }: { label: string; value: number; target: number }) {
  return <div className="intel-progress"><div><span>{label}</span><strong>{value} / {target || "Sin meta"}</strong></div><div className="intel-track"><i style={{ width: `${Math.min(100, percent(value, target))}%` }} /></div></div>
}
function Journey({ registered, attended, active, sampled, buyers }: { registered: number; attended: number; active: number; sampled: number; buyers: number }) {
  const rows = [{ name: "Inscritos", value: registered }, { name: "Asistieron", value: attended }, { name: "En actividades", value: active }, { name: "Probaron producto", value: sampled }, { name: "Compraron", value: buyers }]
  return <div className="intel-journey">{rows.map((r, i) => <div key={r.name}><div><span><i style={{ background: colors[i] }}>{i + 1}</i>{r.name}</span><strong>{fmt(r.value)}</strong></div><div className="intel-journey-track"><i style={{ width: `${percent(r.value, registered)}%`, background: `linear-gradient(90deg, ${colors[i]}99, ${colors[i]})` }} /></div></div>)}<p className="intel-footnote">Cobertura por acción. Las categorías pueden superponerse; una compra no requiere haber probado una muestra.</p></div>
}
function Recommendations({ store, eventId, role, onPlan, onOperate }: { store: DemoStore; eventId: string; role: StaffRole; onPlan: () => void; onOperate: () => void }) {
  const m = eventMetrics(store, eventId)
  const lowStock = m.productRows.filter(p => p.remaining < 20)
  const top = [...m.productRows].sort((a, b) => b.interested - a.interested)[0]
  const suggestions = role === "organizador" ? [
    { title: lowStock.length ? "Reponer inventario" : "Preparar el próximo pico", text: lowStock.length ? `${lowStock.map(p => p.name).join(", ")}: menos de 20 unidades disponibles.` : "Revisa los ingresos por hora y prepara el equipo antes de la mayor afluencia.", action: onOperate },
    { title: "Completar la medición", text: `${m.attendees.length - m.surveys.length} asistentes sin encuesta. Pide una respuesta al terminar la experiencia.`, action: onOperate },
  ] : [
    { title: top?.interested ? `Priorizar ${top.name}` : "Recoger preferencias de producto", text: top?.interested ? `${top.interested} personas expresaron intención de compra. Contrasta con sus ${top.buyers} compradores antes de aumentar muestras.` : "Registra degustaciones y compras para fundamentar una recomendación.", action: onPlan },
    { title: m.netContribution < 0 ? "Revisar el costo de la activación" : "Comparar antes de escalar", text: `${money(m.spend)} de gasto y ${m.buyers} compradores vinculados. ${m.costPerBuyer == null ? "Todavía no hay compras verificadas." : `Costo por comprador: ${money(m.costPerBuyer)}.`}`, action: onPlan },
  ]
  return <div className="intel-recommendations">{suggestions.map((r, i) => <article key={r.title}><span className="intel-recommendation-number">0{i + 1}</span><div><h3>{r.title}</h3><p>{r.text}</p><button className="intel-text-button" onClick={r.action}>{role === "organizador" ? "Resolver en operación" : "Evaluar escenario"} <Glyph name="arrow" /></button></div></article>)}<p className="intel-footnote">Recomendaciones por reglas sobre el historial simulado. No son una garantía de venta.</p></div>
}

function DemoResults({ store, eventId, role }: { store: DemoStore; eventId: string; role: StaffRole }) {
  const m = eventMetrics(store, eventId)
  return <>
    <div className="intel-metrics"><Metric label="Inscritos" value={fmt(m.people.length)} detail={`${fmt(m.attendanceRate)}% asistieron`} icon="people" /><Metric label="Participación" value={`${fmt(m.participationRate)}%`} detail={`${m.activityPeople} asistentes en actividades`} accent="violet" /><Metric label="Compradores únicos" value={fmt(m.buyers)} detail={`${fmt(m.conversionRate)}% de asistentes`} accent="mint" /><Metric label="Beneficios canjeados" value={fmt(m.redeemed)} detail={`${m.coupons.length} beneficios emitidos`} accent="blue" /></div>
    <div className="intel-grid"><Card title="Recorrido del participante" eyebrow="COBERTURA"><Journey registered={m.people.length} attended={m.attendees.length} active={m.activityPeople} sampled={new Set(m.samples.map(x => x.participantId)).size} buyers={m.buyers} /></Card><Card title="Ingresos por hora" eyebrow="OPERACIÓN"><TrafficChart data={m.hourly} /><p className="intel-footnote">Permanencia media: {m.stayMinutes == null ? "Sin salidas registradas" : `${m.stayMinutes} minutos`}.</p></Card>
      <Card title="Interés frente a compra" eyebrow="PRODUCTOS"><ProductComparison data={m.productRows} /><p className="intel-footnote">Intención declarada y compras verificadas son indicadores diferentes.</p></Card>
      <Card title="Actividades con mayor participación" eyebrow="EXPERIENCIAS"><BarPlot data={m.activities.map(a => ({ name: a.name, people: a.people }))} dataKey="people" name="Personas únicas" horizontal /></Card>
      <Card title="Nuevos y recurrentes" eyebrow="FIDELIZACIÓN"><Donut data={[{ name: "Primera asistencia", value: m.newPeople }, { name: "Asistieron anteriormente", value: m.recurrent }]} label="Recurrencia" /><p className="intel-footnote">Recurrencia: {fmt(percent(m.recurrent, m.attendees.length))}%. Se calcula con asistencias anteriores por celular.</p></Card>
      <Card title="Origen de las inscripciones" eyebrow="ATRIBUCIÓN"><Donut data={m.sources} label="Fuente de registro" /></Card>
      <Card title="Ciudades de procedencia" eyebrow="AUDIENCIA"><BarPlot data={m.cities.map(c => ({ name: c.name, value: c.value }))} dataKey="value" name="Asistentes" color="#38bdf8" horizontal /></Card>
      <Card title="Rangos de edad" eyebrow="AUDIENCIA"><BarPlot data={m.ages.map(c => ({ name: c.name, value: c.value }))} dataKey="value" name="Asistentes" color="#2dd4bf" /></Card>
      <Card title="La experiencia, evaluada" eyebrow={`${m.surveys.length} RESPUESTAS`}><ExperienceRadar responses={m.surveys.length} nps={m.nps} data={[{ name: "Organización", key: "organization" }, { name: "Atención", key: "service" }, { name: "Dinámicas", key: "experiences" }, { name: "Productos", key: "products" }, { name: "General", key: "general" }].map(c => ({ name: c.name, value: m.surveys.length ? Number((m.surveys.reduce((a, s) => a + s[c.key as "organization"], 0) / m.surveys.length).toFixed(1)) : 0 }))} /><p className="intel-footnote">Cobertura de encuesta: {fmt(percent(m.surveys.length, m.attendees.length))}% de asistentes.</p></Card>
      <Card title="Después del evento" eyebrow="SEGUIMIENTO"><div className="intel-summary-numbers"><div><strong>{m.consent}</strong><span>Autorizaron comunicaciones</span></div><div><strong>{m.followups.length}</strong><span>Acciones registradas</span></div><div><strong>{new Set(m.postSales.map(s => s.participantId)).size}</strong><span>Compradores posteriores</span></div></div><p className="intel-footnote">Las acciones son registros de seguimiento simulado. No se envía WhatsApp ni correo. Las compras posteriores se distinguen por fecha de cierre.</p></Card>
      {role !== "organizador" && <Card title="Economía de la activación" eyebrow="VENTAS VINCULADAS, SIN ATRIBUCIÓN CAUSAL" wide><div className="intel-economics"><div><span>Presupuesto</span><strong>{money(m.event.budget)}</strong></div><div><span>Gasto + muestras</span><strong>{money(m.spend)}</strong></div><div><span>Ventas vinculadas</span><strong>{money(m.revenue)}</strong></div><div><span>Contribución neta atribuida</span><strong className={m.netContribution < 0 ? "intel-negative" : "intel-positive"}>{money(m.netContribution)}</strong></div></div><p className="intel-footnote">Contribución neta = ventas − costo de productos vendidos − gasto operativo − costo de muestras. Precios y costos simulados. No mide ventas incrementales ni beneficios de marca a largo plazo.</p></Card>}
      {role !== "organizador" && <Card title="Dónde rinde mejor la inversión" eyebrow="COSTO FRENTE A CONVERSIÓN" wide><EfficiencyChart data={store.events.map(e => eventMetrics(store, e.id)).filter(k => k.costPerBuyer !== null).map(k => ({ name: k.event.name, cost: Number(k.costPerBuyer!.toFixed(2)), conversion: k.conversionRate, attendees: k.attendees.length }))} /></Card>}
      <Card title="Comparación entre eventos" eyebrow="DECIDIR QUÉ REPETIR" wide><Table headers={["Evento", "Asistentes", "Compradores", "Conversión", ...(role === "organizador" ? [] : ["Costo / comprador"]), "Satisfacción"]} rows={store.events.map(e => { const k = eventMetrics(store, e.id); return [e.name, k.attendees.length, k.buyers, `${fmt(k.conversionRate)}%`, ...(role === "organizador" ? [] : [k.costPerBuyer == null ? "Sin compras" : money(k.costPerBuyer)]), k.satisfaction == null ? "Sin respuestas" : `${fmt(k.satisfaction)} / 5`] })} /><p className="intel-footnote">Compara eventos de objetivos y contextos similares. Un mayor volumen de asistentes no demuestra mayor eficiencia.</p></Card>
    </div>
  </>
}

function Operations({ store, eventId, operate, register, showTicket, notify, onIncident, onResolve, onReplenish }: { store: DemoStore; eventId: string; operate: (action: Operation) => boolean; register: (data: Omit<Participant, "id" | "token" | "registered" | "entered" | "exited">) => boolean; showTicket: (p: Participant) => void; notify: (text: string, error?: boolean) => void; onIncident: (note: string) => void; onResolve: (id: string) => void; onReplenish: (productId: string, quantity: number) => void }) {
  const m = eventMetrics(store, eventId)
  const [scanner, setScanner] = useState(false), [registerOpen, setRegisterOpen] = useState(false), [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(""), [action, setAction] = useState("sample")
  const [token, setToken] = useState(""), [filter, setFilter] = useState("all")
  const selected = m.people.find(p => p.id === selectedId)
  const visible = m.people.filter(p => `${p.name} ${p.phone}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || filter === "pending" && !p.entered || filter === "entered" && p.entered)).slice(0, 40)
  useEffect(() => { setSelectedId(""); setToken(""); setQuery("") }, [eventId])
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) { notify("Selecciona una persona para registrar la acción.", true); return }
    const fd = new FormData(e.currentTarget), participantId = selected.id
    let op: Operation
    switch (action) {
      case "activity": op = { kind: "activity", participantId, activityId: String(fd.get("activity")) }; break
      case "survey": op = { kind: "survey", survey: { participantId, organization: Number(fd.get("organization")), service: Number(fd.get("service")), experiences: Number(fd.get("experiences")), products: Number(fd.get("products")), general: Number(fd.get("general")), nps: Number(fd.get("nps")) } }; break
      case "sale": op = { kind: "sale", participantId, productId: String(fd.get("product")), quantity: Number(fd.get("quantity")) }; break
      case "coupon": op = { kind: "coupon", participantId }; break
      case "redeem": op = { kind: "redeem", participantId }; break
      case "exit": op = { kind: "exit", participantId }; break
      case "followup": op = { kind: "followup", participantId, channel: String(fd.get("channel")), note: String(fd.get("note")) }; break
      default: op = { kind: "sample", participantId, productId: String(fd.get("product")), rating: Number(fd.get("rating")), wouldBuy: fd.get("wouldBuy") === "yes" }
    }
    operate(op)
  }
  const checkin = (raw: string) => {
    const value = parseQr(raw)
    if (operate({ kind: "checkin", token: value, eventId })) { const p = m.people.find(p => p.token === value); if (p) setSelectedId(p.id); setToken("") }
  }
  return <>
    <div className="intel-operation-kpis"><span><b>{m.people.length}</b> inscritos</span><span><b>{m.attendees.length}</b> ingresos</span><span><b>{m.samples.length}</b> muestras</span><span><b>{m.redeemed}</b> canjes</span></div>
    <div className="intel-grid"><Card title="Registrar ingreso" eyebrow="01 / ACCESO QR"><div className="intel-scanner-callout"><Glyph name="qr" /><div><h3>Una entrada. Un ingreso verificable.</h3><p>Lee el QR de la demostración o pega su código. Los duplicados y los QR de otros eventos se rechazan.</p></div></div><button className="intel-button primary" onClick={() => setScanner(true)}>Abrir cámara <Glyph name="qr" /></button><form className="intel-inline-form" onSubmit={e => { e.preventDefault(); checkin(token) }}><Field label="Código de entrada"><input required value={token} onChange={e => setToken(e.target.value)} placeholder="CCE-…" /></Field><button className="intel-button secondary" type="submit">Validar ingreso</button></form><p className="intel-footnote">Para probar sin cámara, abre el QR de una persona pendiente y copia su código. Debe estar en el evento seleccionado.</p></Card>
      <Card title="Registrar una experiencia" eyebrow="02 / CAPTURA EN CAMPO"><form onSubmit={submit}><Field label="Participante"><select required value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Seleccionar persona</option>{m.people.map(p => <option key={p.id} value={p.id}>{p.name}{p.entered ? " · Ingresó" : " · Sin ingreso"}</option>)}</select></Field>{selected && <div className="intel-person-context"><strong>{selected.name}</strong><span>{selected.entered ? `Ingreso ${time(selected.entered)}` : "Primero registra su ingreso"} · {selected.consent ? "Comunicaciones autorizadas" : "Sin consentimiento de marketing"}</span></div>}<Field label="Acción"><select value={action} onChange={e => setAction(e.target.value)}>{[["sample", "Entregar muestra y evaluar producto"], ["activity", "Participación en actividad"], ["survey", "Encuesta de experiencia y NPS"], ["coupon", "Emitir beneficio"], ["redeem", "Canjear beneficio"], ["sale", "Registrar compra verificada"], ["exit", "Registrar salida"], ["followup", "Seguimiento posterior"]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
        {(action === "sample" || action === "sale") && <Field label="Producto"><select name="product" required>{m.productRows.map(p => <option key={p.id} value={p.id}>{p.name} · {p.remaining} disponibles</option>)}</select></Field>}
        {action === "sample" && <div className="intel-form-grid"><Field label="Evaluación del producto / 5"><select name="rating" defaultValue="5">{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</select></Field><Field label="¿Lo compraría?"><select name="wouldBuy"><option value="yes">Sí</option><option value="no">No</option></select></Field></div>}
        {action === "activity" && <Field label="Actividad"><select name="activity">{m.event.activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        {action === "sale" && <><Field label="Cantidad comprada"><input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></Field><p className="intel-footnote">Compra simulada al precio del catálogo. No registra un pago real. El canje de beneficio se mide por separado.</p></>}
        {action === "survey" && <div className="intel-form-grid">{[["organization", "Organización"], ["service", "Atención"], ["experiences", "Dinámicas"], ["products", "Productos"], ["general", "Experiencia general"]].map(([key, label]) => <Field key={key} label={`${label} / 5`}><select name={key} defaultValue="5">{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</select></Field>)}<Field label="Recomendaría la experiencia / 10"><input name="nps" type="number" min="0" max="10" step="1" defaultValue="9" required /></Field></div>}
        {action === "followup" && <><Field label="Canal de la acción registrada"><select name="channel"><option>Observación interna</option><option>WhatsApp</option><option>Correo electrónico</option><option>Llamada</option></select></Field><Field label="Detalle del seguimiento"><textarea name="note" required rows={3} placeholder="Describe la acción realizada o el resultado observado." /></Field><p className="intel-footnote">Solo registra una acción. No envía comunicaciones. El seguimiento por canales externos requiere consentimiento.</p></>}
        {action === "coupon" && <p className="intel-footnote">Un beneficio de demostración por participante. Su canje se registra con una acción independiente.</p>}
        {action === "redeem" && <p className="intel-footnote">Código: {store.coupons.find(c => c.participantId === selectedId)?.code ?? "Sin beneficio emitido"}</p>}
        <button className="intel-button primary intel-full" type="submit" disabled={!selected}>Guardar acción <Glyph name="check" /></button>
      </form></Card>
      <Card title="Participantes" eyebrow="INSCRIPCIONES Y ASISTENCIA" wide action={<button className="intel-button secondary" onClick={() => setRegisterOpen(true)}>+ Inscribir persona</button>}><div className="intel-table-tools"><input aria-label="Buscar participante" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o celular" /><select aria-label="Filtrar asistencia" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos</option><option value="pending">Pendientes de ingreso</option><option value="entered">Ingresaron</option></select></div><Table headers={["Participante", "Procedencia", "Ingreso", "Consentimiento", "Acciones"]} rows={visible.map(p => [<strong key={p.id}>{p.name}<small className="intel-table-small">{p.phone}</small></strong>, p.city, p.entered ? time(p.entered) : "Pendiente", p.consent ? "Sí" : "No", <div key={p.id} className="intel-actions"><button className="intel-mini-button" onClick={() => showTicket(p)}>Ver QR</button><button className="intel-mini-button" onClick={() => setSelectedId(p.id)}>Seleccionar</button>{!p.entered && <button className="intel-mini-button" onClick={() => checkin(p.token)}>Ingreso manual</button>}</div>])} /><p className="intel-footnote">Mostrando hasta 40 coincidencias. Usa la búsqueda para encontrar cualquier participante.</p></Card>
      <Card title="Inventario disponible" eyebrow="MUESTRAS Y VENTAS"><Table headers={["Producto", "Muestras", "Disponible"]} rows={m.productRows.map(p => [p.name, p.samples, <span key={p.id} className={p.remaining < 20 ? "intel-negative" : "intel-positive"}>{p.remaining}</span>])} /><form className="intel-inline-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); onReplenish(String(f.get("product")), Number(f.get("quantity"))) }}><Field label="Producto a reponer"><select name="product">{m.productRows.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Unidades"><input name="quantity" type="number" min="1" step="1" defaultValue="20" required /></Field><button className="intel-button secondary" type="submit">Reponer</button></form><p className="intel-footnote">Las muestras y las compras descuentan unidades del inventario. La reposición agrega unidades; actualiza el gasto operativo si hay un costo logístico adicional.</p></Card>
      <Card title="Observaciones del equipo" eyebrow="INCIDENCIAS"><form className="intel-incident-form" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const note = String(new FormData(form).get("note")).trim(); if (note) { onIncident(note); form.reset() } }}><Field label="¿Qué requiere atención?"><textarea name="note" required rows={2} placeholder="Falta de muestras, atención, equipo o logística…" /></Field><button className="intel-button secondary" type="submit">Registrar observación</button></form>{store.incidents.filter(i => i.eventId === eventId).map(i => <div key={i.id} className="intel-incident"><div><p>{i.note}</p><small>{time(i.at)} · {i.resolved ? "Resuelta" : "Pendiente"}</small></div>{!i.resolved && <button className="intel-mini-button" onClick={() => onResolve(i.id)}>Resolver</button>}</div>)}</Card>
    </div>
    {scanner && <Scanner onClose={() => setScanner(false)} onDecode={text => { setScanner(false); checkin(text) }} />}
    {registerOpen && <RegistrationModal eventId={eventId} city={m.event.city} onClose={() => setRegisterOpen(false)} onRegister={data => { if (register(data)) setRegisterOpen(false) }} />}
  </>
}

export function RegistrationModal({ eventId, city, onClose, onRegister }: { eventId: string; city: string; onClose: () => void; onRegister: (data: Omit<Participant, "id" | "token" | "registered" | "entered" | "exited">) => void }) {
  return <Modal title="Inscribir participante" onClose={onClose}><p>Datos mínimos para identificar a la persona y medir su recorrido.</p><form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const phone = String(fd.get("phone")).replace(/[^\d+]/g, ""); onRegister({ eventId, name: String(fd.get("name")).trim(), phone, city: String(fd.get("city")).trim(), age: String(fd.get("age")), source: String(fd.get("source")), consent: fd.get("consent") === "on" }) }}><div className="intel-form-grid"><Field label="Nombre y apellido"><input name="name" required minLength={3} /></Field><Field label="Celular"><input name="phone" type="tel" pattern="[+]?[0-9 ]{7,16}" required /></Field><Field label="Ciudad"><input name="city" defaultValue={city} required /></Field><Field label="Rango de edad"><select name="age">{["18-24", "25-34", "35-44", "45-54", "55+", "Prefiere no indicar"].map(a => <option key={a}>{a}</option>)}</select></Field><Field label="Fuente de registro"><select name="source"><option>Presencial</option><option>QR en punto de venta</option><option>Redes sociales</option><option>Aliado comercial</option></select></Field></div><label className="intel-checkbox"><input name="consent" type="checkbox" /> La persona acepta recibir comunicaciones y promociones.</label><p className="intel-footnote">Opcional. La inscripción es válida aunque no autorice comunicaciones.</p><button className="intel-button primary intel-full" type="submit">Crear inscripción y entrada QR</button></form></Modal>
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.getElementById("intel-dialog")
    const controls = () => dialog?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]')
    controls()?.[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") { const items = Array.from(controls() ?? []).filter(x => !x.hasAttribute("disabled")); const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() } }
    }
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); previous?.focus() }
  }, [onClose])
  return <div className="intel-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="intel-modal" id="intel-dialog" role="dialog" aria-modal="true" aria-labelledby="intel-dialog-title"><button className="intel-modal-close" onClick={onClose} aria-label="Cerrar">×</button><span className="intel-eyebrow">ENTORNO DE DEMOSTRACIÓN</span><h2 id="intel-dialog-title">{title}</h2>{children}</div></div>
}
export function Ticket({ participant, event, onClose }: { participant: Participant; event: EventPlan; onClose: () => void }) {
  const [qr, setQr] = useState("")
  useEffect(() => { let active = true; QRCode.toDataURL(JSON.stringify({ app: "cce-demo", eventId: event.id, token: participant.token }), { width: 320, margin: 3 }).then(url => { if (active) setQr(url) }).catch(() => {}); return () => { active = false } }, [participant.token, event.id])
  return <Modal title="Entrada de demostración" onClose={onClose}><div className="intel-ticket"><h3>{event.name}</h3><p>{date(event.date)} · {event.place}</p>{qr ? <img src={qr} alt={`QR de entrada para ${participant.name}`} width="256" height="256" /> : <p>Generando QR…</p>}<strong>{participant.name}</strong><p>{participant.entered ? "Ingreso ya registrado" : "Pendiente de ingreso"}</p><Field label="Código para validación manual"><input readOnly value={participant.token} onFocus={e => e.target.select()} /></Field>{qr && <a className="intel-button primary" href={qr} download={`entrada-${participant.id}.png`}>Descargar QR</a>}<p className="intel-footnote">Válido solo en este entorno local y para el evento indicado.</p></div></Modal>
}

function EventModal({ products, onClose, onCreate }: { products: string[]; onClose: () => void; onCreate: (event: EventPlan) => void }) {
  const [error, setError] = useState("")
  return <Modal title="Preparar un nuevo evento" onClose={onClose}><form onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget), start = String(f.get("date")), end = String(f.get("end"))
    if (end <= start) { setError("La fecha de cierre debe ser posterior al inicio."); return }
    onCreate({ id: uid(), name: String(f.get("name")).trim(), type: String(f.get("type")), city: String(f.get("city")), place: String(f.get("place")), date: `${start}:00-04:00`, end: `${end}:00-04:00`, status: "planificado", campaign: String(f.get("campaign")), owner: String(f.get("owner")), partner: String(f.get("partner")), objective: String(f.get("objective")), target: Number(f.get("target")), capacity: Number(f.get("capacity")), budget: Number(f.get("budget")), expenses: 0, conversionGoal: Number(f.get("goal")), products: products.map(id => ({ id, stock: Number(f.get("stock")) })), activities: [{ id: "sampling", name: "Prueba tu sabor" }, { id: "game", name: "Reto refrescante" }] })
  }}><div className="intel-form-grid">{[["name", "Nombre del evento", "text", ""], ["city", "Ciudad", "text", "La Paz"], ["place", "Lugar", "text", ""], ["owner", "Responsable", "text", ""], ["campaign", "Campaña", "text", ""], ["partner", "Canal o aliado", "text", ""], ["date", "Inicio (hora Bolivia)", "datetime-local", "2026-10-18T14:00"], ["end", "Cierre (hora Bolivia)", "datetime-local", "2026-10-18T20:00"], ["target", "Meta de asistentes", "number", "150"], ["capacity", "Capacidad máxima", "number", "250"], ["budget", "Presupuesto (Bs)", "number", "2000"], ["goal", "Meta de la acción objetivo", "number", "40"], ["stock", "Inventario inicial por producto", "number", "100"]].map(([name, label, type, initial]) => <Field key={name} label={label}><input name={name} type={type} defaultValue={initial} required min={type === "number" ? name === "budget" || name === "goal" || name === "stock" ? 0 : 1 : undefined} step={type === "number" ? name === "budget" ? "0.01" : "1" : undefined} /></Field>)}<Field label="Acción objetivo"><select name="objective"><option>Compras verificadas</option><option>Canjes de beneficios</option><option>Consentimientos obtenidos</option><option>Participación en actividades</option></select></Field><Field label="Tipo de evento"><select name="type"><option>Experiencia de producto</option><option>Festival</option><option>Deportivo</option><option>Punto de venta</option><option>Comunitario</option></select></Field></div><p className="intel-footnote">Define una acción verificable para el evento. Una vez creado, cambia su estado a “En curso” para registrar ingresos.</p>{error && <p role="alert" className="intel-negative">{error}</p>}<button className="intel-button primary intel-full" type="submit">Crear evento de prueba</button></form></Modal>
}
function EventSettings({ event, onSave }: { event: EventPlan; onSave: (event: EventPlan) => void }) {
  return <Card title={`Plan operativo · ${event.name}`} eyebrow="OBJETIVO Y RECURSOS"><form key={`${event.id}-${event.activities.length}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const name = String(f.get("newActivity") ?? "").trim(); onSave({ ...event, status: String(f.get("status")) as EventPlan["status"], expenses: Number(f.get("expenses")), budget: Number(f.get("budget")), conversionGoal: Number(f.get("goal")), target: Number(f.get("target")), activities: name && !event.activities.some(a => a.name.toLowerCase() === name.toLowerCase()) ? [...event.activities, { id: uid(), name }] : event.activities }) }}><div className="intel-form-grid"><Field label="Estado"><select name="status" defaultValue={event.status}><option value="planificado">Planificado</option><option value="en_curso">En curso</option><option value="cerrado">Finalizado</option></select></Field><Field label="Presupuesto (Bs)"><input name="budget" type="number" min="0" step="0.01" defaultValue={event.budget} required /></Field><Field label="Gasto operativo real simulado (Bs)"><input name="expenses" type="number" min="0" step="0.01" defaultValue={event.expenses} required /></Field><Field label="Meta de la acción objetivo"><input name="goal" type="number" min="0" step="1" defaultValue={event.conversionGoal} required /></Field><Field label="Meta de asistentes"><input name="target" type="number" min="1" step="1" defaultValue={event.target} required /></Field><Field label="Agregar actividad (opcional)"><input name="newActivity" placeholder="Nombre de la nueva experiencia" /></Field></div><p className="intel-footnote">Actividades: {event.activities.map(a => a.name).join(" · ")}. El gasto operativo excluye muestras y productos vendidos; el informe los calcula por separado.</p><button className="intel-button primary" type="submit">Guardar plan</button></form></Card>
}

function ScenarioPlanner({ store, role, onCreate }: { store: DemoStore; role: StaffRole; onCreate: () => void }) {
  const [registered, setRegistered] = useState(250), [budget, setBudget] = useState(2200)
  const plan = planScenario(store, registered, budget)
  const exportPlan = () => downloadCsv("plan-proximo-evento-simulado.csv", [["Planificación", "Estimación con datos simulados"], ["Inscripciones", registered], ["Presupuesto Bs", budget], ["Asistencia baja", plan.low], ["Asistencia central", plan.expected], ["Asistencia alta", plan.high], ["Compradores esperados", plan.buyers], ["Muestras con reserva", plan.samples], ["Personal orientativo", plan.staff], ["Costo por comprador esperado", plan.costPerBuyer ?? "Sin estimación"], ["Producto", "Muestras sugeridas"], ...plan.allocation.map(p => [p.name, p.quantity])])
  return <><div className="intel-planner-hero"><div><span className="intel-pill subtle"><Glyph /> BUSINESS INTELLIGENCE</span><h2>Del historial a un plan de acción.</h2><p>Explora cómo cambian las cantidades y el costo por resultado. Usa el historial para preparar recursos y comprobar tus supuestos.</p></div><div className="intel-planner-orb" aria-hidden="true"><Glyph /><span>PLAN</span></div></div>
    <div className="intel-grid"><Card title="Define el escenario" eyebrow="VARIABLES DE PLANIFICACIÓN"><Field label={`Inscripciones previstas: ${registered}`}><input type="range" min="50" max="1000" step="10" value={registered} onChange={e => setRegistered(Number(e.target.value))} /></Field><Field label="Presupuesto disponible (Bs)"><input type="number" min="0" max="1000000" step="100" value={budget} onChange={e => setBudget(Math.max(0, Math.min(1000000, Number(e.target.value))))} /></Field><p className="intel-footnote">Estimación por tasas ponderadas de {plan.historical} eventos finalizados de ejemplo. La reserva de muestras es 10%; la dotación orientativa es una persona por cada 60 asistentes.</p><div className="intel-actions"><button className="intel-button secondary" onClick={exportPlan}>Descargar plan</button>{role !== "marketing" && <button className="intel-button primary" onClick={onCreate}>Preparar evento</button>}</div><p className="intel-footnote">Preparar evento abre un formulario independiente para confirmar fechas y recursos.</p></Card>
      <Card title="Rango de asistencia" eyebrow="ESCENARIOS, NO GARANTÍAS"><div className="intel-scenario-range"><div><span>Bajo</span><strong>{plan.low}</strong></div><div className="central"><span>Central</span><strong>{plan.expected}</strong></div><div><span>Alto</span><strong>{plan.high}</strong></div></div><div className="intel-range-line"><i /></div><p>Se esperan aproximadamente <b>{plan.buyers} compradores</b>, manteniendo una conversión histórica del {fmt(plan.conversion)}%.</p><p className="intel-footnote">El rango representa ±15% del escenario central, limitado a las inscripciones. No es un intervalo estadístico calibrado. Cambiar el presupuesto no supone automáticamente más ventas.</p></Card>
      <Card title="Muestras por producto" eyebrow={`${plan.samples} UNIDADES, INCLUIDA RESERVA`}><BarPlot data={plan.allocation.map(p => ({ name: p.name.replace("Coca-Cola ", ""), quantity: p.quantity }))} dataKey="quantity" name="Muestras sugeridas" color="#2dd4bf" /><p className="intel-footnote">Distribución según intención de compra registrada. Confirma disponibilidad y objetivos de lanzamiento antes de asignar cantidades.</p></Card>
      <Card title="Decisiones para el responsable" eyebrow="PLAN PROPUESTO"><div className="intel-plan-actions"><div><Glyph name="people" /><span><strong>Preparar {plan.staff} personas</strong><small>Referencia orientativa. Ajustar por estaciones, turnos y tiempos de atención.</small></span></div><div><Glyph name="box" /><span><strong>Reservar {plan.samples} muestras</strong><small>Revisar el reparto sugerido y el costo logístico.</small></span></div><div><Glyph name="chart" /><span><strong>{plan.costPerBuyer == null ? "Sin compradores estimados" : `${money(plan.costPerBuyer)} por comprador esperado`}</strong><small>Presupuesto dividido por compradores estimados. No representa margen ni retorno causal.</small></span></div></div></Card>
      <Card title="Qué repetir y qué revisar" eyebrow="APRENDIZAJE DEL PORTAFOLIO" wide><Table headers={["Evento finalizado", "Asistencia", "Conversión a compra", "Costo por comprador", "Evidencia"]} rows={store.events.filter(e => e.status === "cerrado").map(e => { const m = eventMetrics(store, e.id); return [e.name, `${fmt(m.attendanceRate)}%`, `${fmt(m.conversionRate)}%`, m.costPerBuyer == null ? "Sin compras" : money(m.costPerBuyer), `${m.attendees.length} asistentes · ${m.surveys.length} encuestas`] })} /><p className="intel-footnote">Antes de trasladar presupuesto, valida comparabilidad de público, ciudad, duración y objetivo. Una asociación histórica no demuestra que un formato cause mejores ventas.</p></Card>
    </div></>
}

type ModelOverview = { pronostico: { evento_nombre: string; asistentes: { p10: number; p50: number; p90: number }; conversiones_esperadas: number; factores: string[]; advertencia: string; origen: string; confianza: string } | null; total_usuarios: number; calculado_at: string }
function DatabasePlanner() {
  const [data, setData] = useState<ModelOverview | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true)
  useEffect(() => { const controller = new AbortController(); fetch("/api/ml/overview", { signal: controller.signal, cache: "no-store" }).then(async r => { const j = await r.json(); if (!r.ok || !j.ok) throw new Error("No se pudo consultar el modelo de la base de datos."); setData(j.data) }).catch(e => { if (e.name !== "AbortError") setError(e.message) }).finally(() => setLoading(false)); return () => controller.abort() }, [])
  const p = data?.pronostico
  return <><Card title="Modelo conectado al historial"><p>Pronóstico del próximo evento que identifica el motor existente. Fuente: base de datos; estos registros pueden ser datos de prueba cargados previamente.</p>{loading ? <Empty>Consultando el modelo…</Empty> : error ? <p role="alert" className="intel-negative">{error}</p> : !p ? <Empty>No hay un evento próximo para calcular el pronóstico.</Empty> : <><h3>{p.evento_nombre}</h3><div className="intel-scenario-range"><div><span>Estimación baja</span><strong>{p.asistentes.p10}</strong></div><div className="central"><span>Estimación central</span><strong>{p.asistentes.p50}</strong></div><div><span>Estimación alta</span><strong>{p.asistentes.p90}</strong></div></div><p>Acciones objetivo previstas: <b>{p.conversiones_esperadas}</b>. No representan necesariamente compras.</p><ul className="intel-factors">{p.factores.map(f => <li key={f}>{f}</li>)}</ul><p className="intel-footnote">Origen: {p.origen === "modelo" ? "Modelo de asistencia" : "Estimación por reglas"}. Evidencia histórica: {p.confianza}. El rango del motor no está validado como intervalo de cobertura para eventos nuevos. {p.advertencia}</p><p className="intel-footnote">Usa la estimación para revisar inventario y dotación; confirma las condiciones del evento antes de tomar una decisión. Actualizado: {time(data!.calculado_at)}.</p></>}</Card></>
}

function LiveResults({ role, compact, onPage }: { role: StaffRole; compact: boolean; onPage: (page: string) => void }) {
  const [data, setData] = useState<Statistics | null>(null), [id, setId] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); let active = true, pending = false
    setData(null); setLoading(true)
    const refresh = async () => { if (pending) return; pending = true; try { const r = await fetch(`/api/estadisticas${id ? `?evento_id=${id}` : ""}`, { cache: "no-store", signal: controller.signal }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error("No se pudieron consultar los indicadores."); if (active) { setData(j.data); setError("") } } catch (e) { if (active) setError(e instanceof Error ? e.message : "No se pudo actualizar") } finally { pending = false; if (active) setLoading(false) } }
    void refresh(); const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh() }, 30000)
    return () => { active = false; controller.abort(); clearInterval(timer) }
  }, [id, revision])
  const m = data?.selected
  const csv = () => { if (!data || !m) return; downloadCsv(`reporte-base-${m.evento_id}.csv`, [["Fuente", "Base de datos (puede contener datos de prueba)"], ["Evento", m.evento ?? ""], ["Inscritos", m.registrados ?? 0], ["Asistentes", m.asistentes ?? 0], ["Acciones objetivo", m.conversiones ?? 0], ["Canjes", m.canjes ?? 0], ["Satisfacción", m.satisfaccion ?? "Sin datos"], ["NPS", m.nps ?? "Sin datos"]]) }
  return <><div className="intel-context"><Field label="Evento en base de datos"><select value={id || String(m?.evento_id ?? "")} onChange={e => setId(e.target.value)}>{!data?.events.length && <option>Sin eventos disponibles</option>}{data?.events.map(e => <option key={e.evento_id} value={String(e.evento_id)}>{e.evento}</option>)}</select></Field><div className="intel-actions"><button className="intel-button secondary" onClick={() => setRevision(r => r + 1)}>Actualizar</button><button className="intel-button secondary" disabled={!m} onClick={csv}>Descargar CSV</button></div></div><p className="intel-disclosure">Fuente: Supabase. Los registros existentes pueden ser datos de prueba. Actualización cada 30 segundos.{data && ` Última consulta: ${time(data.updatedAt)}.`}</p>{error && <p className="intel-error" role="alert">{error}</p>}{loading && <Empty>Consultando indicadores…</Empty>}{!loading && !m && !error && <Empty>Crea un evento para comenzar a medir resultados.</Empty>}{m && data && <>
    <div className="intel-metrics"><Metric label="Inscritos" value={fmt(m.registrados ?? 0)} detail={`${fmt(m.pct_asistencia ?? 0)}% de asistencia`} icon="people" /><Metric label="Asistentes" value={fmt(m.asistentes ?? 0)} detail={`${m.nuevos ?? 0} nuevos · ${m.recurrentes ?? 0} recurrentes`} accent="violet" /><Metric label="Acciones objetivo" value={fmt(m.conversiones ?? 0)} detail="Según la definición de la base de datos" accent="mint" /><Metric label="Satisfacción" value={m.satisfaccion == null ? "Sin datos" : `${fmt(m.satisfaccion)} / 5`} detail={`${m.encuestas_respondidas ?? 0} encuestas · NPS ${m.nps ?? "—"}`} accent="blue" /></div>
    {compact ? <div className="intel-launch"><div><Glyph /><div><h2>Consulta el resultado y prepara el próximo paso.</h2><p>Las métricas detalladas están reunidas en Resultados; el pronóstico conectado está en Planificar con IA.</p></div></div><div className="intel-actions"><button className="intel-button secondary" onClick={() => onPage("Resultados")}>Ver resultados</button><button className="intel-button primary" onClick={() => onPage("Planificar con IA")}>Consultar pronóstico</button></div></div> : <div className="intel-grid"><Card title="Ingresos por hora"><TrafficChart data={data.hourly.map(h => ({ hour: h.franja ?? `${h.hora_del_dia ?? ""}:00`, entries: h.checkins ?? 0 }))} /></Card><Card title="Interés por producto"><BarPlot data={data.products.map(p => ({ name: p.producto ?? "Producto", value: p.personas_interesadas ?? 0 }))} dataKey="value" name="Personas interesadas" horizontal /></Card><Card title="Participación por actividad"><BarPlot data={data.activities.map(a => ({ name: a.actividad ?? "Actividad", value: a.participantes_unicos ?? 0 }))} dataKey="value" name="Personas únicas" horizontal color="#2dd4bf" /></Card><Card title="Procedencia"><Donut data={data.cities.map(c => ({ name: c.ciudad ?? "Sin ciudad", value: c.asistentes ?? 0 }))} label="Ciudades" /></Card>
      <Card title="Resultados y seguimiento"><div className="intel-summary-numbers"><div><strong>{m.registros_con_consentimiento ?? 0}</strong><span>Consentimientos</span></div><div><strong>{m.canjes ?? 0}</strong><span>Canjes</span></div><div><strong>{fmt(m.pct_recurrencia ?? 0)}%</strong><span>Recurrencia</span></div></div>{role !== "organizador" && <p>Ventas vinculadas: <b>{money(m.monto_ventas ?? 0)}</b>. No se calcula rentabilidad sin costos verificables.</p>}</Card>
      <Card title="Comparar eventos" wide><Table headers={["Evento", "Inscritos", "Asistentes", "Acciones objetivo", "Satisfacción"]} rows={data.events.map(e => [e.evento, e.registrados, e.asistentes, e.conversiones, e.satisfaccion == null ? "Sin datos" : fmt(e.satisfaccion)])} /></Card>
    </div>}</>}</>
}
