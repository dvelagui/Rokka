-- ── Caché de búsquedas de YouTube ─────────────────────────────────────────────
-- Guarda resultados de búsquedas por 24h para reducir el consumo de cuota de la
-- YouTube Data API. Solo el panel admin (vía service_role en una ruta de
-- servidor) lee/escribe esta tabla; los clientes anónimos no la necesitan.

CREATE TABLE youtube_cache (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query      text NOT NULL,
  results    jsonb NOT NULL,
  hit_count  integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_youtube_cache_query   ON youtube_cache (query);
CREATE INDEX idx_youtube_cache_created ON youtube_cache (created_at);

-- Limpiar entradas viejas (más de 24h). Puede invocarse desde un cron externo
-- (pg_cron no disponible en todos los planes) o manualmente.
CREATE OR REPLACE FUNCTION delete_old_youtube_cache()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM youtube_cache WHERE created_at < now() - interval '24 hours';
$$;

-- RLS: solo service_role (bypassea RLS). Bloquea acceso anon/authenticated.
ALTER TABLE youtube_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_cache__service_role_only"
  ON youtube_cache
  USING (false);
