const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../lib/event-intelligence.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(compiled, { module: moduleObject, exports: moduleObject.exports, Date, Set, Map, Intl, JSON, Math, Number, Error });
const { createDemoStore, eventMetrics, applyOperation, planScenario, registerParticipant } = moduleObject.exports;
const now = "2026-10-04T20:00:00Z";

test("los datos de ejemplo tienen inventario coherente, ventas verificables y seguimiento consentido", () => {
  const store = createDemoStore();
  for (const event of store.events) {
    const metrics = eventMetrics(store, event.id);
    assert.ok(metrics.productRows.every(p => p.remaining >= 0));
    assert.ok(metrics.buyers <= metrics.attendees.length);
    assert.ok(metrics.participationRate <= 100);
    assert.equal(metrics.newPeople + metrics.recurrent, metrics.attendees.length);
    assert.ok(metrics.followups.every(f => store.participants.find(p => p.id === f.participantId).consent));
    assert.equal(metrics.netContribution, metrics.contribution - metrics.spend);
  }
  assert.ok(eventMetrics(store, "festival").followups.length > 0);
});
test("la inscripción genera una entrada verificable y mantiene el consentimiento opcional", () => {
  const store = createDemoStore();
  const data = { eventId: "experience", name: "Persona de prueba", phone: "7123 4567", city: "La Paz", age: "25-34", source: "Presencial", consent: false };
  const result = registerParticipant(store, data, "person-new", "CCE-entry-new", now);
  assert.equal(result.participant.consent, false);
  assert.equal(result.participant.phone, "71234567");
  assert.throws(() => registerParticipant(result.store, data, "another", "another-token", now), /ya tiene/);
  assert.throws(() => registerParticipant(store, { ...data, eventId: "festival" }, "another", "another-token", now), /abierto/);
  const checked = applyOperation(result.store, { kind: "checkin", eventId: "experience", token: "CCE-entry-new" }, "x", now);
  assert.equal(checked.participants.find(p => p.id === "person-new").entered, now);
});
test("el ingreso valida el evento, impide duplicados y no muta el estado original", () => {
  const store = createDemoStore(), p = store.participants.find(p => p.eventId === "experience" && !p.entered);
  assert.throws(() => applyOperation(store, { kind: "checkin", token: p.token, eventId: "sport" }, "x", now), /no corresponde/);
  const next = applyOperation(store, { kind: "checkin", token: p.token, eventId: "experience" }, "x", now);
  assert.equal(store.participants.find(person => person.id === p.id).entered, null);
  assert.equal(next.participants.find(person => person.id === p.id).entered, now);
  assert.equal(eventMetrics(next, "experience").attendees.length, eventMetrics(store, "experience").attendees.length + 1);
  assert.throws(() => applyOperation(next, { kind: "checkin", token: p.token, eventId: "experience" }, "y", now), /ya tiene/);
});
test("no se admite ingreso en evento cerrado ni sobre la capacidad física", () => {
  const store = createDemoStore(), event = store.events.find(e => e.id === "experience"), p = store.participants.find(p => p.eventId === event.id && !p.entered);
  event.status = "cerrado";
  assert.throws(() => applyOperation(store, { kind: "checkin", token: p.token, eventId: event.id }, "x", now), /en curso/);
  event.status = "en_curso"; event.capacity = 1;
  assert.throws(() => applyOperation(store, { kind: "checkin", token: p.token, eventId: event.id }, "x", now), /capacidad/);
});
test("una muestra descuenta inventario y cuenta participación sin duplicar personas", () => {
  const store = createDemoStore(), p = store.participants.find(p => p.eventId === "experience" && p.entered);
  const before = eventMetrics(store, "experience");
  const next = applyOperation(store, { kind: "sample", participantId: p.id, productId: "zero", rating: 4, wouldBuy: true }, "sample-new", now);
  const after = eventMetrics(next, "experience");
  assert.equal(after.samples.length, before.samples.length + 1);
  assert.equal(after.productRows.find(p => p.id === "zero").remaining, before.productRows.find(p => p.id === "zero").remaining - 1);
  assert.equal(after.attendees.length, before.attendees.length);
  assert.ok(after.participationRate <= 100);
});
test("no se permiten muestras sin ingreso, inventario negativo ni ventas fraccionarias", () => {
  const store = createDemoStore(), pending = store.participants.find(p => p.eventId === "experience" && !p.entered), p = store.participants.find(p => p.eventId === "experience" && p.entered);
  assert.throws(() => applyOperation(store, { kind: "sample", participantId: pending.id, productId: "zero", rating: 5, wouldBuy: true }, "x", now), /ingreso/);
  assert.throws(() => applyOperation(store, { kind: "sale", participantId: p.id, productId: "zero", quantity: 999 }, "x", now), /inventario/);
  assert.throws(() => applyOperation(store, { kind: "sale", participantId: p.id, productId: "zero", quantity: 0.5 }, "x", now), /entero/);
});
test("canjes y encuestas no se duplican, una encuesta calcula NPS con el denominador correcto", () => {
  const store = createDemoStore(), p = store.participants.find(p => p.eventId === "experience" && p.entered && !store.surveys.some(s => s.participantId === p.id) && !store.coupons.some(c => c.participantId === p.id));
  let next = applyOperation(store, { kind: "coupon", participantId: p.id }, "coupon-new", now);
  assert.throws(() => applyOperation(next, { kind: "coupon", participantId: p.id }, "coupon-new2", now), /ya recibió/);
  next = applyOperation(next, { kind: "redeem", participantId: p.id }, "redeem", now);
  assert.throws(() => applyOperation(next, { kind: "redeem", participantId: p.id }, "redeem2", now), /pendiente/);
  const survey = { participantId: p.id, organization: 4, service: 5, experiences: 4, products: 5, general: 4, nps: 10 };
  next = applyOperation(next, { kind: "survey", survey }, "survey", now);
  assert.throws(() => applyOperation(next, { kind: "survey", survey }, "survey2", now), /ya respondió/);
  const m = eventMetrics(next, "experience");
  const nps = Math.round((m.surveys.filter(s => s.nps >= 9).length - m.surveys.filter(s => s.nps <= 6).length) / m.surveys.length * 1000) / 10;
  assert.equal(m.nps, nps);
});
test("seguimiento externo respeta consentimiento, pero permite observaciones internas", () => {
  const store = createDemoStore(), p = store.participants.find(p => p.entered && !p.consent);
  assert.throws(() => applyOperation(store, { kind: "followup", participantId: p.id, channel: "WhatsApp", note: "Resultado" }, "x", now), /autorizó/);
  const next = applyOperation(store, { kind: "followup", participantId: p.id, channel: "Observación interna", note: "Revisar experiencia" }, "x", now);
  assert.equal(next.followups.length, store.followups.length + 1);
});
test("la planificación reparte exactamente las muestras y no convierte presupuesto en ventas ficticias", () => {
  const store = createDemoStore(), a = planScenario(store, 250, 2000), b = planScenario(store, 250, 4000);
  assert.equal(a.allocation.reduce((sum, p) => sum + p.quantity, 0), a.samples);
  assert.ok(a.low <= a.expected && a.expected <= a.high && a.high <= 250);
  assert.equal(a.buyers, b.buyers);
  assert.equal(b.costPerBuyer, a.costPerBuyer * 2);
});
test("evento vacío muestra ausencia de evidencia y la recurrencia usa asistencias previas", () => {
  const store = createDemoStore(), event = { ...store.events[0], id: "empty", date: "2026-11-01T14:00:00-04:00" };
  store.events.push(event);
  const m = eventMetrics(store, event.id);
  assert.equal(m.satisfaction, null); assert.equal(m.nps, null); assert.equal(m.costPerBuyer, null);
  assert.equal(eventMetrics(store, "festival").recurrent, 0);
  assert.ok(eventMetrics(store, "experience").recurrent > 0);
});
