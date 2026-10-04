"use client"

import { useEffect, useRef, useState } from "react"
import { buildReportUrl, type PowerBiConfig } from "@/lib/powerbi"

const SLOW_MS = 25000

function ReportIcon({ name }: { name: "reload" | "expand" | "shrink" | "external" }) {
  const paths = {
    reload: <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />,
    expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
    shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
    external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function PowerBiReport({ eventId, eventName, refreshKey, waitingEvent = false }: { eventId: number | null; eventName: string | null; refreshKey: number; waitingEvent?: boolean }) {
  const [config, setConfig] = useState<PowerBiConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configRevision, setConfigRevision] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setConfigError(null)
    fetch("/api/powerbi", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok || !json.ok) throw new Error(json.error ?? "No se pudo leer la configuración de Power BI")
        setConfig(json.data)
      })
      .catch((err) => { if (!controller.signal.aborted) setConfigError(err instanceof Error ? err.message : "No se pudo leer la configuración de Power BI") })
    return () => controller.abort()
  }, [configRevision, refreshKey])

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled))
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Con filtro configurado se espera al evento seleccionado para no cargar el reporte dos veces.
  const waiting = waitingEvent && Boolean(config?.filter)
  const reportUrl = config?.embedUrl && !waiting ? buildReportUrl(config.embedUrl, config.filter, eventId) : null
  const frameKey = `${reportUrl}|${reloadKey}|${refreshKey}`

  useEffect(() => {
    if (!reportUrl) return
    setLoaded(false)
    setSlow(false)
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [reportUrl, frameKey])

  const reload = () => setReloadKey((value) => value + 1)
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frameRef.current?.requestFullscreen().catch(() => setCanFullscreen(false))
  }

  return <section className="panel pbi-report" aria-labelledby="pbi-report-title">
    <div className="panel-head pbi-report-head">
      <div><span>REPORTE POWER BI</span><h3 id="pbi-report-title">{reportUrl ? "Reporte conectado a Supabase" : "Reporte del evento"}</h3>
        {reportUrl && <p className="pbi-report-filter">{config?.filter && eventId !== null ? <>Filtrado por <b>{eventName ?? `evento ${eventId}`}</b></> : "Sin filtro por evento"}</p>}
      </div>
      {reportUrl && <div className="pbi-report-actions">
        <button className="btn btn-secondary" onClick={reload}><ReportIcon name="reload" />Recargar reporte</button>
        {canFullscreen && <button className="btn btn-secondary" onClick={toggleFullscreen} aria-pressed={fullscreen}><ReportIcon name={fullscreen ? "shrink" : "expand"} />{fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}</button>}
        <a className="btn btn-secondary" href={reportUrl} target="_blank" rel="noopener noreferrer"><ReportIcon name="external" />Abrir en pestaña nueva</a>
      </div>}
    </div>

    {!config && !configError && <p className="stats-notice" role="status">Cargando configuración del reporte…</p>}
    {configError && <div className="stats-notice stats-error pbi-report-message" role="alert"><p>{configError}</p><button className="btn btn-secondary" onClick={() => setConfigRevision((value) => value + 1)}>Reintentar</button></div>}
    {config?.error && <div className="stats-notice stats-error" role="alert"><p>{config.error} Revisa la variable de entorno y reinicia el servidor.</p></div>}

    {waiting && config?.embedUrl && <p className="stats-notice" role="status">Cargando reporte…</p>}
    {config && !config.error && !config.embedUrl && <div className="pbi-empty">
      <strong>Aún no hay un reporte de Power BI conectado</strong>
      <p>Las tarjetas de arriba siguen mostrando los datos de Supabase. Para ver el reporte aquí:</p>
      <ol>
        <li><span><b>Publica el reporte</b> en Power BI Service desde Power BI Desktop (Archivo › Publicar).</span></li>
        <li><span><b>Copia la URL de inserción</b> en Power BI Service: Archivo › Insertar informe › Sitio web o portal.</span></li>
        <li><span><b>Pégala en <code>POWERBI_EMBED_URL</code></b> en el archivo <code>.env</code> y reinicia el servidor.</span></li>
      </ol>
    </div>}

    {reportUrl && <div className="pbi-report-frame" ref={frameRef}>
      {!loaded && <div className="pbi-report-loading" role="status"><i className="pbi-spinner" aria-hidden="true" />{slow ? "El reporte está tardando en responder. Puedes recargarlo o abrirlo en una pestaña nueva." : "Cargando reporte…"}</div>}
      <iframe key={frameKey} src={reportUrl} title="Reporte de Power BI" allowFullScreen onLoad={() => { setLoaded(true); setSlow(false) }} />
    </div>}
  </section>
}
