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

## Demostración de inteligencia de eventos

Abre `/panel` para entrar directamente al nuevo panel. El selector inferior permite
probar las vistas de dirección, organización y marketing. Es un selector de
demostración, no un mecanismo de autorización.

Los cinco espacios principales son resumen, eventos, operación, resultados y
planificación. Dirección también tiene recursos; se conserva Power BI con su
componente original.

El resumen destaca el avance de la meta y una decisión relevante para cada rol.
Resultados reúne distribución de público con porcentajes, interés frente a
compra, evaluación de la experiencia y comparación de costo por comprador frente
a conversión. Organización puede alternar ingresos por hora y acumulados. Los
gráficos muestran estados vacíos cuando no hay registros; no inventan puntajes.
El evento y el origen de datos seleccionados se recuerdan durante la sesión,
incluso al cambiar de rol o volver desde Power BI.

En **Demostración**, los eventos y sus operaciones se guardan en `localStorage`
con la clave `cce-intelligence-demo-v1`. Son datos ficticios y no se escriben en
Supabase. Para probar el recorrido completo:

1. Abre `/registro` e inscribe una persona en Coca-Cola Experience.
2. Descarga la entrada QR o copia su código.
3. Abre `/panel`, selecciona el mismo evento y entra a Operación.
4. Escanea el QR con la cámara, pega el código o usa el ingreso manual.
5. Selecciona al participante y registra una muestra, actividad, encuesta, beneficio,
   canje o compra. El inventario y los indicadores se recalculan.
6. Consulta Resultados y descarga CSV o imprime el informe para guardarlo como PDF.
7. En Planificar con IA, ajusta inscripciones y presupuesto para comparar cantidades,
   dotación orientativa y costo esperado por comprador.

La cámara requiere HTTPS o localhost y permiso del navegador. El QR de prueba
solo funciona con los datos locales de esa demostración. Otros dispositivos no
comparten automáticamente el almacenamiento del navegador.

La planificación de demostración usa reglas y tasas históricas ponderadas, no
un modelo entrenado. Sus escenarios no son intervalos estadísticos calibrados;
las ventas vinculadas tampoco demuestran incremento causal. El presupuesto no
se convierte automáticamente en más ventas.

En **Base de datos**, los indicadores y el pronóstico consultan las APIs existentes
de Supabase y del motor ML. Los registros allí también pueden ser datos de seed.
Eventos y recursos conservan sus formularios conectados. La nueva captura
operativa funciona por ahora en demostración: no está conectada a escritura en
Supabase. El seguimiento registra acciones y nunca envía WhatsApp o correo.

Para compilar sin compartir caché con un servidor de desarrollo abierto:

```bash
cd frontend
NEXT_DIST_DIR=.next-validation npm run build
```

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

El botón **Exportar** del panel descarga CSV o Excel del evento seleccionado, o abre
el reporte publicado en Power BI Service (`POWERBI_REPORT_URL`) en una pestaña nueva.
Las tres opciones llaman a `registrar_reporte()`, que guarda el reporte en `report_runs`
(con `formato` `csv`, `xlsx` o `link`) y congela los KPIs
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
