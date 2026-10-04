/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS, as in the existing tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8") + (relative.endsWith("event-app.tsx") ? "\nexport { AuthModal, Landing };" : "");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: (name) => name in dependencies ? dependencies[name] : require(name), Buffer, Date, Error, Number, FormData: dependencies.FormData ?? globalThis.FormData, fetch: dependencies.fetch, localStorage: dependencies.localStorage, process: { env: { AUTH_SESSION_SECRET: "test-secret" } } });
  return loadedModule.exports;
}

function fixture() {
  const tables = { role: [{ id: 9, nombre: "participante" }], usuario: [], producto: [], preferencia_calif: [] };
  const writes = [];
  const jar = new Map();
  const next = { NextResponse: { json(body, options = {}) {
    return { body, status: options.status ?? 200, cookies: { set(name, value, attributes) { jar.set(name, { value, ...attributes }); } } };
  } } };
  let fail = false;
  const db = { from(name) {
    let rows = tables[name] || [];
    let inserted = null;
    const query = {
      select() { return query; },
      eq(key, value) { rows = rows.filter((row) => row[key] === value); return query; },
      insert(value) { inserted = value; return query; },
      single() { return query; },
      maybeSingle() { return query; },
      then(resolve, reject) {
        if (fail) return Promise.resolve({ data: null, error: { code: "offline" } }).then(resolve, reject);
        if (inserted) {
          if (name === "usuario" && tables.usuario.some((u) => u.email === inserted.email || u.celular === inserted.celular)) return Promise.resolve({ data: null, error: { code: "23505" } }).then(resolve, reject);
          const row = { id: tables[name].length + 1, activo: true, ...inserted };
          tables[name].push(row);
          writes.push(name);
          return Promise.resolve({ data: { id: row.id, nombre: row.nombre, apellido: row.apellido, email: row.email }, error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: rows[0] ?? null, error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const dependencies = {
    "server-only": {}, "next/server": next,
    "@/lib/auth/forms": load("lib/auth/forms.ts"),
    "next/headers": { cookies: async () => ({ get: (name) => jar.get(name) }) },
    "@/lib/supabase/server": { createServiceClient: () => db },
  };
  const session = load("lib/auth/session.ts", dependencies);
  dependencies["@/lib/auth/session"] = session;
  return { tables, writes, jar, session, fail() { fail = true; }, register: load("app/api/usuarios/register/route.ts", dependencies), login: load("app/api/auth/login/route.ts", dependencies), logout: load("app/api/auth/logout/route.ts", dependencies) };
}
const account = { nombre: "Valeria", apellido: "Rojas", email: "VALERIA@example.test", celular: "+59176543210", password: "correct-password", age: "18–24" };
const request = (body) => ({ json: async () => body });

test("crear una cuenta guarda solo el usuario, asigna el rol real y abre una sesión sin inscripción", async () => {
  const f = fixture();
  const result = await f.register.POST(request(account));
  assert.equal(result.status, 201);
  assert.equal(result.body.data.email, "valeria@example.test");
  assert.equal(result.body.data.password_hash, undefined);
  assert.deepEqual(f.writes, ["usuario"]);
  assert.equal(f.tables.usuario[0].role_id, 9);
  assert.equal(f.tables.usuario[0].rango_edad, "r18_24");
  assert.notEqual(f.tables.usuario[0].password_hash, account.password);
  assert.equal(f.jar.get(f.session.SESSION_COOKIE).httpOnly, true);
  assert.equal((await f.session.readSessionUser()).id, result.body.data.id);
});

test("cuenta creada puede cerrar sesión y volver a entrar; Recordarme persiste la cookie", async () => {
  const f = fixture();
  await f.register.POST(request(account));
  await f.logout.POST();
  assert.equal(await f.session.readSessionUser(), null);
  const result = await f.login.POST(request({ email: account.email, password: account.password, remember: true }));
  assert.equal(result.status, 200);
  assert.ok(f.jar.get(f.session.SESSION_COOKIE).maxAge > 0);
  assert.equal((await f.session.readSessionUser()).nombre, "Valeria");
  assert.deepEqual(f.writes, ["usuario"]);
});

test("contraseña incorrecta y cuenta inactiva no crean sesión", async () => {
  const f = fixture();
  await f.register.POST(request(account));
  await f.logout.POST();
  assert.equal((await f.login.POST(request({ email: account.email, password: "wrong" }))).status, 401);
  assert.equal(await f.session.readSessionUser(), null);
  f.tables.usuario[0].activo = false;
  assert.equal((await f.login.POST(request({ email: account.email, password: account.password }))).status, 403);
});

test("duplicados y errores de base de datos no informan éxito", async () => {
  const f = fixture();
  await f.register.POST(request(account));
  assert.equal((await f.register.POST(request(account))).status, 409);
  assert.equal(f.tables.usuario.length, 1);
  f.fail();
  assert.equal((await f.login.POST(request({ email: account.email, password: account.password }))).status, 503);
  assert.equal((await f.register.POST(request({ ...account, email: "other@example.test" }))).status, 503);
});

test("sesiones manipuladas o vencidas se rechazan y el rol se revalida en la base", async () => {
  const f = fixture();
  const token = f.session.createSessionToken(1);
  assert.equal(f.session.verifySessionToken(token), 1);
  assert.equal(f.session.verifySessionToken(token + "x"), null);
  assert.equal(f.session.verifySessionToken("malformed"), null);
  const { createHmac } = require("node:crypto");
  const payload = Buffer.from(JSON.stringify({ id: 1, exp: Date.now() - 1000 })).toString("base64url");
  const signature = createHmac("sha256", "test-secret").update(`cce-user-session:${payload}`).digest("base64url");
  assert.equal(f.session.verifySessionToken(`${payload}.${signature}`), null);
  await f.register.POST(request(account));
  f.tables.role[0].nombre = "administrador";
  assert.equal(await f.session.readSessionUser(), null);
  await f.logout.POST();
  assert.equal((await f.login.POST(request({ email: account.email, password: account.password }))).status, 403);
});

test("datos incompletos y rango de edad inválido no insertan usuarios", async () => {
  const f = fixture();
  assert.equal((await f.register.POST(request({ ...account, password: "short" }))).status, 400);
  assert.equal((await f.register.POST(request({ ...account, age: "invalid" }))).status, 400);
  assert.equal((await f.login.POST(request({ email: "invalid", password: "test" }))).status, 400);
  assert.deepEqual(f.writes, []);
});

 test("registro incompleto identifica cada campo en español sin consultar la base", async () => {
  for (const field of ["nombre", "apellido", "email", "celular", "password"]) {
    const f = fixture();
    const incomplete = { ...account };
    delete incomplete[field];
    const result = await f.register.POST(request(incomplete));
    assert.equal(result.status, 400);
    assert.equal(result.body.field, field);
    assert.notEqual(result.body.error, "Required");
    assert.match(result.body.error, /Ingresa/);
    assert.deepEqual(f.writes, []);
  }
});


test("formulario conserva campos desmontados hasta el POST final de registro", async () => {
  const f = fixture();
  const React = require("react");
  const states = [];
  let cursor = 0;
  let completed = null;
  const requests = [];
  const { AuthModal } = load("components/event-app.tsx", {
    react: { ...React, useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    } },
    "next/dynamic": { default: () => () => null },
    "./ml-predictions": { MlPredictions: () => null },
    "@/components/qr-scanner-modal": { default: () => null },
    "@/lib/auth/forms": load("lib/auth/forms.ts"),
    "@/lib/demo-tickets": load("lib/demo-tickets.ts"),
    "qrcode": { default: {} },
    FormData: class {
      constructor(form) { this.values = form.values; }
      entries() { return this.values; }
      getAll(name) { return this.values.filter(([key]) => key === name).map(([, value]) => value); }
      has(name) { return this.values.some(([key]) => key === name); }
    },
    fetch: async (url, options) => {
      const payload = JSON.parse(options.body);
      requests.push({ url, payload });
      const result = await f.register.POST(request(payload));
      return { ok: result.status < 400, json: async () => result.body };
    },
  });
  function nodes(node) {
    if (node == null || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (typeof node.type === "function") return nodes(node.type(node.props));
    return [node, ...nodes(node.props?.children)];
  }
  function render() {
    cursor = 0;
    return nodes(AuthModal({ mode: "register", onModeChange() {}, onClose() {}, onDone(user) { completed = user; } }));
  }
  async function submit(tree, values) {
    // Serialize only fields actually mounted in this step, as the browser does.
    const inputs = tree.filter((node) => ["input", "select"].includes(node.type) && node.props.name);
    const entries = inputs.filter((node) => !["radio", "checkbox"].includes(node.props.type) || node.props.checked)
      .map((node) => [node.props.name, values[node.props.name] ?? node.props.value ?? node.props.defaultValue ?? ""]);
    await tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: { values: entries } });
  }
  await submit(render(), { ...account, phone_code: "+591", celular: "76543210", password2: account.password });
  let tree = render();
  tree.find((node) => node.props?.name === "age" && node.props.value === "18–24").props.onChange();
  await submit(render(), { ciudad: "La Paz" });
  assert.equal(requests.length, 0);
  await submit(render(), {});
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/usuarios/register");
  assert.equal(requests[0].payload.nombre, account.nombre);
  assert.equal(requests[0].payload.celular, account.celular);
  assert.equal(requests[0].payload.password, account.password);
  assert.equal(requests[0].payload.ciudad, "La Paz");
  assert.equal(completed.nombre, account.nombre);
  assert.deepEqual(f.writes, ["usuario"]);
});


test("tickets de ejemplo conservan nombre, evento y QR, sobreviven a recargas y no se duplican", async () => {
  const { enrollDemoEvent, readDemoTickets, demoQrPayload } = load("lib/demo-tickets.ts");
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const user = { id: 42, nombre: "Valeria María", apellido: "Rojas Flores" };
  const first = enrollDemoEvent(storage, user, "experience-2026");
  assert.equal(first.ticket.fullName, "Valeria María Rojas Flores");
  const duplicate = enrollDemoEvent(storage, user, "experience-2026");
  assert.equal(duplicate.tickets.length, 1);
  assert.equal(duplicate.ticket.id, first.ticket.id);
  enrollDemoEvent(storage, user, "ritmo-urbano");
  const restored = readDemoTickets(storage, user.id);
  assert.equal(restored.length, 2);
  assert.equal(restored[1].eventId, "ritmo-urbano");
  assert.equal(readDemoTickets(storage, 43).length, 0);
  const payload = JSON.parse(demoQrPayload(first.ticket));
  assert.equal(payload.tipo, "ticket_ejemplo");
  assert.equal(payload.nombre, first.ticket.fullName);
  assert.equal(payload.evento, "experience-2026");
  const png = await require("qrcode").toBuffer(demoQrPayload(first.ticket));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
});

test("datos locales dañados o tickets ajenos no se muestran en la cuenta", () => {
  const { readDemoTickets } = load("lib/demo-tickets.ts");
  assert.equal(readDemoTickets({ getItem: () => "invalid json" }, 42).length, 0);
  const other = { id: "DEMO-43-fan-zone", userId: 43, eventId: "fan-zone", fullName: "Otra Persona", createdAt: new Date().toISOString() };
  assert.equal(readDemoTickets({ getItem: () => JSON.stringify([other]) }, 42).length, 0);
});


test("inscripción pendiente continúa al autenticarse y abre el ticket del evento elegido", async () => {
  const React = require("react");
  const states = [];
  let cursor = 0;
  const effects = [];
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { Landing } = load("components/event-app.tsx", {
    react: { ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
      },
      useCallback: (callback) => callback,
      useEffect: (callback) => effects.push(callback),
    },
    "next/dynamic": { default: () => () => null },
    "./ml-predictions": { MlPredictions: () => null },
    "@/components/qr-scanner-modal": { default: () => null },
    "@/lib/auth/forms": load("lib/auth/forms.ts"),
    "@/lib/demo-tickets": load("lib/demo-tickets.ts"),
    "qrcode": { default: {} }, localStorage: storage,
  });
  function nodes(node) {
    if (node == null || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  function render() { cursor = 0; effects.length = 0; return nodes(Landing({ onRole() {} })); }
  let tree = render();
  // Session lookup finished with no authenticated user.
  states[7] = false;
  tree = render();
  tree.filter((node) => node.type?.name === "EventCard")[1].props.onDetail();
  tree = render();
  const detail = tree.find((node) => node.type?.name === "EventDetail");
  assert.equal(detail.props.event.id, "ritmo-urbano");
  detail.props.onJoin();
  tree = render();
  const auth = tree.find((node) => node.type?.name === "AuthModal");
  assert.equal(auth.props.mode, "login");
  auth.props.onDone({ id: 42, nombre: "Valeria", apellido: "Rojas", email: "valeria@example.test" }, false);
  tree = render();
  // Run the ticket-loading effect after the authenticated identity changes.
  effects[1]();
  tree = render();
  const ticket = tree.find((node) => node.type?.name === "TicketScreen");
  assert.equal(ticket.props.ticket.fullName, "Valeria Rojas");
  assert.equal(ticket.props.ticket.eventId, "ritmo-urbano");
});
