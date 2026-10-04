"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import dynamic from "next/dynamic"
import QrScannerModal from "@/components/qr-scanner-modal"

const StatisticsDashboard = dynamic(() => import("@/components/statistics-dashboard"), {
  loading: () => <p className="stats-notice">Cargando panel…</p>,
})
import { MlPredictions } from "./ml-predictions"
import { getAdminEntityForPage, getDisplayRows } from "@/lib/admin-data"
import { getCatalogOptionsForField } from "@/lib/catalog-options"
import { paginateRows } from "@/lib/pagination"

type Role = "cliente" | "organizador" | "administrador" | "marketing"
type TicketUser = { id: number; nombre: string; apellido: string }
type IconName = "arrow" | "bell" | "calendar" | "camera" | "chart" | "check" | "chevron" | "clock" | "download" | "eye" | "filter" | "grid" | "heart" | "home" | "map" | "menu" | "plus" | "qr" | "search" | "settings" | "spark" | "ticket" | "users" | "x"

const heroPhoto =
  "/images/hero.jpg"

const eventPhotos = [
  heroPhoto,
  "/images/event-2.jpg",
  "/images/event-3.jpg",
]

const socialNetworks = [
  { name: "Instagram", href: "https://www.instagram.com/cocacolabol/", image: eventPhotos[0] },
  { name: "TikTok", href: "https://www.tiktok.com/@cocacola", image: eventPhotos[1] },
  { name: "YouTube", href: "https://www.youtube.com/@CocaCola", image: eventPhotos[2] },
  { name: "Facebook", href: "https://www.facebook.com/CocaColaBO/", image: eventPhotos[0] },
  { name: "X", href: "https://x.com/CocaCola", image: eventPhotos[1] },
]

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    filter: <path d="M3 5h18l-7 8v5l-4 2v-7z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" />
        <path d="M13 7v11" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <img
        src="/images/coca-cola-logo.svg"
        alt="Coca-Cola"
      />
      <span>
        Event
        <br />
        Intelligence
      </span>
    </div>
  )
}

function Button({
  children,
  kind = "primary",
  icon,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode
  kind?: "primary" | "secondary" | "ghost" | "dark"
  icon?: IconName
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      className={`btn btn-${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {icon && <Icon name={icon} size={18} />}
    </button>
  )
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "red" | "green" | "yellow" | "neutral" | "dark"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function QR({ small = false }: { small?: boolean }) {
  const cells = [
    0, 1, 2, 4, 5, 6, 8, 10, 12, 13, 14, 16, 17, 18, 20, 22, 24, 25, 26, 28, 30,
    32, 33, 34, 36, 38, 40, 41, 42, 44, 46, 48, 49, 50, 52, 53, 54, 56, 58, 60,
    62, 64, 65, 66, 68, 70, 72, 73, 74, 76, 78, 80,
  ]
  return (
    <div
      className={`qr ${small ? "qr-small" : ""}`}
      aria-label="Código QR de demostración"
    >
      {Array.from({ length: 81 }, (_, i) => (
        <i
          key={i}
          className={
            cells.includes(i) || (i * 7 + (i % 5)) % 11 < 3 ? "on" : ""
          }
        />
      ))}
    </div>
  )
}

const events = [
  {
    title: "Coca-Cola Experience 2026",
    type: "Experiencia de marca",
    date: "18 ABR",
    time: "16:00",
    place: "Fexpocruz · Santa Cruz",
    price: "GRATIS",
    promo: "Muestra gratis",
    spots: 48,
    image: eventPhotos[0],
  },
  {
    title: "Ritmo Urbano Sessions",
    type: "Concierto",
    date: "26 ABR",
    time: "19:30",
    place: "Teatro al Aire Libre · La Paz",
    price: "Bs 120",
    promo: "2×1",
    spots: 86,
    image: eventPhotos[1],
  },
  {
    title: "Copa Coca-Cola Fan Zone",
    type: "Deportivo",
    date: "03 MAY",
    time: "14:00",
    place: "Estadio Félix Capriles · Cochabamba",
    price: "GRATIS",
    promo: "Cupón de bienvenida",
    spots: 124,
    image: eventPhotos[2],
  },
]

function ClientNavbar({
  onLogin,
  onRole,
}: {
  onLogin: (mode: "login" | "register") => void
  onRole: (r: Role) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <header className="client-nav">
      <Logo />
      <nav>
        <a href="#eventos">Eventos</a>
        <a href="#social">Redes sociales</a>
      </nav>
      <div className="nav-actions">
        <Button kind="ghost" onClick={() => onLogin("login")}>
          Iniciar sesión
        </Button>
        <Button onClick={() => onLogin("register")}>Crear cuenta</Button>
      </div>
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú"
      >
        <Icon name={open ? "x" : "menu"} />
      </button>
      {open && (
        <div className="mobile-nav">
          <a href="#eventos">Eventos</a>
          <a href="#social">Redes sociales</a>
          <Button onClick={() => onLogin("login")}>Iniciar sesión</Button>
          <button onClick={() => onRole("organizador")}>
            Vista organizador
          </button>
        </div>
      )}
    </header>
  )
}

function EventCard({
  event,
  onDetail,
}: {
  event: typeof events[number]
  onDetail: () => void
}) {
  return (
    <article className="event-card">
      <div className="event-image">
        <img
          src={event.image}
          alt={`${event.title}, público disfrutando el evento`}
        />
        <Badge tone="red">{event.promo}</Badge>
        <button className="heart-btn" aria-label="Guardar evento">
          <Icon name="heart" />
        </button>
      </div>
      <div className="event-content">
        <div className="event-date">
          <strong>{event.date.split(" ")[0]}</strong>
          <span>{event.date.split(" ")[1]}</span>
        </div>
        <div className="event-copy">
          <span className="eyebrow">{event.type}</span>
          <h3>{event.title}</h3>
          <p>
            <Icon name="clock" size={15} /> {event.time} · {event.place}
          </p>
          <div className="event-bottom">
            <div>
              <strong>{event.price}</strong>
              <span>{event.spots} cupos disponibles</span>
            </div>
            <Button kind="dark" onClick={onDetail} icon="arrow">
              Ver detalle
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function EventDetail({
  onClose,
  onJoin,
}: {
  onClose: () => void
  onJoin: () => void
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" />
        </button>
        <div className="detail-hero">
          <img src={heroPhoto} alt="Concierto de Coca-Cola Experience 2026" />
          <div>
            <Badge tone="red">EXPERIENCIA DE MARCA</Badge>
            <h2>
              Coca-Cola
              <br />
              Experience 2026
            </h2>
            <p>
              Una tarde para descubrir nuevos sabores, música en vivo y
              experiencias creadas para compartir.
            </p>
          </div>
        </div>
        <div className="detail-layout">
          <main>
            <section>
              <span className="section-kicker">SOBRE EL EVENTO</span>
              <h3>Vive la experiencia desde adentro</h3>
              <p>
                Conectamos a nuestra comunidad con el universo Coca-Cola a
                través de música, sabor y momentos memorables. El objetivo es
                conocer tus preferencias y construir experiencias que disfrutes
                aún más.
              </p>
            </section>
            <section>
              <span className="section-kicker">CRONOGRAMA</span>
              <div className="timeline">
                {[
                  [
                    "16:00",
                    "Apertura y check-in",
                    "Recibe tu pulsera y explora el espacio.",
                  ],
                  [
                    "17:00",
                    "Laboratorio de sabores",
                    "Degustación guiada de Original, Zero y Cherry.",
                  ],
                  [
                    "19:00",
                    "Ritmo Urbano",
                    "Show en vivo y dinámica de premios.",
                  ],
                  [
                    "21:30",
                    "Cierre y beneficios",
                    "Canjea tu cupón antes de salir.",
                  ],
                ].map((x) => (
                  <div key={x[0]}>
                    <time>{x[0]}</time>
                    <i />
                    <span>
                      <strong>{x[1]}</strong>
                      <small>{x[2]}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <span className="section-kicker">ACTIVIDADES</span>
              <div className="activity-grid">
                {[
                  ["spark", "Laboratorio de sabores"],
                  ["camera", "Photocall 360°"],
                  ["ticket", "Reto y premios"],
                  ["heart", "Encuesta express"],
                ].map(([icon, label]) => (
                  <div key={label}>
                    <Icon name={icon as IconName} />
                    <strong>{label}</strong>
                    <span>Escanea, participa y suma beneficios.</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
          <aside className="booking-card">
            <Badge tone="green">GRATIS</Badge>
            <h3>Reserva tu lugar</h3>
            <div>
              <Icon name="calendar" />
              <span>
                <strong>Sábado, 18 de abril</strong>
                <small>16:00 — 22:00</small>
              </span>
            </div>
            <div>
              <Icon name="map" />
              <span>
                <strong>Fexpocruz</strong>
                <small>Santa Cruz de la Sierra</small>
              </span>
            </div>
            <div className="capacity">
              <span>
                <b>48</b> cupos disponibles
              </span>
              <div>
                <i />
              </div>
            </div>
            <Button onClick={onJoin} icon="arrow">
              Inscribirme ahora
            </Button>
            <small>Entrada personal. Recibirás tu QR al confirmar.</small>
          </aside>
        </div>
      </div>
    </div>
  )
}

function AuthModal({
  mode: initialMode,
  onClose,
  onDone,
}: {
  mode: "login" | "register"
  onClose: () => void
  onDone: (user?: TicketUser) => void
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [age, setAge] = useState("")
  const [prefs, setPrefs] = useState<string[]>([])
  const formData = useRef<Record<string, string>>({})
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const current = Object.fromEntries(fd.entries()) as Record<string, string>
    current.preferencias = fd.getAll("preferencias").join(",")
    if (current.celular !== undefined || current.phone_code !== undefined) {
      current.celular = `${current.phone_code ?? ""}${current.celular ?? ""}`.trim()
    }

    if (mode === "forgot") {
      setLoading(true)
      window.setTimeout(() => {
        setLoading(false)
        onDone()
      }, 650)
      return
    }

    if (mode === "register" && step < 3) {
      if (step === 1 && current.password !== current.password2) {
        setError("Las contraseñas no coinciden")
        return
      }
      if (step === 2 && !age) {
        setError("Selecciona tu rango de edad")
        return
      }
      Object.assign(formData.current, current, { age })
      setStep(step + 1)
      return
    }

    setLoading(true)
    try {
      const payload =
        mode === "register"
          ? {
              ...formData.current,
              ...current,
              preferencias: (current.preferencias ||
                formData.current.preferencias ||
                ""
              )
                .split(",")
                .filter(Boolean),
            }
          : { email: current.email, password: current.password }
      const res = await fetch(
        mode === "register" ? "/api/usuarios/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ocurrió un error, intenta de nuevo")
      }
      onDone(json.data ?? undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-backdrop auth-backdrop">
      <div className="auth-modal">
        <div className="auth-visual">
          <Logo light />
          <div>
            <span>
              EVENTOS QUE
              <br />
              SE SIENTEN.
            </span>
            <p>Experiencias que se convierten en momentos para recordar.</p>
          </div>
          <small>Medir. Entender. Mejorar cada experiencia.</small>
        </div>
        <form onSubmit={submit} className="auth-form">
          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <Icon name="x" />
          </button>
          {mode === "register" && (
            <>
              <span className="form-step">PASO {step} DE 3</span>
              <div className="progress">
                <i style={{ width: `${step * 33.33}%` }} />
              </div>
            </>
          )}
          <h2>
            {mode === "login"
              ? "Bienvenido de nuevo"
              : mode === "forgot"
                ? "Recupera tu acceso"
                : step === 1
                  ? "Crea tu cuenta"
                  : step === 2
                    ? "Cuéntanos sobre ti"
                    : "Ya casi terminamos"}
          </h2>
          <p>
            {mode === "login"
              ? "Tus entradas, cupones y experiencias están aquí."
              : mode === "forgot"
                ? "Te enviaremos un código de 6 dígitos."
                : "Personaliza tu experiencia Coca-Cola."}
          </p>
          {mode === "login" && (
            <>
              <Field
                label="Correo o celular"
                name="email"
                type="email"
                placeholder="nombre@correo.com"
                required
              />
              <Field
                label="Contraseña"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <div className="form-inline">
                <label>
                  <input type="checkbox" /> Recordarme
                </label>
                <button type="button" onClick={() => setMode("forgot")}>
                  Olvidé mi contraseña
                </button>
              </div>
            </>
          )}
          {mode === "forgot" && (
            <>
              <Field
                label="Correo o celular"
                type="email"
                placeholder="nombre@correo.com"
                required
              />
              <div className="info-box">
                Usaremos el canal asociado a tu cuenta. El código vence en 10
                minutos.
              </div>
            </>
          )}
          {mode === "register" && step === 1 && (
            <div className="field-grid">
              <Field label="Nombre" name="nombre" placeholder="Ej. Valeria" required />
              <Field label="Apellido" name="apellido" placeholder="Ej. Rojas" required />
              <Field
                label="Correo electrónico"
                name="email"
                type="email"
                placeholder="nombre@correo.com"
                help="Te enviaremos tu entrada aquí"
                required
              />
             <PhoneField />
              <Field
                label="Contraseña"
                name="password"
                type="password"
                placeholder="8+ caracteres"
                required
              />
              <Field
                label="Confirmar contraseña"
                name="password2"
                type="password"
                placeholder="Repite tu contraseña"
                required
              />
            </div>
          )}
          {mode === "register" && step === 2 && (
            <>
              <Field
  label="Departamento"
  name="ciudad"
  kind="select"
  options={[
    "La Paz",
    "Cochabamba",
    "Santa Cruz",
    "Oruro",
    "Potosí",
    "Chuquisaca",
    "Tarija",
    "Beni",
    "Pando"
  ]}
  required
/>
              <fieldset>
                <legend>
                  Rango de edad <b>*</b>
                </legend>
                <div className="chip-row">
                  {["13–17", "18–24", "25–34", "35–44", "45–54", "55+"].map(
                    (x) => (
                      <label className={age === x ? "selected" : ""} key={x}>
                        <input
                          type="radio"
                          name="age"
                          value={x}
                          checked={age === x}
                          onChange={() => setAge(x)}
                        />
                        {x}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  Preferencias de producto <b>*</b>
                </legend>
                <div className="preference-grid">
                  {[
                    "Original",
                    "Zero Sin Azúcar",
                    "Light",
                    "Sprite",
                    "Fanta",
                    "Aguas",
                  ].map((x) => (
                    <label
                      className={prefs.includes(x) ? "selected" : ""}
                      key={x}
                    >
                      <input
                        type="checkbox"
                        name="preferencias"
                        value={x}
                        checked={prefs.includes(x)}
                        onChange={(e) =>
                          setPrefs(
                            e.target.checked
                              ? [...prefs, x]
                              : prefs.filter((p) => p !== x),
                          )
                        }
                      />
                      <span>{x.slice(0, 2)}</span>
                      {x}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {mode === "register" && step === 3 && (
            <>
              <Field
                label="¿Cómo te enteraste?"
                kind="select"
                options={[
                  "Redes sociales",
                  "Amigo o familiar",
                  "Punto de venta",
                  "Publicidad",
                  "Evento anterior",
                ]}
                required
              />
              <div className="promo-field">
                <Field label="Código promocional (opcional) " placeholder="EXPERIENCE26" />
                <Button kind="secondary">Validar</Button>
              </div>
              <label className="check-card">
                <input type="checkbox" /> Quiero recibir promociones y novedades
                por correo, WhatsApp o notificaciones.
              </label>
              <label className="check-card">
                <input type="checkbox" required /> Acepto los términos y la
                política de privacidad. <b>*</b>
              </label>
            </>
          )}
          <Button
            type="submit"
            disabled={loading}
            icon={!loading ? "arrow" : undefined}
          >
            {loading
              ? "Procesando..."
              : mode === "login"
                ? "Iniciar sesión"
                : mode === "forgot"
                  ? "Enviar código"
                  : step < 3
                    ? "Siguiente"
                    : "Crear mi cuenta"}
          </Button>
          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {mode !== "forgot" && (
            <div className="switch-auth">
              {mode === "login"
                ? "¿Aún no tienes cuenta?"
                : "¿Ya tienes una cuenta?"}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setStep(1)
                }}
              >
                {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  placeholder,
  type = "text",
  help,
  kind,
  options,
  error,
  defaultValue,
  name,
}: {
  label: string
  required?: boolean
  placeholder?: string
  type?: string
  help?: string
  kind?: "select" | "textarea"
  options?: Array<string | CatalogOption>
  error?: string
  defaultValue?: string
  name?: string
}) {
  return (
    <label className={`field ${error ? "field-error" : ""}`}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      {kind === "select" ? (
        <select name={name} required={required} defaultValue={defaultValue ?? (options?.[0] && typeof options[0] !== "string" ? options[0].value : undefined)}>
          {(options || []).map((option) => {
            const value = typeof option === "string" ? option : option.value
            const label = typeof option === "string" ? option : option.label
            return (
              <option key={`${name}-${value}`} value={value}>
                {label}
              </option>
            )
          })}
        </select>
      ) : kind === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
        />
      )}
      {error ? <small>{error}</small> : help && <small>{help}</small>}
    </label>
  )
}
function PhoneField() {
  return (
    <label className="field">
      <span>
        Celular <b>*</b>
      </span>

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "100px minmax(140px, 1fr)",
    gap: "8px",
    width: "100%",
  }}
>
        <select
          name="phone_code"
          defaultValue="+591"
          aria-label="Código de país"
          style={{ width: "100%" }}
        >
          <option value="+591">🇧🇴 +591</option>
          <option value="+54">🇦🇷 +54</option>
          <option value="+55">🇧🇷 +55</option>
          <option value="+56">🇨🇱 +56</option>
          <option value="+57">🇨🇴 +57</option>
          <option value="+593">🇪🇨 +593</option>
          <option value="+52">🇲🇽 +52</option>
          <option value="+595">🇵🇾 +595</option>
          <option value="+51">🇵🇪 +51</option>
          <option value="+598">🇺🇾 +598</option>
          <option value="+58">🇻🇪 +58</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+34">🇪🇸 +34</option>
        </select>

        <input
          type="tel"
          name="celular"
          placeholder="Número de celular"
          required
          style={{ width: "100%", minWidth: 0 }}
        />
      </div>

      <small>Lo usaremos para WhatsApp</small>
    </label>
  )
}

function TicketScreen({
  user,
  onClose,
}: {
  user: TicketUser | null
  onClose: () => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "Participante"
  const ticketNumber = `#CCE26-${String(user?.id ?? 0).padStart(6, "0")}`

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({
        app: "coca-cola-event-intelligence",
        usuario_id: user?.id ?? null,
        nombre,
        ticket: ticketNumber,
      }),
      { width: 240, margin: 1, color: { dark: "#1f1f1f", light: "#ffffff" } }
    )
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [user?.id, nombre, ticketNumber])

  return (
    <div className="modal-backdrop">
      <div className="ticket-modal">
        <button className="modal-close" onClick={onClose}>
          <Icon name="x" />
        </button>
        <div className="success-mark">
          <Icon name="check" size={32} />
        </div>
        <span className="section-kicker">INSCRIPCIÓN CONFIRMADA</span>
        <h2>
          Tu próxima experiencia
          <br />
          ya está en camino.
        </h2>
        <div className="digital-ticket">
          <div className="ticket-red">
            <Logo light />
            <span>ENTRADA DIGITAL</span>
            <h3>
              Coca-Cola
              <br />
              Experience 2026
            </h3>
            <div>
              <b>18</b>
              <span>
                ABR
                <br />
                16:00
              </span>
            </div>
          </div>
          <div className="ticket-code">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR de entrada de ${nombre}`}
                width={140}
                height={140}
              />
            ) : (
              <QR />
            )}
            <strong>{nombre}</strong>
            <span>Ticket {ticketNumber}</span>
            <small>Fexpocruz · Santa Cruz</small>
          </div>
        </div>
        <p>
          Presenta este QR al ingresar. El equipo lo escaneará para registrar tu
          check-in y hora de llegada.
        </p>
        <div className="ticket-actions">
          <Button icon="download">Descargar</Button>
          <Button kind="secondary" icon="calendar">
            Agregar a Wallet
          </Button>
          <Button kind="ghost">Enviar por WhatsApp</Button>
        </div>
      </div>
    </div>
  )
}

function Landing({ onRole }: { onRole: (r: Role) => void }) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const closeScanner = useCallback(() => setScannerOpen(false), [])
  const [detail, setDetail] = useState(false)
  const [auth, setAuth] = useState<"login" | "register" | null>(null)
  const [ticket, setTicket] = useState(false)
  const [ticketUser, setTicketUser] = useState<TicketUser | null>(null)
  const join = () => {
    setDetail(false)
    setAuth("register")
  }
  return (
    <div className="landing">
      <ClientNavbar onLogin={setAuth} onRole={onRole} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <Badge tone="dark">PRÓXIMA EXPERIENCIA · 18 ABRIL</Badge>
            <h1>
              Donde cada
              <br />
              momento <em>cuenta.</em>
            </h1>
            <p>
              Descubre eventos, conecta con sabores y vive experiencias que
              querrás compartir.
            </p>
            <Button
              kind="dark"
              onClick={() =>
                document.querySelector("#eventos")?.scrollIntoView()
              }
              icon="arrow"
            >
              Explorar eventos
            </Button>
            <div className="countdown">
              <span>
                <b>12</b>DÍAS
              </span>
              <i>:</i>
              <span>
                <b>08</b>HORAS
              </span>
              <i>:</i>
              <span>
                <b>34</b>MIN
              </span>
            </div>
          </div>
          <div className="hero-image">
            <img
              src={heroPhoto}
              alt="Público levantando las manos en un concierto"
            />
            <div className="hero-caption">
              <span>01 / 03</span>
              <strong>Coca-Cola Experience 2026</strong>
              <small>Santa Cruz · Fexpocruz</small>
            </div>
          </div>
        </section>
        <section className="events-section" id="eventos">
          <div className="section-head">
            <div>
              <span className="section-kicker">ENCUENTRA TU PRÓXIMO PLAN</span>
              <h2>
                Experiencias para vivir
                <br />y compartir.
              </h2>
            </div>
            <p>
              Desde festivales hasta activaciones únicas. Elige tu próxima
              historia.
            </p>
          </div>
          <div className="filter-bar">
            <div className="search-box">
              <Icon name="search" />
              <input placeholder="Buscar eventos..." />
            </div>
            <div className="filter-chips">
              {[
                "Todos",
                "Conciertos",
                "Experiencias",
                "Deportivos",
                "Gratis",
              ].map((x, i) => (
                <button className={i === 0 ? "active" : ""} key={x}>
                  {x}
                </button>
              ))}
            </div>
            <button className="filter-button">
              <Icon name="filter" /> Filtros
            </button>
            <button className="icon-button">
              <Icon name="grid" />
            </button>
          </div>
          <div className="event-grid">
            {events.map((e) => (
              <EventCard
                key={e.title}
                event={e}
                onDetail={() => setDetail(true)}
              />
            ))}
          </div>
          <Button kind="secondary" icon="arrow">
            Ver todos los eventos
          </Button>
        </section>
        <section className="live-experience">
          <div>
            <span className="section-kicker">
              TU EXPERIENCIA, EN TU CELULAR
            </span>
            <h2>
              Escanea.
              <br />
              Participa.
              <br />
              <em>Gana.</em>
            </h2>
            <p>
              En cada evento encontrarás puntos QR para descubrir sabores,
              participar en retos y desbloquear beneficios exclusivos.
            </p>
            <div className="experience-scan-action">
              <Button icon="camera" onClick={() => setScannerOpen(true)}>
                Escanear código QR
              </Button>
              <small>Abre tu cámara y empieza la experiencia.</small>
            </div>
            <div className="steps">
              {[
                ["01", "Escanea el QR"],
                ["02", "Vive la actividad"],
                ["03", "Recibe beneficios"],
              ].map((x) => (
                <span key={x[0]}>
                  <b>{x[0]}</b>
                  {x[1]}
                </span>
              ))}
            </div>
          </div>
          <div className="phone-mockup">
            <div className="phone-top">
              <Logo light />
              <Icon name="bell" />
            </div>
            <span>HOLA, VALERIA</span>
            <h3>
              ¿Lista para
              <br />
              participar?
            </h3>
            <div className="scan-frame">
              <i />
              <i />
              <i />
              <i />
              <Icon name="qr" size={72} />
            </div>
            <Button icon="qr" onClick={() => setScannerOpen(true)}>Escanear actividad</Button>
            <small>Apunta tu cámara al código QR</small>
          </div>
        </section>
        <section className="social-section" id="social">
          <div className="section-head">
            <div>
              <span className="section-kicker">SÍGUENOS</span>
              <h2>
                La chispa sigue
                <br />
                en tus redes.
              </h2>
            </div>
          </div>
          <div className="social-mosaic">
            {socialNetworks.map((network) => (
              <a
                key={network.name}
                href={network.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visitar Coca-Cola en ${network.name} (abre en otra pestaña)`}
              >
                <img src={network.image} alt="Comunidad Coca-Cola en eventos" />
                <span>{network.name}<Icon name="arrow" size={16} /></span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <Logo light />
        <p>
          Medir. Entender.
          <br />
          Mejorar cada experiencia.
        </p>
        <div>
          <strong>EXPLORA</strong>
          <a href="#eventos">Eventos</a>
          <a href="#social">Redes sociales</a>
          <a href="#inicio">Mis entradas</a>
        </div>
        <div>
          <strong>INFORMACIÓN</strong>
          <a href="#contacto">Contacto</a>
          <a href="#privacidad">Privacidad</a>
          <a href="#terminos">Términos y condiciones</a>
        </div>
        <small>
          © 2026 The Coca-Cola Company. Todos los derechos reservados.
        </small>
      </footer>
      <RoleSwitcher role="cliente" onRole={onRole} />
      {scannerOpen && <QrScannerModal onClose={closeScanner} />}
      {detail && <EventDetail onClose={() => setDetail(false)} onJoin={join} />}
      {auth && (
        <AuthModal
          mode={auth}
          onClose={() => setAuth(null)}
          onDone={(user) => {
            setAuth(null)
            setTicketUser(user ?? null)
            setTicket(true)
          }}
        />
      )}
      {ticket && (
        <TicketScreen user={ticketUser} onClose={() => setTicket(false)} />
      )}
    </div>
  )
}

const navs: Record<Exclude<Role, "cliente">, {
  label: string
  icon: IconName
}[]> = {
  organizador: [
    { label: "Vista general", icon: "home" },
    { label: "Mis eventos", icon: "calendar" },
    { label: "Participantes", icon: "users" },
    { label: "Check-in QR", icon: "qr" },
    { label: "Actividades", icon: "spark" },
    { label: "Degustaciones", icon: "heart" },
    { label: "Encuestas", icon: "chart" },
    { label: "Predicciones IA", icon: "spark" },
    { label: "Observaciones", icon: "eye" },
  ],
  administrador: [
    { label: "Vista general", icon: "home" },
    { label: "Eventos", icon: "calendar" },
    { label: "Usuarios y roles", icon: "users" },
    { label: "Participantes", icon: "users" },
    { label: "Productos", icon: "heart" },
    { label: "Campañas", icon: "spark" },
    { label: "Indicadores", icon: "chart" },
    { label: "Predicciones IA", icon: "spark" },
    { label: "Automatizaciones", icon: "settings" },
    { label: "Reportes", icon: "download" },
    { label: "Integraciones", icon: "grid" },
    { label: "Power BI", icon: "chart" },
  ],
  marketing: [
    { label: "Resumen ejecutivo", icon: "home" },
    { label: "Indicadores", icon: "chart" },
    { label: "Embudo", icon: "filter" },
    { label: "Productos", icon: "heart" },
    { label: "Satisfacción y NPS", icon: "spark" },
    { label: "Segmentación", icon: "users" },
    { label: "Mapa de asistentes", icon: "map" },
    { label: "Promociones", icon: "ticket" },
    { label: "Comparar eventos", icon: "grid" },
    { label: "Insights IA", icon: "spark" },
    { label: "Reporte ejecutivo", icon: "download" },
    { label: "Power BI", icon: "chart" },
  ],
}

const administratorAllowedPages = [
  "Vista general",
  "Eventos",
  "Usuarios y roles",
  "Participantes",
  "Productos",
  "Campañas",
  "Indicadores",
  "Automatizaciones",
  "Reportes",
  "Integraciones",
  "Power BI",
]

const organizerAllowedPages = [
  "Vista general",
  "Mis eventos",
  "Participantes",
  "Check-in QR",
  "Actividades",
  "Degustaciones",
  "Encuestas",
  "Predicciones IA",
  "Observaciones",
]

function RoleSwitcher({
  role,
  onRole,
}: {
  role: Role
  onRole: (r: Role) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="role-switcher">
      <button onClick={() => setOpen(!open)}>
        <span>DEMO</span>
        {role.charAt(0).toUpperCase() + role.slice(1)}
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div>
          {([
            "cliente",
            "organizador",
            "administrador",
            "marketing",
          ] as Role[]).map((r) => (
            <button
              className={r === role ? "active" : ""}
              onClick={() => {
                onRole(r)
                setOpen(false)
              }}
              key={r}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
              {r === role && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Sidebar({
  role,
  page,
  setPage,
}: {
  role: Exclude<Role, "cliente">
  page: string
  setPage: (p: string) => void
}) {
  return (
    <aside className="sidebar">
      <Logo light />
      <div className="workspace-label">
        {role === "organizador"
          ? "OPERACIONES"
          : role === "administrador"
            ? "ADMINISTRACIÓN"
            : "MARKETING INTELLIGENCE"}
      </div>
      <nav>
        {navs[role].map((x) => (
          <button
            key={x.label}
            className={page === x.label ? "active" : ""}
            onClick={() => setPage(x.label)}
          >
            <Icon name={x.icon} />
            <span>{x.label}</span>
            {x.label === "Check-in QR" && <i />}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <span>MR</span>
        <div>
          <strong>María Rodríguez</strong>
          <small>{role}</small>
        </div>
        <Icon name="chevron" size={16} />
      </div>
    </aside>
  )
}

const pageDescriptions: Record<string, string> = {
  "Mis eventos": "Planifica, publica y controla cada experiencia.",
  Eventos: "Administra todos los eventos de la organización.",
  Participantes: "Consulta perfiles, asistencia e interacción.",
  "Usuarios y roles": "Gestiona accesos, permisos y responsables.",
  "Check-in QR": "Control de ingreso rápido y seguro.",
  Actividades: "Dinámicas, códigos QR y participación en vivo.",
  Degustaciones: "Stock, muestras y evaluación por sabor.",
  Encuestas: "Construye preguntas y mide la experiencia.",
  Productos: "Catálogo de productos, sabores y presentaciones.",
  Campañas: "Fuentes, aliados y objetivos de conversión.",
  Promociones: "Cupones, beneficios y canjes atribuibles.",
  Automatizaciones: "Mensajes que se activan en el momento correcto.",
  Integraciones: "Conecta tus fuentes y herramientas de negocio.",
  Indicadores: "Métricas detalladas y fórmulas de medición.",
  "Predicciones IA": "Predicción de comportamiento por gustos: asistencia, segmentos y pronóstico del evento.",
  "Power BI": "Dashboard ejecutivo y sincronización de datos.",
  "Insights IA": "Pregúntale a los datos y descubre oportunidades.",
}

function ScannerPage() {
  const [result, setResult] = useState(false)
  return (
    <div className="scanner-layout">
      <div className="scanner-camera">
        <div className="camera-overlay">
          <span>Centra el QR dentro del marco</span>
          <div className="scan-box">
            <i />
            <i />
            <i />
            <i />
            <b />
          </div>
          <small>La cámara detectará el código automáticamente</small>
          <Button kind="secondary" onClick={() => setResult(!result)}>
            Simular escaneo
          </Button>
        </div>
      </div>
      <div className="checkin-side">
        <div className="live-count">
          <span>INGRESOS EN VIVO</span>
          <strong>280</strong>
          <small>de 350 registrados · 80%</small>
          <div>
            <i style={{ width: "80%" }} />
          </div>
        </div>
        {result && (
          <div className="scan-result">
            <div>
              <Icon name="check" size={34} />
            </div>
            <span>ASISTENCIA REGISTRADA</span>
            <h3>Valeria Rojas</h3>
            <p>Entrada general · 17:42</p>
            <Badge tone="green">QR VÁLIDO</Badge>
          </div>
        )}
        <h3>Últimos ingresos</h3>
        {["Diego Salvatierra", "Camila Vargas", "Nicolás Peña"].map((x, i) => (
          <div className="recent-person" key={x}>
            <span>
              {x
                .split(" ")
                .map((y) => y[0])
                .join("")}
            </span>
            <div>
              <strong>{x}</strong>
              <small>Entrada general</small>
            </div>
            <time>17:{39 - i * 2}</time>
          </div>
        ))}
        <Button kind="ghost">Buscar ingreso manual</Button>
      </div>
    </div>
  )
}

type CatalogOption = { value: string; label: string }

type FormFieldDef = {
  label: string
  name: string
  kind?: "select" | "textarea"
  type?: string
  required?: boolean
  placeholder?: string
  options?: Array<string | CatalogOption>
  defaultValue?: string
}

const pageEntityMap: Record<string, string> = {
  "Mis eventos": "eventos",
  Eventos: "eventos",
  "Usuarios y roles": "usuarios",
  Participantes: "participantes",
  Productos: "productos",
  Campañas: "campanas",
}

const formFieldsByPage: Record<string, FormFieldDef[]> = {
  "Mis eventos": [
    { label: "Nombre del evento", name: "nombre", required: true, placeholder: "Festival Coca-Cola 2026" },
    { label: "Tipo de evento", name: "tipo_evento_id", kind: "select", required: true, options: [] },
    { label: "Estado", name: "estado", kind: "select", required: true, defaultValue: "planificado", options: ["planificado", "en_curso", "cerrado"] },
    { label: "Fecha y hora de inicio", name: "fecha_inicio", type: "datetime-local" },
    { label: "Fecha y hora de fin", name: "fecha_fin", type: "datetime-local" },
    { label: "Ciudad", name: "ciudad", placeholder: "Santa Cruz" },
    { label: "Lugar", name: "lugar", placeholder: "Plaza 24 de Septiembre" },
    { label: "Dirección", name: "direccion", placeholder: "Av. Camacho 123" },
    { label: "Aforo", name: "aforo", type: "number", placeholder: "350" },
    { label: "Presupuesto (Bs)", name: "presupuesto", type: "number", placeholder: "25000" },
    { label: "Objetivo", name: "objetivo", kind: "textarea", placeholder: "Objetivo principal del evento" },
    { label: "Campaña asociada", name: "campana_id", kind: "select", options: [] },
    { label: "Organizador", name: "organizador_id", placeholder: "UUID del organizador" },
  ],
  Eventos: [
    { label: "Nombre del evento", name: "nombre", required: true, placeholder: "Festival Coca-Cola 2026" },
    { label: "Tipo de evento", name: "tipo_evento_id", kind: "select", required: true, options: [] },
    { label: "Estado", name: "estado", kind: "select", required: true, defaultValue: "planificado", options: ["planificado", "en_curso", "cerrado"] },
    { label: "Fecha y hora de inicio", name: "fecha_inicio", type: "datetime-local" },
    { label: "Fecha y hora de fin", name: "fecha_fin", type: "datetime-local" },
    { label: "Ciudad", name: "ciudad", placeholder: "La Paz" },
    { label: "Lugar", name: "lugar", placeholder: "Centro Cultural" },
    { label: "Campaña asociada", name: "campana_id", kind: "select", options: [] },
  ],
  "Usuarios y roles": [
    { label: "Nombre", name: "nombre", required: true, placeholder: "María" },
    { label: "Apellido", name: "apellido", placeholder: "Rodríguez" },
    { label: "Correo", name: "email", type: "email", required: true, placeholder: "usuario@empresa.com" },
    { label: "Celular", name: "celular", required: true, placeholder: "+591 70000000" },
    { label: "Rol", name: "rol", kind: "select", required: true, defaultValue: "organizador", options: ["administrador", "organizador", "marketing", "participante"] },
    { label: "Ciudad", name: "ciudad", placeholder: "Santa Cruz" },
    { label: "Rango de edad", name: "rango_edad", kind: "select", options: ["18-24", "25-34", "35-44", "45-54", "55+"] },
    { label: "Género", name: "genero", placeholder: "Femenino" },
    { label: "Ocupación", name: "ocupacion", placeholder: "Coordinadora" },
    { label: "Activo", name: "activo", kind: "select", defaultValue: "true", options: ["true", "false"] },
    { label: "Acepta marketing", name: "acepta_marketing", kind: "select", defaultValue: "true", options: ["true", "false"] },
  ],
  Participantes: [
    { label: "Nombre", name: "nombre", required: true, placeholder: "Ana" },
    { label: "Apellido", name: "apellido", placeholder: "García" },
    { label: "Correo", name: "email", type: "email", required: true, placeholder: "participante@coca.test" },
    { label: "Celular", name: "celular", required: true, placeholder: "+591 70000000" },
    { label: "Rol", name: "rol", kind: "select", required: true, defaultValue: "participante", options: ["participante"] },
    { label: "Ciudad", name: "ciudad", placeholder: "Cochabamba" },
    { label: "Rango de edad", name: "rango_edad", kind: "select", options: ["18-24", "25-34", "35-44", "45-54", "55+"] },
    { label: "Género", name: "genero", placeholder: "Masculino" },
    { label: "Activo", name: "activo", kind: "select", defaultValue: "true", options: ["true", "false"] },
  ],
  Productos: [
    { label: "Nombre", name: "nombre", required: true, placeholder: "Coca-Cola Original" },
    { label: "Tipo de producto", name: "tipo_producto_id", kind: "select", required: true, options: [] },
    { label: "Categoría", name: "categoria", placeholder: "Gaseosas" },
    { label: "Sabor", name: "sabor", placeholder: "Original" },
    { label: "Presentación", name: "presentacion", placeholder: "Lata 355ml" },
    { label: "Activo", name: "activo", kind: "select", defaultValue: "true", options: ["true", "false"] },
  ],
  Campañas: [
    { label: "Nombre de campaña", name: "nombre", required: true, placeholder: "Ruta de sabores 2026" },
    { label: "Objetivo de conversión", name: "objetivo_conversion", kind: "textarea", placeholder: "Objetivo de la campaña" },
    { label: "Fecha de inicio", name: "fecha_inicio", type: "date" },
    { label: "Fecha de fin", name: "fecha_fin", type: "date" },
  ],
}

function DataPage({
  page,
  role,
}: {
  page: string
  role: Exclude<Role, "cliente">
}) {
  const [form, setForm] = useState(false),
    [toast, setToast] = useState(false),
    [records, setRecords] = useState<Record<string, unknown>[]>([]),
    [loading, setLoading] = useState(false),
    [searchTerm, setSearchTerm] = useState(""),
    [filterOpen, setFilterOpen] = useState(false),
    [statusFilter, setStatusFilter] = useState<"all" | "planificado" | "en_curso" | "cerrado">("all"),
    [selectedEventId, setSelectedEventId] = useState("all"),
    [eventOptions, setEventOptions] = useState<Array<{ id: string; label: string }>>([]),
    [currentPage, setCurrentPage] = useState(1)
  const fields = formFieldsByPage[page]
  const entity = getAdminEntityForPage(page)
  const showEventFilter = ["Usuarios y roles", "Participantes", "Productos", "Campañas"].includes(page)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedEventId, page, entity])

  useEffect(() => {
    if (!entity) {
      setRecords([])
      return
    }

    let active = true
    setLoading(true)

    const url = new URL(`/api/admin/${entity}`, window.location.origin)
    if (showEventFilter && selectedEventId !== "all") {
      url.searchParams.set("event_id", selectedEventId)
    }

    fetch(url.toString(), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar los registros.")
        }
        const body = await response.json()
        if (active) setRecords(Array.isArray(body?.data) ? body.data : [])
      })
      .catch(() => {
        if (active) setRecords([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [entity, selectedEventId, showEventFilter])

  useEffect(() => {
    if (!showEventFilter) {
      setEventOptions([])
      return
    }

    let active = true
    fetch("/api/admin/eventos", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const body = await response.json().catch(() => ({}))
        if (!active) return
        const items = Array.isArray(body?.data) ? (body.data as Array<Record<string, unknown>>) : []
        const nextOptions = items
          .map((item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            label: String(item.nombre ?? item.titulo ?? "Evento sin nombre"),
          }))
          .filter((item: { id: string; label: string }) => item.id)
        setEventOptions(nextOptions)
      })
      .catch(() => {
        if (active) setEventOptions([])
      })

    return () => {
      active = false
    }
  }, [showEventFilter])

  if (page === "Check-in QR") return <ScannerPage />
  if (page === "Predicciones IA") return <MlPredictions role={role} />
  if (form && fields)
    return (
      <FormPage
        page={page}
        fields={fields}
        onBack={() => setForm(false)}
        onSave={() => {
          setToast(true)
          setForm(false)
          window.setTimeout(() => setToast(false), 2500)
        }}
      />
    )

  const isEventStatusPage = page === "Eventos" || page === "Mis eventos"
  const detailColumnLabel = page === "Productos" ? "CATEGORÍA" : page === "Campañas" ? "OBJETIVO" : "CIUDAD"
  const showDateColumn = page !== "Productos"
  const tableColumnSpan = showDateColumn ? 5 : 4

  const visibleRecords = records.filter((row) => {
    const normalizedRow = row ?? {}
    const nestedRoleName =
      typeof normalizedRow.role === "object" && normalizedRow.role && "nombre" in normalizedRow.role
        ? String((normalizedRow.role as Record<string, unknown>).nombre ?? "")
        : ""

    const haystack = [
      normalizedRow.nombre,
      normalizedRow.apellido,
      normalizedRow.email,
      normalizedRow.ciudad,
      normalizedRow.lugar,
      normalizedRow.sku,
      normalizedRow.categoria,
      normalizedRow.sabor,
      normalizedRow.presentacion,
      normalizedRow.objetivo_conversion,
      normalizedRow.descripcion,
      normalizedRow.status,
      normalizedRow.estado,
      normalizedRow.activo,
      normalizedRow.activa,
      normalizedRow.rol,
      nestedRoleName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    const matchesSearch =
      !searchTerm.trim() || haystack.includes(searchTerm.trim().toLowerCase()) || haystack.includes(searchTerm.trim().toLowerCase().replace(/\s+/g, ""))

    if (!isEventStatusPage) return matchesSearch

    const rawStatus = String(normalizedRow.estado ?? normalizedRow.status ?? normalizedRow.activo ?? normalizedRow.activa ?? "planificado").toLowerCase()
    const normalizedStatus = rawStatus === "borrador" ? "planificado" : rawStatus === "activo" ? "en_curso" : rawStatus === "finalizado" || rawStatus === "cancelado" ? "cerrado" : rawStatus
    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const rows = getDisplayRows(page, visibleRecords)
  const pagination = paginateRows(rows, currentPage, 10)
  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index + 1)

  return (
    <>
      <div className="dashboard-title compact">
        <div>
          <span>{role.toUpperCase()}</span>
          <h1>{page}</h1>
          <p>
            {pageDescriptions[page] ||
              "Consulta, administra y exporta información de la plataforma."}
          </p>
        </div>
        <Button onClick={() => fields && setForm(true)} icon="plus">
          {page === "Participantes"
            ? "Registro manual"
            : page === "Reportes"
              ? "Generar reporte"
              : `Crear ${page.toLowerCase().replace(/s$/, "")}`}
        </Button>
      </div>
      <p className="stats-notice">Los formularios de creación están alineados con la estructura real de la base de datos y se guardan en Supabase.</p>
      {page === "Actividades" && (
        <div className="metric-strip">
          {[
            ["6", "actividades activas"],
            ["126", "participaciones"],
            ["98", "personas únicas"],
            ["4.8", "satisfacción"],
          ].map((x) => (
            <div key={x[1]}>
              <strong>{x[0]}</strong>
              <span>{x[1]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="panel table-panel">
        <div className="table-tools" style={{ position: "relative" }}>
          <div className="search-box">
            <Icon name="search" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Buscar en ${page.toLowerCase()}...`}
            />
          </div>
          {showEventFilter && (
            <div className="search-box" style={{ minWidth: 220 }}>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                style={{ width: "100%", border: "none", background: "transparent", color: "#374151", fontSize: 14, outline: "none" }}
              >
                <option value="all">Todos los eventos</option>
                {eventOptions.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>
                    {eventItem.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isEventStatusPage && (
            <div style={{ position: "relative" }}>
              <Button kind="secondary" icon="filter" onClick={() => setFilterOpen((value) => !value)}>
                Filtros
              </Button>
              {filterOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 6, zIndex: 10, minWidth: 160, boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}>
                  {[
                    ["all", "Todos"],
                    ["planificado", "Planificados"],
                    ["en_curso", "En curso"],
                    ["cerrado", "Cerrados"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(value as typeof statusFilter)
                        setFilterOpen(false)
                      }}
                      style={{
                        border: "none",
                        background: statusFilter === value ? "#f1f5f9" : "transparent",
                        padding: "8px 10px",
                        borderRadius: 8,
                        textAlign: "left",
                        fontWeight: statusFilter === value ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button kind="ghost" icon="download">
            Exportar
          </Button>
        </div>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>{detailColumnLabel}</th>
                {!showEventFilter && <th>{isEventStatusPage ? "ESTADO" : "REGISTROS"}</th>}
                <th>{showEventFilter ? "DETALLE" : "REGISTROS"}</th>
                {showDateColumn && <th>FECHA</th>}
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColumnSpan} style={{ textAlign: "center", padding: "2rem" }}>
                    Cargando datos...
                  </td>
                </tr>
              ) : pagination.items.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnSpan} style={{ textAlign: "center", padding: "2rem" }}>
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                pagination.items.map((row, index) => {
                  const itemKey =
                    row?.raw && typeof row.raw === "object" && "id" in row.raw && row.raw.id != null
                      ? `admin-row-${String(row.raw.id)}`
                      : `admin-row-${page}-${index}-${String(row.name)}-${String(row.city)}-${String(row.date)}`

                  return (
                    <tr key={itemKey}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{row.city}</td>
                      {!showEventFilter && (
                        <td>
                          <Badge
                            tone={
                              row.status === "activo"
                                ? "green"
                                : row.status === "finalizado"
                                  ? "neutral"
                                  : row.status === "inactivo"
                                    ? "yellow"
                                    : "yellow"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                      )}
                      <td>{String(row.metric)}</td>
                      {showDateColumn && <td>{row.date}</td>}
                      <td>
                        <button>
                          <Icon name="eye" />
                        </button>
                        <button>
                          <Icon name="menu" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>{rows.length ? `Mostrando ${rows.length} resultado${rows.length === 1 ? "" : "s"}` : "Sin resultados"}</span>
          <div>
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
              Anterior
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={currentPage === pageNumber ? "active" : ""}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((value) => Math.min(pagination.totalPages, value + 1))}>
              Siguiente
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <div className="toast">
          <Icon name="check" />
          <div>
            <strong>Guardado correctamente</strong>
            <span>Los cambios ya están disponibles.</span>
          </div>
        </div>
      )}
    </>
  )
}

function FormPage({
  page,
  fields,
  onBack,
  onSave,
}: {
  page: string
  fields: FormFieldDef[]
  onBack: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [catalogData, setCatalogData] = useState<Record<string, Array<CatalogOption>>>( {})

  useEffect(() => {
    let active = true

    fetch("/api/admin/catalog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el catálogo")
        }

        const result = await response.json().catch(() => ({}))
        if (!active) return

        const nextCatalog: Record<string, Array<CatalogOption>> = {}
        for (const [key, value] of Object.entries(result?.data ?? {})) {
          nextCatalog[key] = Array.isArray(value)
            ? value.map((item: Record<string, unknown>) => ({
                value: String(item.id ?? item.value ?? ""),
                label: String(item.nombre ?? item.name ?? item.label ?? item.id ?? "Sin nombre"),
              })).filter((item) => item.value)
            : []
        }

        setCatalogData(nextCatalog)
      })
      .catch(() => {
        if (active) setCatalogData({})
      })

    return () => {
      active = false
    }
  }, [])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)
    setLoading(true)

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      const payload: Record<string, string | boolean | number | null> = {}

      formData.forEach((value, key) => {
        if (value === "" || value instanceof File) return
        const stringKey = String(key)
        if (stringKey === "activo" || stringKey === "acepta_marketing" || stringKey === "activa") {
          payload[stringKey] = value === "true"
          return
        }
        if (stringKey === "aforo" || stringKey === "presupuesto" || stringKey === "precio" || stringKey === "tipo_evento_id" || stringKey === "campana_id" || stringKey === "tipo_producto_id") {
          const parsed = Number(value)
          payload[stringKey] = Number.isNaN(parsed) ? String(value) : parsed
          return
        }
        payload[stringKey] = String(value)
      })

      const entity = pageEntityMap[page]
      if (!entity) {
        throw new Error("No existe la entidad para esta pantalla")
      }

      const response = await fetch(`/api/admin/${entity}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo guardar el registro.")
      }

      onSave()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el registro."
      setSubmitError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <button className="back-link" onClick={onBack}>
        <Icon name="arrow" /> Volver a {page}
      </button>
      <div className="dashboard-title compact">
        <div>
          <span>FORMULARIO · BASE DE DATOS</span>
          <h1>{page === "Mis eventos" ? "Crear nuevo evento" : `Crear · ${page}`}</h1>
          <p>Los campos corresponden a las columnas reales de Supabase.</p>
        </div>
      </div>

      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-title">
          <span>INFORMACIÓN</span>
          <h3>{`Datos de ${page.toLowerCase()}`}</h3>
          <p>Completa los campos necesarios para guardar el registro en la base de datos.</p>
        </div>

        <div className="admin-field-grid">
          {fields.map((field) => {
            const dynamicOptions = getCatalogOptionsForField(field.name, catalogData)
            const resolvedOptions = dynamicOptions.length > 0 ? dynamicOptions : field.options ?? []

            return (
              <Field
                key={field.name}
                label={field.label}
                name={field.name}
                required={field.required}
                type={field.type || "text"}
                placeholder={field.placeholder}
                kind={field.kind}
                defaultValue={field.defaultValue}
                options={resolvedOptions}
              />
            )
          })}
        </div>

        {submitError && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="form-actions">
          <Button kind="ghost" onClick={onBack}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar y publicar"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function AppShell({
  role,
  onRole,
}: {
  role: Exclude<Role, "cliente">
  onRole: (r: Role) => void
}) {
  const [page, setPage] = useState(navs[role][0].label)
  const isHome = page === navs[role][0].label
  const isStats = isHome || ["Indicadores", "Embudo", "Satisfacción y NPS", "Segmentación", "Mapa de asistentes", "Comparar eventos", "Promociones", "Insights IA", "Reporte ejecutivo", "Reportes", "Power BI"].includes(page) || (role === "marketing" && page === "Productos")

  useEffect(() => {
    if (role === "administrador" && !administratorAllowedPages.includes(page)) {
      setPage("Vista general")
      return
    }

    if (role === "organizador" && !organizerAllowedPages.includes(page)) {
      setPage("Vista general")
    }
  }, [role, page])

  return (
    <div className="app-shell">
      <Sidebar role={role} page={page} setPage={setPage} />
      <header className="topbar">
        <button className="mobile-menu">
          <Icon name="menu" />
        </button>
        <div className="top-event">
          <span>
            {role === "administrador"
              ? "Panel administrativo"
              : "Evento activo"}
          </span>
          <strong>Estadísticas de eventos</strong>
        </div>
        <div className="top-actions">
          <button>
            <Icon name="search" />
          </button>
          <button className="notification">
            <Icon name="bell" />
            <i />
          </button>
          <span>MR</span>
        </div>
      </header>
      <main className="dashboard-main">
        {isStats ? (
          <StatisticsDashboard page={page} role={role} onPage={setPage} />
        ) : (
          <DataPage page={page} role={role} />
        )}
      </main>
      <nav className="bottom-nav">
        {navs[role].slice(0, 5).map((x) => (
          <button
            className={page === x.label ? "active" : ""}
            onClick={() => setPage(x.label)}
            key={x.label}
          >
            <Icon name={x.icon} />
            <span>{x.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
      <RoleSwitcher role={role} onRole={onRole} />
    </div>
  )
}

export default function EventApp() {
  const [role, setRole] = useState<Role>("cliente")
  return role === "cliente" ? (
    <Landing onRole={setRole} />
  ) : (
    <AppShell key={role} role={role} onRole={setRole} />
  )
}
