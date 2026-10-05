"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { RegistrationModal, Ticket } from "./intelligence-workspace"
import { createDemoStore, registerParticipant, STORAGE_KEY, type DemoStore, type Participant } from "@/lib/event-intelligence"

export default function ParticipantRegistration() {
  const [store, setStore] = useState<DemoStore>(() => createDemoStore())
  const [eventId, setEventId] = useState("experience"), [open, setOpen] = useState(false)
  const [ticket, setTicket] = useState<Participant | null>(null), [error, setError] = useState("")
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw); if (saved.version === 1 && Array.isArray(saved.events) && Array.isArray(saved.participants)) setStore(saved) } } catch { setError("No se pudo leer la demostración guardada en este navegador.") }
    const sync = (e: StorageEvent) => { if (e.key !== STORAGE_KEY || !e.newValue) return; try { const saved = JSON.parse(e.newValue); if (saved.version === 1 && Array.isArray(saved.events)) setStore(saved) } catch { /* Keep the last valid demonstration. */ } }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  const event = store.events.find(e => e.id === eventId)
  return <main className="intelligence-shell intel-public"><div className="intelligence-workspace"><div className="intel-public-nav"><Link href="/">← Portal de eventos</Link><Link href="/panel">Equipo de eventos →</Link></div><div className="intel-title"><div><span className="intel-eyebrow">COCA-COLA / EXPERIENCIAS</span><h1>Tu próxima experiencia empieza aquí.</h1><p>Elige el evento y recibe tu entrada QR. No necesitas crear una contraseña.</p></div></div><p className="intel-disclosure">Demostración con datos simulados. La inscripción se guarda solo en este navegador y puede verificarse desde el panel local.</p>{error && <p className="intel-error" role="alert">{error}</p>}<div className="intel-event-grid">{store.events.filter(e => e.status !== "cerrado").map(e => <article className="intel-event-card" key={e.id}><span className="intel-eyebrow">{e.type}</span><h2>{e.name}</h2><p>{new Date(e.date).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" })} · {e.city}</p><p>{e.place}</p><button className="intel-button primary" onClick={() => { setEventId(e.id); setOpen(true); setError("") }}>Inscribirme y obtener QR</button></article>)}</div>{!store.events.some(e => e.status !== "cerrado") && <p>No hay eventos abiertos a inscripciones.</p>}{open && event && <RegistrationModal eventId={event.id} city={event.city} onClose={() => setOpen(false)} onRegister={data => { try {
    // Read the latest state so another open local tab cannot overwrite operations.
    const raw = localStorage.getItem(STORAGE_KEY), current: DemoStore = raw ? JSON.parse(raw) : store
    const next = registerParticipant(current, data, crypto.randomUUID(), `CCE-${crypto.randomUUID()}`, new Date().toISOString())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.store)); setStore(next.store); setTicket(next.participant); setOpen(false); setError("")
  } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la inscripción."); setOpen(false) } }} />}{ticket && <Ticket participant={ticket} event={store.events.find(e => e.id === ticket.eventId)!} onClose={() => setTicket(null)} />}</div></main>
}
