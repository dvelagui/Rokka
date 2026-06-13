-- ── Programación de anuncios: fecha, horario y límite de impresiones ───────────

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS start_date        DATE,
  ADD COLUMN IF NOT EXISTS end_date          DATE,
  ADD COLUMN IF NOT EXISTS time_start        TIME,
  ADD COLUMN IF NOT EXISTS time_end          TIME,
  ADD COLUMN IF NOT EXISTS max_impressions   INT,
  ADD COLUMN IF NOT EXISTS impressions_count INT NOT NULL DEFAULT 0;

-- ── Historial de impresiones ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_impressions (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id    UUID        NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  bar_id   UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  source   TEXT        NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id  ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_bar_id ON ad_impressions(bar_id);

ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer. INSERT solo vía record_ad_impression (SECURITY DEFINER).

CREATE POLICY "ad_impressions__admin_select"
  ON ad_impressions FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── RPC: anuncios activos respetando programación ───────────────────────────
-- Filtra por fecha (start_date/end_date) y rango horario (time_start/time_end,
-- soporta rangos que cruzan medianoche). Como efecto colateral, desactiva
-- anuncios cuya fecha de fin ya pasó o que alcanzaron su límite de impresiones,
-- para que el panel admin refleje el estado real.

CREATE OR REPLACE FUNCTION get_active_ads(p_bar_id UUID)
RETURNS SETOF ads
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ads
     SET is_active = FALSE
   WHERE bar_id = p_bar_id
     AND is_active = TRUE
     AND (
       (end_date IS NOT NULL AND end_date < CURRENT_DATE)
       OR (max_impressions IS NOT NULL AND impressions_count >= max_impressions)
     );

  RETURN QUERY
  SELECT * FROM ads
   WHERE bar_id = p_bar_id
     AND is_active = TRUE
     AND (start_date IS NULL OR start_date <= CURRENT_DATE)
     AND (end_date   IS NULL OR end_date   >= CURRENT_DATE)
     AND (
       (time_start IS NULL OR time_end IS NULL)
       OR (
         CASE WHEN time_start <= time_end
           THEN LOCALTIME BETWEEN time_start AND time_end
           ELSE LOCALTIME >= time_start OR LOCALTIME <= time_end
         END
       )
     )
   ORDER BY sort_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_ads TO anon, authenticated;

-- ── RPC: registrar impresión de anuncio ─────────────────────────────────────
-- Incrementa el contador y desactiva el anuncio si alcanza max_impressions.

CREATE OR REPLACE FUNCTION record_ad_impression(p_ad_id UUID, p_source TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad ads%ROWTYPE;
BEGIN
  SELECT * INTO v_ad FROM ads WHERE id = p_ad_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO ad_impressions (ad_id, bar_id, source) VALUES (p_ad_id, v_ad.bar_id, p_source);

  UPDATE ads SET impressions_count = impressions_count + 1 WHERE id = p_ad_id;

  IF v_ad.max_impressions IS NOT NULL AND v_ad.impressions_count + 1 >= v_ad.max_impressions THEN
    UPDATE ads SET is_active = FALSE WHERE id = p_ad_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION record_ad_impression TO anon, authenticated;

-- ── RPC: informe de impresiones por anuncio ─────────────────────────────────

CREATE OR REPLACE FUNCTION get_ad_impressions_report(p_bar_id UUID)
RETURNS TABLE (
  ad_id       UUID,
  title       TEXT,
  emoji       TEXT,
  is_active   BOOLEAN,
  total_count BIGINT,
  last_shown  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.title,
    a.emoji,
    a.is_active,
    COUNT(i.id)    AS total_count,
    MAX(i.shown_at) AS last_shown
  FROM ads a
  LEFT JOIN ad_impressions i ON i.ad_id = a.id
  WHERE a.bar_id = p_bar_id
  GROUP BY a.id, a.title, a.emoji, a.is_active, a.sort_order
  ORDER BY a.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION get_ad_impressions_report TO authenticated;

-- ── RPC: historial de impresiones de un anuncio ─────────────────────────────

CREATE OR REPLACE FUNCTION get_ad_impressions_history(p_ad_id UUID, p_limit INT DEFAULT 50)
RETURNS SETOF ad_impressions
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM ad_impressions
   WHERE ad_id = p_ad_id
   ORDER BY shown_at DESC
   LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_ad_impressions_history TO authenticated;
