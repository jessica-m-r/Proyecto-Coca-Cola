# Proyecto-Coca-Cola

Coca-Cola Event Intelligence: app Next.js 15 + Supabase.

## Estructura

```
Proyecto-Coca-Cola/
├── frontend/   → app Next.js (app/, components/, lib/, public/, configs, package.json)
├── backend/    → supabase/ (migrations/, seed.sql, tests/, config.toml)
└── package.json → atajos para correr todo desde la raíz
```

- Las rutas `app/api` y los clientes de Supabase (`frontend/lib/supabase`) viven en
  `frontend/` porque Next.js los importa con el alias `@/*`.
- Las variables de entorno van en `frontend/.env` (o `frontend/.env.local`); Next.js
  las lee desde su propia carpeta. Usa `frontend/.env.example` como plantilla.
  Ninguna se sube a git.

## Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit
```

O desde la raíz: `npm run dev`, `npm run build`, `npm run typecheck`.

## Backend (Supabase)

El CLI de Supabase busca la carpeta `supabase/` en el directorio actual, así que
**todos los comandos de Supabase se corren desde `backend/`**:

```bash
cd backend
supabase migration list   # estado local vs remoto
supabase db push          # aplica migraciones nuevas al remoto
supabase gen types typescript --linked > ../frontend/lib/database.types.ts
```

O desde la raíz: `npm run db:migrations`, `npm run db:push`, `npm run db:types`.

El enlace con el proyecto remoto se guarda en `backend/supabase/.temp/`
(ignorado por git). Si se pierde, vuelve a enlazar con
`cd backend && supabase link --project-ref <ref>`.

Las migraciones ya aplicadas en el remoto no se editan: los cambios de esquema
van en una migración nueva.

## Estadísticas conectadas a Supabase

Los resúmenes de organizador, administrador y marketing consultan
`GET /api/estadisticas`. También lo usan Indicadores, Embudo, Productos de
marketing, Satisfacción y NPS, Segmentación, Mapa de asistentes, Comparar
eventos y reportes. Se actualizan cada 30 segundos mientras la pestaña está
visible; el botón Actualizar permite consultarlos inmediatamente.

Por ahora las estadísticas y `/datos` son accesibles sin iniciar sesión,
mediante el selector de vistas de demostración. Las tres vistas permiten
consultar todos los eventos. Esta conexión está separada del trabajo de
inicio de sesión; no añade cookies, rutas de sesión ni cambios al login.

Las consultas usan las vistas del esquema remoto descrito en
`frontend/lib/database.types.ts`: `v_event_kpis`, `v_funnel_levels`,
`v_hourly_traffic`, `v_activity_performance`, `v_product_interest` y `v_city_map`.
Las claves privadas se utilizan únicamente en el servidor. Las consultas
están paginadas y no exponen filas personales de participantes.

### Cómo se generan nuevas estadísticas

Las métricas cambian cuando se guardan registros efectivos en la base:

| Acción | Tabla que alimenta las estadísticas |
| --- | --- |
| Crear un evento y asignar responsable | `evento` |
| Inscribir una persona en un evento | `registro_asistido` |
| Registrar ingreso | `check_in`, relacionado mediante `registro_id` |
| Registrar participación en una actividad | `log_activity` |
| Registrar degustación o interés | `producto_interaccion` |
| Guardar encuesta o evaluación | `surveys` / `calificacion`, según la métrica |
| Registrar compra o canje | `venta` / `cupon` |

Crear una cuenta en `usuario` **no equivale a inscribirse en un evento**:
también hace falta crear su `registro_asistido`. Las vistas calculan los
resultados sobre esos registros, sin almacenar cifras manuales en el frontend.
Sin eventos se muestra un estado vacío; las métricas sin actividad muestran
cero y la satisfacción sin encuestas indica "Sin encuestas".

Esta conexión no inserta datos de prueba ni convierte los formularios de
demostración en operaciones de escritura: crear eventos, inscripciones y
check-in desde esos formularios todavía requiere implementar sus endpoints.
El lector QR público lee el contenido del código, pero no registra asistencia.
Power BI e Insights IA ahora muestran las estadísticas registradas y explican
que sus integraciones externas no están configuradas.

## Reportes y Power BI

El botón **Exportar** del panel descarga CSV o Excel del evento seleccionado y llama
a `registrar_reporte()`, que guarda el reporte en `report_runs` y congela los KPIs
de `v_event_kpis` en `report_snapshots`. La sección **Reportes** lista el historial
(`v_report_historial`) y permite volver a descargar cada reporte con sus cifras
congeladas. La vista **Power BI** muestra las mismas tarjetas de `v_event_kpis` y la
fecha del último reporte.

Power BI lee el esquema `powerbi` con el rol de solo lectura `powerbi_reader`:
mismas vistas `v_*` sin datos personales, más `v_dim_evento`, `v_report_historial`,
`v_report_snapshot` y `v_report_comparacion_eventos`. Pasos en
[`powerbi/README_WINDOWS.md`](powerbi/README_WINDOWS.md) y medidas en
[`powerbi/medidas.dax`](powerbi/medidas.dax). Reportes de ejemplo:
`backend/supabase/seed/report_runs_demo.sql`.

Validación local: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
