-- ============================================================================
-- qr_scan permitia a anon listar todos los QR no usados (codigo + registro_id),
-- es decir, enumerar entradas validas. Se reemplaza por una funcion que solo
-- responde si un codigo concreto es valido, sin exponer la tabla.
-- ============================================================================

DROP POLICY IF EXISTS qr_scan ON qr;

CREATE OR REPLACE FUNCTION public.validar_qr(p_codigo uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM qr WHERE codigo = p_codigo AND NOT usado);
$$;

REVOKE ALL ON FUNCTION public.validar_qr(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_qr(uuid) TO anon, authenticated;
