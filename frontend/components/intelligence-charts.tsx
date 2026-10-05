"use client"

import { useId, useState } from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList,
  Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts"

const palette = ["#ff5876", "#b49aff", "#3de1c7", "#58cfff", "#ffd178"]
const number = (value: number) => value.toLocaleString("es-BO", { maximumFractionDigits: 1 })
const tooltip = { background: "#101a2d", border: "1px solid #526681", borderRadius: 14, color: "#f0f5ff", boxShadow: "0 15px 40px #0005", fontSize: 13 }
const shortName = (value: string) => value.replace("Coca-Cola ", "").replace("Sin Azúcar", "Sin azúcar")

function NoData({ text }: { text: string }) {
  return <div className="intel-empty">{text}</div>
}

export function GoalPulse({ value, target, label, caption }: { value: number; target: number; label: string; caption: string }) {
  const id = useId().replace(/:/g, "")
  const pct = target > 0 ? value / target * 100 : null
  const circumference = 2 * Math.PI * 82
  return <div className="pulse-gauge" role="img" aria-label={`${label}: ${value} de ${target || "sin meta"}. ${pct == null ? "" : `${number(pct)} por ciento.`}`}>
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <defs><linearGradient id={`goal-${id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#ff5876" /><stop offset="60%" stopColor="#b49aff" /><stop offset="100%" stopColor="#58cfff" /></linearGradient></defs>
      <circle className="pulse-orbit" cx="110" cy="110" r="103" />
      <circle className="pulse-track" cx="110" cy="110" r="82" />
      <circle className="pulse-value" cx="110" cy="110" r="82" stroke={`url(#goal-${id})`} strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, pct ?? 0)) / 100)} transform="rotate(-90 110 110)" />
      <circle className="pulse-inner" cx="110" cy="110" r="65" />
    </svg>
    <div className="pulse-gauge-label"><span>{caption}</span><strong>{pct == null ? "—" : `${number(pct)}%`}</strong><small>{value} / {target || "Sin meta"}</small></div>
  </div>
}

export function TrafficChart({ data }: { data: { hour: string; entries: number }[] }) {
  const [mode, setMode] = useState<"entries" | "cumulative">("entries")
  const id = useId().replace(/:/g, "")
  let cumulative = 0
  const series = data.map(row => ({ ...row, cumulative: cumulative += row.entries }))
  const peak = data.reduce<(typeof data)[number] | null>((best, row) => !best || row.entries > best.entries ? row : best, null)
  if (!data.length) return <NoData text="Los ingresos aparecerán cuando se registre asistencia." />
  return <div className="viz-traffic">
    <div className="viz-toolbar"><div><strong>{number(cumulative)}</strong><span>ingresos registrados</span></div><div className="viz-toggle no-print" role="group" aria-label="Forma de visualizar ingresos"><button aria-pressed={mode === "entries"} className={mode === "entries" ? "active" : ""} onClick={() => setMode("entries")}>Por hora</button><button aria-pressed={mode === "cumulative"} className={mode === "cumulative" ? "active" : ""} onClick={() => setMode("cumulative")}>Acumulado</button></div></div>
    <div className="intel-chart" role="img" aria-label={`Ingresos por hora: ${data.map(row => `${row.hour}: ${row.entries}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 15, right: 12, bottom: 0, left: -22 }}>
        <defs><linearGradient id={`traffic-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b49aff" stopOpacity={0.45} /><stop offset="100%" stopColor="#b49aff" stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid stroke="#314057" strokeOpacity={0.65} strokeDasharray="2 7" vertical={false} />
        <XAxis dataKey="hour" stroke="#9aadc8" tickLine={false} axisLine={false} minTickGap={24} dy={7} />
        <YAxis stroke="#9aadc8" allowDecimals={false} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltip} cursor={{ stroke: "#b49aff", strokeDasharray: "4 4" }} />
        <Area name={mode === "entries" ? "Ingresos" : "Ingresos acumulados"} type={mode === "entries" ? "linear" : "monotone"} dataKey={mode} stroke="#b49aff" strokeWidth={3} fill={`url(#traffic-${id})`} isAnimationActive={false} dot={false} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
      </AreaChart></ResponsiveContainer>
    </div>
    <div className="viz-caption"><span className="viz-dot" style={{ background: "#b49aff" }} />{peak && peak.entries > 0 ? <>Mayor afluencia: <strong>{peak.hour}</strong> · {peak.entries} ingresos</> : "Todavía no se registraron ingresos"}</div>
  </div>
}

export function BarPlot({ data, dataKey, name, color = "#b49aff", horizontal = false }: { data: Record<string, string | number>[]; dataKey: string; name: string; color?: string; horizontal?: boolean }) {
  const id = useId().replace(/:/g, "")
  if (!data.length) return <NoData text="Sin registros todavía." />
  return <div className="intel-chart" role="img" aria-label={`${name}: ${data.map(row => `${row.name}: ${row[dataKey]}`).join(", ")}`}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 28, right: 35, bottom: 8, left: horizontal ? 0 : -18 }}>
      <defs><linearGradient id={`bar-${id}`} x1="0" y1={horizontal ? "0" : "1"} x2={horizontal ? "1" : "0"} y2="0"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} /></linearGradient></defs>
      <CartesianGrid stroke="#314057" strokeOpacity={0.6} strokeDasharray="2 7" horizontal={!horizontal} vertical={horizontal} />
      {horizontal ? <><XAxis type="number" stroke="#9aadc8" allowDecimals={false} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={122} stroke="#b1c0d6" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={shortName} /></> : <><XAxis dataKey="name" stroke="#b1c0d6" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={shortName} dy={8} /><YAxis stroke="#9aadc8" allowDecimals={false} tickLine={false} axisLine={false} /></>}
      <Tooltip contentStyle={tooltip} cursor={{ fill: "#a1b6df08" }} />
      <Bar dataKey={dataKey} name={name} fill={`url(#bar-${id})`} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} background={{ fill: "#a1b6df06", radius: 6 }}><LabelList dataKey={dataKey} position={horizontal ? "right" : "top"} fill="#dce7f8" fontSize={12} formatter={(value: unknown) => number(Number(value))} /></Bar>
    </BarChart></ResponsiveContainer>
  </div>
}

export function Donut({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null)
  const total = data.reduce((sum, row) => sum + row.value, 0)
  const selected = data.find(row => row.name === active)
  if (!total) return <NoData text={`Sin registros para ${label.toLowerCase()}.`} />
  return <div className="viz-distribution">
    <div className="viz-donut" role="img" aria-label={`${label}: ${data.map(row => `${row.name}: ${row.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="90%" startAngle={90} endAngle={-270} paddingAngle={4} cornerRadius={6} stroke="none" isAnimationActive={false} onMouseEnter={(_, index) => setActive(data[index].name)} onMouseLeave={() => setActive(null)}>{data.map((row, index) => <Cell key={row.name} fill={palette[index % palette.length]} opacity={selected && selected.name !== row.name ? 0.25 : 1} />)}</Pie></PieChart></ResponsiveContainer>
      <div className="viz-donut-center"><span>{selected ? "Selección" : "Total"}</span><strong>{number(selected?.value ?? total)}</strong><small>{selected ? `${number(selected.value / total * 100)}% del total` : label}</small></div>
    </div>
    <div className="viz-distribution-legend" aria-label={`Detalle de ${label}`}>
      {data.map((row, index) => <button key={row.name} aria-pressed={active === row.name} className={active === row.name ? "active" : ""} onClick={() => setActive(active === row.name ? null : row.name)}><i style={{ background: palette[index % palette.length] }} /><span>{row.name}<small>{number(row.value / total * 100)}% del total</small></span><strong>{number(row.value)}</strong></button>)}
    </div>
  </div>
}

export function ProductComparison({ data }: { data: { name: string; interested: number; buyers: number }[] }) {
  if (!data.length) return <NoData text="Registra experiencias para comparar los productos." />
  return <div className="intel-chart" role="img" aria-label={data.map(row => `${row.name}: ${row.interested} con intención y ${row.buyers} compradores`).join(". ")}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} margin={{ top: 24, right: 14, left: -20 }}>
    <CartesianGrid stroke="#314057" strokeOpacity={0.6} strokeDasharray="2 7" vertical={false} /><XAxis dataKey="name" stroke="#a8bad4" tickFormatter={shortName} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis stroke="#9aadc8" allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltip} cursor={{ fill: "#ffffff04" }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
    <Bar name="Intención declarada" dataKey="interested" fill="#b49aff" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive={false}><LabelList dataKey="interested" position="top" fill="#d9ccff" fontSize={11} /></Bar>
    <Bar name="Compradores" dataKey="buyers" fill="#3de1c7" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive={false}><LabelList dataKey="buyers" position="top" fill="#98f5e4" fontSize={11} /></Bar>
  </BarChart></ResponsiveContainer></div>
}

export function ExperienceRadar({ data, responses, nps }: { data: { name: string; value: number }[]; responses: number; nps: number | null }) {
  if (!responses) return <NoData text="Todavía no hay encuestas. La evaluación aparecerá con la primera respuesta." />
  return <div className="viz-experience"><div className="intel-chart" role="img" aria-label={`Evaluación sobre 5: ${data.map(row => `${row.name}: ${number(row.value)}`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="67%"><PolarGrid stroke="#3c4b64" /><PolarAngleAxis dataKey="name" tick={{ fill: "#bac8df", fontSize: 12 }} /><PolarRadiusAxis domain={[0, 5]} tickCount={6} axisLine={false} tick={{ fill: "#8195b5", fontSize: 10 }} /><Radar name="Evaluación / 5" dataKey="value" stroke="#58cfff" strokeWidth={2} fill="#58cfff" fillOpacity={0.22} dot={{ r: 4, fill: "#a5e7ff", strokeWidth: 0 }} isAnimationActive={false} /><Tooltip contentStyle={tooltip} /></RadarChart></ResponsiveContainer></div><div className="viz-experience-footer"><span><b>{responses}</b> respuestas</span><span><b>{nps == null ? "—" : number(nps)}</b> NPS <small>escala −100 a 100</small></span></div></div>
}

export type EfficiencyPoint = { name: string; cost: number; conversion: number; attendees: number }
export function EfficiencyChart({ data }: { data: EfficiencyPoint[] }) {
  if (!data.length) return <NoData text="Se necesitan compras y costos registrados para comparar eficiencia." />
  return <div className="viz-efficiency"><div className="viz-axis-hint"><span>↑ Mayor conversión</span><span>Menor costo ←</span></div><div className="intel-chart" role="img" aria-label={data.map(row => `${row.name}: Bs ${number(row.cost)} por comprador, ${number(row.conversion)}% de conversión, ${row.attendees} asistentes`).join(". ")}><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 20, right: 35, bottom: 28, left: 4 }}><CartesianGrid stroke="#314057" strokeDasharray="2 7" /><XAxis type="number" dataKey="cost" name="Costo por comprador" unit=" Bs" stroke="#9aadc8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: "Costo por comprador (Bs)", position: "insideBottom", offset: -20, fill: "#9aadc8", fontSize: 12 }} /><YAxis type="number" dataKey="conversion" name="Conversión" unit="%" domain={[0, "auto"]} stroke="#9aadc8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><ZAxis type="number" dataKey="attendees" range={[220, 850]} name="Asistentes" /><Tooltip contentStyle={tooltip} cursor={{ strokeDasharray: "4 4" }} formatter={value => number(Number(value))} /><Scatter data={data} name="Eventos" isAnimationActive={false}>{data.map((row, i) => <Cell key={row.name} fill={palette[i % palette.length]} fillOpacity={0.7} stroke={palette[i % palette.length]} strokeWidth={2} />)}</Scatter></ScatterChart></ResponsiveContainer></div><div className="viz-event-legend">{data.map((row, i) => <span key={row.name}><i style={{ background: palette[i % palette.length] }} />{row.name}</span>)}</div><p className="intel-footnote">El tamaño representa asistentes. Cada punto conserva su contexto; compara públicos y objetivos similares antes de mover presupuesto.</p></div>
}
