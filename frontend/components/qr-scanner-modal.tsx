"use client"

import { useEffect, useId, useRef, useState } from "react"

function cameraError(error: unknown): string {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  if (/NotAllowed|Permission|denied/i.test(message)) {
    return "Permite el acceso a la cámara en tu navegador y vuelve a intentar."
  }
  if (/NotFound|DevicesNotFound/i.test(message)) {
    return "No encontramos una cámara en este dispositivo."
  }
  if (/NotReadable|TrackStart/i.test(message)) {
    return "La cámara está ocupada. Cierra otras aplicaciones que la usen y vuelve a intentar."
  }
  return "No pudimos iniciar la cámara. Revisa sus permisos y vuelve a intentar."
}

export default function QrScannerModal({ onClose }: { onClose: () => void }) {
  const id = useId().replace(/:/g, "")
  const readerId = `qr-reader-${id}`
  const dialogRef = useRef<HTMLDivElement>(null)
  // Serializa inicio y cierre, incluso si se cierra mientras se pide permiso.
  const cameraQueue = useRef<Promise<void>>(Promise.resolve())
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab") return
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex="0"]',
      )
      if (!elements?.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (result !== null) return
    let cancelled = false
    let decoded = false
    let scanner: import("html5-qrcode").Html5Qrcode | undefined
    setStatus("starting")
    setError(null)

    const start = async () => {
      if (cancelled) return
      try {
        if (!window.isSecureContext) {
          throw new Error("HTTPS_REQUIRED")
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("CAMERA_UNSUPPORTED")
        }
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        if (cancelled) return
        scanner = new Html5Qrcode(readerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.floor(Math.min(width, height) * 0.7)
              return { width: size, height: size }
            },
          },
          (text) => {
            if (cancelled || decoded) return
            decoded = true
            setResult(text)
          },
          () => {},
        )
        if (!cancelled && !decoded) setStatus("scanning")
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message === "HTTPS_REQUIRED"
          ? "Para usar la cámara, abre esta página mediante HTTPS (o localhost en tu computadora)."
          : message === "CAMERA_UNSUPPORTED"
            ? "Este navegador no permite usar la cámara. Abre la página en Safari o Chrome."
            : cameraError(err))
        setStatus("error")
      }
    }

    const started = cameraQueue.current.then(start)
    cameraQueue.current = started
    return () => {
      cancelled = true
      cameraQueue.current = started.then(async () => {
        if (!scanner) return
        if (scanner.isScanning) {
          try { await scanner.stop() } catch { /* Puede haberse detenido ya. */ }
        }
        if (!scanner.isScanning) scanner.clear()
      }).catch(() => {})
    }
  }, [attempt, readerId, result])

  let destination: string | null = null
  if (result) {
    try {
      const url = new URL(result)
      if (url.protocol === "https:" || url.protocol === "http:") destination = url.href
    } catch { /* Un QR también puede contener texto o un identificador. */ }
  }

  return (
    <div className="modal-backdrop qr-scanner-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="qr-scanner-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`qr-title-${id}`} tabIndex={-1}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar lector QR">×</button>
        <span className="section-kicker">VIVE LA EXPERIENCIA</span>
        <h2 id={`qr-title-${id}`}>{result !== null ? "QR detectado" : "Escanea tu código QR"}</h2>
        <p>Apunta la cámara al código del evento o de la actividad.</p>
        <div className="qr-camera-frame" hidden={result !== null}>
          <div id={readerId} />
          {status === "starting" && <span className="qr-camera-placeholder">Solicitando acceso a la cámara…</span>}
          {status === "error" && <span className="qr-camera-placeholder">Cámara no disponible</span>}
        </div>
        <div aria-live="polite">
          {result !== null ? (
            <div className="qr-scan-result">
              <span className="badge badge-green">CÓDIGO LEÍDO</span>
              <p>{destination ? "Abre el enlace para continuar con la experiencia." : "Este es el contenido de tu código QR:"}</p>
              <code>{result}</code>
              {destination && <a className="btn btn-primary" href={destination} target="_blank" rel="noopener noreferrer">Abrir enlace ↗</a>}
            </div>
          ) : error ? <p className="qr-camera-error" role="alert">{error}</p>
            : <p className="qr-camera-hint">{status === "scanning" ? "Cámara lista. Centra el QR dentro del recuadro." : "Acepta el permiso de cámara para empezar."}</p>}
        </div>
        <div className="qr-scanner-actions">
          {(result !== null || status === "error") && <button className="btn btn-primary" type="button" onClick={() => {
            setResult(null)
            setAttempt((value) => value + 1)
          }}>{result !== null ? "Escanear otro QR" : "Volver a intentar"}</button>}
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
