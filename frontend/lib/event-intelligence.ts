export type StaffRole = "administrador" | "organizador" | "marketing"
export type EventPlan = {
  id: string; name: string; type: string; city: string; place: string; date: string; end: string;
  status: "planificado" | "en_curso" | "cerrado"; campaign: string; owner: string; partner: string;
  objective: string; target: number; capacity: number; budget: number; expenses: number;
  conversionGoal: number; products: { id: string; stock: number }[];
  activities: { id: string; name: string }[];
}
export type Product = { id: string; name: string; category: string; price: number; cost: number; sampleCost: number; color: string }
export type Participant = {
  id: string; eventId: string; name: string; phone: string; city: string; age: string; source: string;
  consent: boolean; token: string; registered: string; entered: string | null; exited: string | null;
}
export type Touch = { id: string; participantId: string; activityId: string; at: string }
export type Sample = { id: string; participantId: string; productId: string; rating: number; wouldBuy: boolean; at: string }
export type Survey = { participantId: string; organization: number; service: number; experiences: number; products: number; general: number; nps: number; at: string }
export type Coupon = { id: string; participantId: string; redeemed: string | null; code: string }
export type Sale = { id: string; participantId: string; productId: string; quantity: number; at: string }
export type Followup = { id: string; participantId: string; channel: string; note: string; at: string }
export type Incident = { id: string; eventId: string; note: string; at: string; resolved: boolean }
export type DemoStore = { version: 1; events: EventPlan[]; products: Product[]; participants: Participant[]; touches: Touch[]; samples: Sample[]; surveys: Survey[]; coupons: Coupon[]; sales: Sale[]; followups: Followup[]; incidents: Incident[] }
export const STORAGE_KEY = "cce-intelligence-demo-v1"
export const percent = (n: number, d: number) => d ? Math.round(n / d * 1000) / 10 : 0
const unique = (values: string[]) => new Set(values).size
const hourFormatter = new Intl.DateTimeFormat("es-BO", { hour: "numeric", hourCycle: "h23", timeZone: "America/La_Paz" })
export function registerParticipant(store: DemoStore, data: Omit<Participant, "id" | "token" | "registered" | "entered" | "exited">, id: string, token: string, at: string) {
  const event = store.events.find(e => e.id === data.eventId)
  if (!event || event.status === "cerrado") throw new Error("Selecciona un evento abierto a inscripciones.")
  const name = data.name.trim(), phone = data.phone.replace(/[^\d+]/g, "")
  if (name.length < 3 || !/^\+?\d{7,15}$/.test(phone)) throw new Error("Revisa el nombre y el celular del participante.")
  if (store.participants.some(p => p.eventId === data.eventId && p.phone.replace(/[^\d+]/g, "") === phone)) throw new Error("Este celular ya tiene una inscripción en el evento.")
  const participant: Participant = { ...data, name, phone, id, token, registered: at, entered: null, exited: null }
  return { store: { ...store, participants: [...store.participants, participant] }, participant }
}
export function createDemoStore(): DemoStore {
  const products: Product[] = [
    { id: "original", name: "Coca-Cola Original", category: "Gaseosa · 500 ml", price: 8, cost: 3.2, sampleCost: 1.2, color: "#fb4b65" },
    { id: "zero", name: "Coca-Cola Sin Azúcar", category: "Gaseosa · 500 ml", price: 8, cost: 3.2, sampleCost: 1.2, color: "#a78bfa" },
    { id: "sprite", name: "Sprite", category: "Gaseosa · 500 ml", price: 7, cost: 2.8, sampleCost: 1, color: "#2dd4bf" },
  ]
  const events: EventPlan[] = [
    { id: "festival", name: "Festival de sabores", type: "Festival", city: "Santa Cruz", place: "Fexpocruz", date: "2026-08-15T16:00:00-04:00", end: "2026-08-15T22:00:00-04:00", status: "cerrado", campaign: "Comparte el momento", owner: "Equipo Oriente", partner: "Distribuidor Oriente", objective: "Compras verificadas", target: 140, capacity: 220, budget: 3200, expenses: 2500, conversionGoal: 45, products: products.map(p => ({ id: p.id, stock: 130 })), activities: [{ id: "sampling", name: "Prueba tu sabor" }, { id: "photo", name: "Foto de marca" }, { id: "game", name: "Reto refrescante" }] },
    { id: "sport", name: "Fan Zone Coca-Cola", type: "Deportivo", city: "Cochabamba", place: "Estadio Félix Capriles", date: "2026-09-06T14:00:00-04:00", end: "2026-09-06T20:00:00-04:00", status: "cerrado", campaign: "Comparte el momento", owner: "Equipo Valle", partner: "Club deportivo", objective: "Compras verificadas", target: 120, capacity: 180, budget: 2100, expenses: 1600, conversionGoal: 35, products: products.map(p => ({ id: p.id, stock: 100 })), activities: [{ id: "sampling", name: "Prueba tu sabor" }, { id: "game", name: "Reto refrescante" }] },
    { id: "experience", name: "Coca-Cola Experience", type: "Experiencia de producto", city: "La Paz", place: "Paseo Aranjuez", date: "2026-10-04T14:00:00-04:00", end: "2026-10-04T21:00:00-04:00", status: "en_curso", campaign: "Descubre tu próximo sabor", owner: "María Rodríguez", partner: "Paseo Aranjuez", objective: "Compras verificadas", target: 160, capacity: 240, budget: 2400, expenses: 1750, conversionGoal: 50, products: products.map(p => ({ id: p.id, stock: 90 })), activities: [{ id: "sampling", name: "Prueba tu sabor" }, { id: "photo", name: "Foto de marca" }, { id: "game", name: "Reto refrescante" }] },
  ]
  const s: DemoStore = { version: 1, events, products, participants: [], touches: [], samples: [], surveys: [], coupons: [], sales: [], followups: [], incidents: [] }
  const first = ["Valeria", "Diego", "Camila", "Nicolás", "Lucía", "Andrés", "Daniela", "Mateo"]
  const last = ["Rojas", "Vargas", "Flores", "Mamani", "Salvatierra", "Quispe"]
  events.forEach((e, ei) => {
    const n = [150, 130, 180][ei], attendance = [0.72, 0.85, 0.76][ei]
    for (let i = 0; i < n; i++) {
      const person = i < 30 ? i : ei * 200 + i
      const id = `${e.id}-${i}`, time = new Date(Date.parse(e.date) + (i % 240) * 60000).toISOString()
      const attended = i < Math.floor(n * attendance)
      s.participants.push({ id, eventId: e.id, name: `${first[i % 8]} ${last[i % 6]} ${i + 1}`, phone: `700${String(person).padStart(5, "0")}`, city: i % 5 === 0 ? "El Alto" : e.city, age: ["18-24", "25-34", "35-44", "45-54"][i % 4], source: ["QR en punto de venta", "Redes sociales", "Presencial"][i % 3], consent: i % 4 !== 0, token: `CCE-${e.id}-${i + 1}`, registered: new Date(Date.parse(e.date) - 86400000).toISOString(), entered: attended ? time : null, exited: attended && e.status === "cerrado" ? new Date(Date.parse(time) + 75 * 60000).toISOString() : null })
      if (!attended) continue
      if (i % 5 !== 0) s.touches.push({ id: `touch-${id}`, participantId: id, activityId: "sampling", at: time })
      if (i % 3 === 0) s.touches.push({ id: `game-${id}`, participantId: id, activityId: "game", at: time })
      if (e.activities.some(a => a.id === "photo") && i % 4 === 0) s.touches.push({ id: `photo-${id}`, participantId: id, activityId: "photo", at: time })
      if (i % 5 !== 0) {
        s.samples.push({ id: `sample-${id}`, participantId: id, productId: products[i % 3].id, rating: i % 7 === 0 ? 3 : i % 2 ? 4 : 5, wouldBuy: i % 4 !== 0, at: time })
        if (i % 8 === 0) s.samples.push({ id: `sample2-${id}`, participantId: id, productId: "zero", rating: 5, wouldBuy: true, at: time })
      }
      if (i % 3 === 0) s.surveys.push({ participantId: id, organization: 4, service: 5, experiences: 4, products: 5, general: i % 7 === 0 ? 3 : 5, nps: i % 7 === 0 ? 6 : i % 2 ? 8 : 10, at: time })
      if (i % 2 === 0) s.coupons.push({ id: `coupon-${id}`, participantId: id, code: `BEN-${e.id}-${i}`, redeemed: i % 4 === 0 ? time : null })
      if (i % [4, 3, 3][ei] === 0) s.sales.push({ id: `sale-${id}`, participantId: id, productId: products[Math.floor(i / [4, 3, 3][ei]) % 3].id, quantity: 2 + i % 3, at: new Date(Date.parse(time) + (e.status === "cerrado" ? 2 * 86400000 : 0)).toISOString() })
      if (e.status === "cerrado" && i % 5 === 0 && i % 4 !== 0) s.followups.push({ id: `follow-${id}`, participantId: id, channel: "WhatsApp", note: "Encuesta posterior registrada (simulación, sin envío).", at: new Date(Date.parse(time) + 86400000).toISOString() })
    }
  })
  return s
}
export function eventMetrics(s: DemoStore, eventId: string) {
  const event = s.events.find(e => e.id === eventId)!
  const people = s.participants.filter(p => p.eventId === eventId), ids = new Set(people.map(p => p.id))
  const attendees = people.filter(p => p.entered), samples = s.samples.filter(x => ids.has(x.participantId))
  const touches = s.touches.filter(x => ids.has(x.participantId)), surveys = s.surveys.filter(x => ids.has(x.participantId))
  const sales = s.sales.filter(x => ids.has(x.participantId)), coupons = s.coupons.filter(x => ids.has(x.participantId))
  const priorPhones = new Set(s.participants.filter(old => old.eventId !== eventId && old.entered && Date.parse(old.entered) < Date.parse(event.date)).map(p => p.phone))
  const recurrent = attendees.filter(p => priorPhones.has(p.phone)).length
  const revenue = sales.reduce((v, sale) => v + (s.products.find(p => p.id === sale.productId)?.price ?? 0) * sale.quantity, 0)
  const contribution = sales.reduce((v, sale) => { const p = s.products.find(p => p.id === sale.productId)!; return v + (p.price - p.cost) * sale.quantity }, 0)
  const sampleCost = samples.reduce((v, x) => v + (s.products.find(p => p.id === x.productId)?.sampleCost ?? 0), 0)
  const spend = event.expenses + sampleCost, buyers = unique(sales.map(x => x.participantId))
  const activityPeople = unique(touches.map(x => x.participantId))
  const responded = surveys.length, satisfaction = responded ? surveys.reduce((v, x) => v + x.general, 0) / responded : null
  const nps = responded ? percent(surveys.filter(x => x.nps >= 9).length - surveys.filter(x => x.nps <= 6).length, responded) : null
  const goalValue = event.objective === "Canjes de beneficios" ? coupons.filter(c => c.redeemed).length : event.objective === "Consentimientos obtenidos" ? people.filter(p => p.consent).length : event.objective === "Participación en actividades" ? activityPeople : buyers
  const stays = attendees.filter(p => p.exited).map(p => (Date.parse(p.exited!) - Date.parse(p.entered!)) / 60000)
  const hourlyCounts = new Map<number, number>()
  for (const p of attendees) { const hour = Number(hourFormatter.format(new Date(p.entered!))); hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1) }
  const startHour = Number(hourFormatter.format(new Date(event.date)))
  const duration = Math.min(24, Math.max(1, Math.ceil((Date.parse(event.end) - Date.parse(event.date)) / 3600000) + 1))
  const hours = [...new Set([...Array.from({ length: duration }, (_, i) => (startHour + i) % 24), ...hourlyCounts.keys()])].sort((a, b) => (a - startHour + 24) % 24 - (b - startHour + 24) % 24)
  return { event, people, attendees, samples, touches, surveys, sales, coupons, recurrent, newPeople: attendees.length - recurrent, revenue, contribution, sampleCost, spend, buyers, activityPeople, satisfaction, nps, goalValue,
    attendanceRate: percent(attendees.length, people.length), conversionRate: percent(buyers, attendees.length), participationRate: percent(activityPeople, attendees.length),
    consent: people.filter(p => p.consent).length, redeemed: coupons.filter(c => c.redeemed).length,
    costPerBuyer: buyers ? spend / buyers : null, netContribution: contribution - spend,
    stayMinutes: stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : null,
    productRows: s.products.filter(p => event.products.some(ep => ep.id === p.id)).map(p => {
      const rows = samples.filter(x => x.productId === p.id), sold = sales.filter(x => x.productId === p.id)
      return { ...p, samples: rows.length, interested: unique(rows.filter(x => x.wouldBuy).map(x => x.participantId)), rating: rows.length ? rows.reduce((a, x) => a + x.rating, 0) / rows.length : null,
        buyers: unique(sold.map(x => x.participantId)), remaining: (event.products.find(ep => ep.id === p.id)?.stock ?? 0) - rows.length - sold.reduce((a, x) => a + x.quantity, 0) }
    }),
    hourly: hours.map(hour => ({ hour: `${hour}:00`, entries: hourlyCounts.get(hour) ?? 0 })),
    activities: event.activities.map(a => ({ ...a, people: unique(touches.filter(t => t.activityId === a.id).map(t => t.participantId)) })),
    cities: [...new Set(attendees.map(p => p.city))].map(city => ({ name: city, value: attendees.filter(p => p.city === city).length })),
    sources: [...new Set(people.map(p => p.source))].map(name => ({ name, value: people.filter(p => p.source === name).length })),
    ages: [...new Set(attendees.map(p => p.age))].map(name => ({ name, value: attendees.filter(p => p.age === name).length })),
    followups: s.followups.filter(x => ids.has(x.participantId)), postSales: sales.filter(x => Date.parse(x.at) > Date.parse(event.end)),
  }
}
export type Operation =
  | { kind: "checkin"; token: string; eventId: string }
  | { kind: "exit"; participantId: string }
  | { kind: "activity"; participantId: string; activityId: string }
  | { kind: "sample"; participantId: string; productId: string; rating: number; wouldBuy: boolean }
  | { kind: "survey"; survey: Omit<Survey, "at"> }
  | { kind: "coupon"; participantId: string }
  | { kind: "redeem"; participantId: string }
  | { kind: "sale"; participantId: string; productId: string; quantity: number }
  | { kind: "followup"; participantId: string; channel: string; note: string }
export function applyOperation(store: DemoStore, action: Operation, id: string, at: string): DemoStore {
  const s: DemoStore = JSON.parse(JSON.stringify(store))
  if (action.kind === "checkin") {
    const p = s.participants.find(p => p.token === action.token.trim() && p.eventId === action.eventId)
    if (!p) throw new Error("El QR no corresponde a una inscripción de este evento.")
    if (p.entered) throw new Error("Esta persona ya tiene un ingreso registrado.")
    const e = s.events.find(e => e.id === action.eventId)!
    if (e.status !== "en_curso") throw new Error("El evento debe estar en curso para registrar ingresos.")
    if (s.participants.filter(p => p.eventId === e.id && p.entered && !p.exited).length >= e.capacity) throw new Error("Se alcanzó la capacidad del evento.")
    p.entered = at
    return s
  }
  const pid = action.kind === "survey" ? action.survey.participantId : action.participantId
  const p = s.participants.find(p => p.id === pid)
  if (!p) throw new Error("Selecciona una persona inscrita.")
  if (!p.entered) throw new Error("Registra el ingreso antes de esta acción.")
  const event = s.events.find(e => e.id === p.eventId)!
  if ((action.kind === "activity" || action.kind === "sample") && (event.status !== "en_curso" || p.exited)) throw new Error("Las experiencias requieren un evento en curso y una persona dentro del evento.")
  if (action.kind === "exit") {
    if (p.exited) throw new Error("La salida ya está registrada.")
    if (Date.parse(at) < Date.parse(p.entered)) throw new Error("La salida no puede ser anterior al ingreso.")
    p.exited = at
  } else if (action.kind === "activity") {
    if (!event.activities.some(a => a.id === action.activityId)) throw new Error("La actividad no pertenece al evento.")
    if (s.touches.some(t => t.participantId === pid && t.activityId === action.activityId)) throw new Error("La participación ya está registrada.")
    s.touches.push({ id, participantId: pid, activityId: action.activityId, at })
  } else if (action.kind === "sample" || action.kind === "sale") {
    const row = eventMetrics(s, p.eventId).productRows.find(row => row.id === action.productId)
    const quantity = action.kind === "sale" ? action.quantity : 1
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("La cantidad debe ser un entero positivo.")
    if (!row || row.remaining < quantity) throw new Error("No hay inventario suficiente para este producto.")
    if (action.kind === "sample") {
      if (!Number.isInteger(action.rating) || action.rating < 1 || action.rating > 5) throw new Error("La evaluación debe estar entre 1 y 5.")
      s.samples.push({ id, participantId: pid, productId: action.productId, rating: action.rating, wouldBuy: action.wouldBuy, at })
      if (event.activities.some(a => a.id === "sampling") && !s.touches.some(t => t.participantId === pid && t.activityId === "sampling")) s.touches.push({ id: `${id}-activity`, participantId: pid, activityId: "sampling", at })
    } else s.sales.push({ id, participantId: pid, productId: action.productId, quantity, at })
  } else if (action.kind === "survey") {
    if (s.surveys.some(x => x.participantId === pid)) throw new Error("Esta persona ya respondió la encuesta.")
    const { nps, organization, service, experiences, products, general } = action.survey
    if (!Number.isInteger(nps) || nps < 0 || nps > 10 || [organization, service, experiences, products, general].some(v => !Number.isInteger(v) || v < 1 || v > 5)) throw new Error("Revisa los puntajes de la encuesta.")
    s.surveys.push({ ...action.survey, at })
  } else if (action.kind === "coupon") {
    if (s.coupons.some(c => c.participantId === pid)) throw new Error("Esta persona ya recibió un beneficio.")
    s.coupons.push({ id, participantId: pid, code: `BEN-${id.slice(-8).toUpperCase()}`, redeemed: null })
  } else if (action.kind === "redeem") {
    const coupon = s.coupons.find(c => c.participantId === pid && !c.redeemed)
    if (!coupon) throw new Error("No tiene un beneficio pendiente de canje.")
    coupon.redeemed = at
  } else if (action.kind === "followup") {
    if (!p.consent && action.channel !== "Observación interna") throw new Error("Esta persona no autorizó comunicaciones. Puedes registrar una observación interna.")
    if (!action.note.trim()) throw new Error("Describe la acción de seguimiento.")
    s.followups.push({ id, participantId: pid, channel: action.channel, note: action.note.trim(), at })
  }
  return s
}
export function planScenario(s: DemoStore, registrations: number, budget: number) {
  const historical = s.events.filter(e => e.status === "cerrado").map(e => eventMetrics(s, e.id))
  const registered = historical.reduce((v, m) => v + m.people.length, 0), attended = historical.reduce((v, m) => v + m.attendees.length, 0)
  const attendance = registered ? attended / registered : 0.75
  const conversion = attended ? historical.reduce((v, m) => v + m.buyers, 0) / attended : 0.25
  const expected = Math.round(registrations * attendance), buyers = Math.round(expected * conversion)
  const samplesPerPerson = attended ? historical.reduce((v, m) => v + m.samples.length, 0) / attended : 0.8
  const samples = Math.ceil(expected * samplesPerPerson * 1.1)
  const weights = s.products.map(p => ({ ...p, signals: historical.reduce((v, m) => v + (m.productRows.find(r => r.id === p.id)?.interested ?? 0), 0) }))
  const totalSignals = weights.reduce((v, p) => v + p.signals, 0)
  const raw = weights.map(p => ({ ...p, allocation: samples * (totalSignals ? p.signals / totalSignals : 1 / weights.length) }))
  const allocation = raw.map(p => ({ ...p, quantity: Math.floor(p.allocation) }))
  const remainder = samples - allocation.reduce((v, p) => v + p.quantity, 0)
  const order = raw.map((p, i) => ({ i, fraction: p.allocation % 1 })).sort((a, b) => b.fraction - a.fraction)
  for (let i = 0; i < remainder; i++) allocation[order[i].i].quantity++
  return { historical: historical.length, expected, low: Math.round(expected * 0.85), high: Math.min(registrations, Math.round(expected * 1.15)), buyers, samples, staff: Math.max(1, Math.ceil(expected / 60)), costPerBuyer: buyers ? budget / buyers : null, allocation, attendance: attendance * 100, conversion: conversion * 100 }
}
