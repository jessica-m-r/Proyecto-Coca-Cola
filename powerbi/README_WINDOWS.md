# Power BI en Windows: reportes y vistas nuevas

Requisito: la migración `backend/supabase/migrations/20261004120000_powerbi_reportes.sql`
ya aplicada en Supabase (`npm run db:push` desde la raíz del repo).

## 1. Contraseña del rol de solo lectura (una sola vez)

La migración crea el rol `powerbi_reader`, que solo puede leer el esquema `powerbi`
(sin `password_hash`, emails, celulares, nombres ni códigos). La contraseña no se
guarda en el repositorio. En Supabase › SQL Editor:

```sql
ALTER ROLE powerbi_reader WITH PASSWORD 'una-contraseña-larga-y-única';
```

O con psql, sin que la contraseña quede en el historial:

```
psql "<cadena de conexión de postgres>" -c "\password powerbi_reader"
```

Guárdala en el gestor de contraseñas del equipo, no en `.env` ni en el repo.

## 2. Conectar Power BI Desktop con el rol nuevo

1. **Inicio › Obtener datos › Base de datos PostgreSQL**.
2. Servidor: `aws-0-us-west-2.pooler.supabase.com:5432` (Supabase › Connect › Session pooler).
   Base de datos: `postgres`. Modo: **Importar**.
3. Credenciales: **Base de datos**. Usuario `powerbi_reader.<project-ref>`
   (el project-ref está en `backend/supabase/.temp/project-ref` o en la URL de Supabase).
   Si ya tenías una conexión con otro usuario: **Archivo › Opciones › Configuración de
   origen de datos › Editar permisos** y cambia el usuario.
4. En el navegador, abre el esquema **powerbi** y marca:
   `v_dim_evento`, `v_event_kpis`, `v_report_historial`, `v_report_snapshot`,
   `v_report_comparacion_eventos` (y las que ya usabas: `v_participant_type`,
   `v_product_interest`, `v_activity_performance`, `v_hourly_traffic`,
   `v_funnel_levels`, `v_city_map`, `v_recurrence`).
5. Si tu modelo ya usaba `public.v_*`: en **Transformar datos**, en cada consulta cambia
   `Schema="public"` por `Schema="powerbi"`. Las columnas son las mismas
   (`v_event_kpis` solo agrega columnas al final; `v_participant_type` ahora viene
   agregada, sin nombres).
6. Renombra las tablas sin el prefijo del esquema (`v_event_kpis`, no `powerbi v_event_kpis`)
   para que funcionen las medidas.

## 3. Relaciones (Vista de modelo)

`v_dim_evento[event_id]` es la tabla central. Relación 1 a varios, filtro en una dirección:

| Desde (1)                | Hacia (*)                               |
|--------------------------|-----------------------------------------|
| `v_dim_evento[event_id]` | `v_event_kpis[evento_id]`               |
| `v_dim_evento[event_id]` | `v_report_historial[event_id]`          |
| `v_dim_evento[event_id]` | `v_report_snapshot[event_id]`           |
| `v_dim_evento[event_id]` | `v_product_interest[evento_id]`, `v_activity_performance[evento_id]`, `v_hourly_traffic[evento_id]`, `v_funnel_levels[evento_id]`, `v_city_map[evento_id]`, `v_recurrence[evento_id]` |
| `v_report_historial[report_run_id]` | `v_report_snapshot[report_run_id]` |

- `v_report_comparacion_eventos` queda **sin relación**: usa dos segmentaciones, una con
  `evento_a` y otra con `evento_b`.
- `v_report_historial[event_id]` vacío = reporte de todos los eventos.
- Desactiva "Detectar relaciones automáticamente" si crea relaciones extra.

## 4. Medidas

Copia las medidas de [`medidas.dax`](medidas.dax) (Asistencia %, Participación %,
Conversión %, NPS, Recurrencia %, Satisfacción). Con un evento seleccionado coinciden
con las tarjetas de la vista "Power BI" del panel, que lee la misma `v_event_kpis`.

## 5. Actualización

- **Desktop**: botón **Actualizar**. Los reportes exportados desde el panel aparecen en
  `v_report_historial` / `v_report_snapshot` después de actualizar.
- **Power BI Service**: publica (**Archivo › Publicar**), luego en el conjunto de datos
  › **Configuración › Credenciales del origen de datos**: Básica, usuario
  `powerbi_reader.<project-ref>`, privacidad Organizacional. Activa **Actualización
  programada** (hasta 8 veces al día con Pro).
  Si el servicio no acepta el certificado de Supabase, instala una puerta de enlace
  (modo personal) en este Windows y usa esa conexión.
- Para ver el reporte dentro del panel: **Archivo › Insertar informe › Sitio web o portal**,
  copia la URL en `POWERBI_EMBED_URL` del `frontend/.env` y reinicia el servidor.
  Para filtrar por evento: `POWERBI_FILTER_TABLE=v_dim_evento` y `POWERBI_FILTER_COLUMN=event_id`.
- Para abrir el reporte desde **Exportar › Abrir en Power BI** en el panel: en Power BI
  Service abre el reporte y copia la URL normal del navegador
  (`https://app.powerbi.com/reports/<reportId>/<página>`) en `POWERBI_REPORT_URL` del
  `frontend/.env` y reinicia el servidor. Sin esa variable la opción aparece deshabilitada.
