-- ============================================================================
-- Reportes de ejemplo para Power BI (requiere la migración 20261004120000).
-- Usa los eventos, participantes y encuestas que ya existen en la base: cada
-- reporte congela los KPIs actuales de v_event_kpis con registrar_reporte().
-- Idempotente: borra y vuelve a crear solo los reportes marcados como demo.
--
-- Ejecutar en el SQL Editor de Supabase o con:
--   psql "$DATABASE_URL" -f backend/supabase/seed/report_runs_demo.sql
-- ============================================================================

BEGIN;

DELETE FROM public.report_runs WHERE parametros ->> 'demo' = 'true';

DO $$
DECLARE
  v_evento  record;
  v_run_id  bigint;
  v_n       integer := 0;
  v_quien   text[] := ARRAY['panel:administrador', 'panel:marketing', 'panel:organizador'];
  v_formato text[] := ARRAY['csv', 'xlsx', 'pdf'];
BEGIN
  -- Un reporte por evento con actividad, fechado al día siguiente del evento (nunca en el futuro).
  FOR v_evento IN
    SELECT evento_id, fecha_inicio
    FROM public.v_event_kpis
    WHERE asistentes > 0
    ORDER BY fecha_inicio
  LOOP
    v_n := v_n + 1;
    v_run_id := public.registrar_reporte(
      v_evento.evento_id,
      'kpis_evento',
      v_formato[1 + v_n % 3],
      jsonb_build_object('demo', true, 'origen', 'seed'),
      v_quien[1 + v_n % 3]
    );
    UPDATE public.report_runs
       SET generated_at = LEAST((v_evento.fecha_inicio AT TIME ZONE 'America/La_Paz') + interval '1 day 9 hours', now() - interval '3 hours')
     WHERE id = v_run_id;
  END LOOP;

  -- Consolidado de todos los eventos (event_id NULL) y una comparación A vs B.
  v_run_id := public.registrar_reporte(NULL, 'consolidado_eventos', 'xlsx',
    jsonb_build_object('demo', true, 'origen', 'seed'), 'panel:marketing');
  UPDATE public.report_runs SET generated_at = now() - interval '2 days' WHERE id = v_run_id;

  v_run_id := public.registrar_reporte(NULL, 'comparacion_eventos', 'csv',
    jsonb_build_object('demo', true, 'origen', 'seed', 'evento_a', 13, 'evento_b', 28), 'panel:administrador');
  UPDATE public.report_runs SET generated_at = now() - interval '1 day' WHERE id = v_run_id;

  -- El snapshot comparte la fecha de su reporte.
  UPDATE public.report_snapshots s
     SET generated_at = r.generated_at
    FROM public.report_runs r
   WHERE r.id = s.report_run_id
     AND r.parametros ->> 'demo' = 'true';
END
$$;

COMMIT;
