-- ── RPCs para acceder al caché de YouTube desde el cliente (anon) ────────────
-- La tabla youtube_cache tiene RLS que bloquea anon/authenticated.
-- Estas funciones SECURITY DEFINER bypasean RLS y son el único punto de acceso.

-- ── 1. Leer caché ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_youtube_cache(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id      UUID;
  v_results JSONB;
BEGIN
  SELECT id, results
  INTO   v_id, v_results
  FROM   youtube_cache
  WHERE  query      = p_query
    AND  created_at > NOW() - INTERVAL '24 hours'
  ORDER  BY created_at DESC
  LIMIT  1;

  IF v_id IS NOT NULL THEN
    UPDATE youtube_cache
    SET hit_count   = hit_count + 1,
        last_hit_at = NOW()
    WHERE id = v_id;
    RETURN v_results;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_youtube_cache(TEXT) TO anon, authenticated;

-- ── 2. Escribir / actualizar caché ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_youtube_cache(p_query TEXT, p_results JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Borrar entradas viejas de la misma query, luego insertar fresca
  DELETE FROM youtube_cache WHERE query = p_query;
  INSERT INTO youtube_cache (query, results)
  VALUES (p_query, p_results);
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_youtube_cache(TEXT, JSONB) TO anon, authenticated;
