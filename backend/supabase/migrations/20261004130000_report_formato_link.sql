-- ============================================================================
-- Coca-Cola Event Intelligence
-- formato 'link' en report_runs.
--
-- "Abrir en Power BI" no produce un archivo: registra la apertura del reporte
-- publicado en Power BI Service. Se suma 'link' a los formatos permitidos.
-- ============================================================================

ALTER TABLE public.report_runs DROP CONSTRAINT chk_report_runs_formato;
ALTER TABLE public.report_runs
  ADD CONSTRAINT chk_report_runs_formato CHECK (formato IN ('csv', 'pdf', 'xlsx', 'link'));

COMMENT ON COLUMN public.report_runs.formato IS
  'Formato del reporte: csv, pdf, xlsx o link (apertura de un reporte de Power BI).';
