-- ============================================================
-- 012 — Stats: funciones de KPIs, top songs y ranking global
-- ============================================================

-- ── RPC: resumen de KPIs del bar para un rango de fechas ─────────────────────

CREATE OR REPLACE FUNCTION get_bar_stats_summary(
  p_bar_id UUID,
  p_from   TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()),
  p_to     TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_songs_played       INT;
  v_total_bids         BIGINT;
  v_credits_sold       BIGINT;
  v_peak_tables        INT;
  v_top_title          TEXT;
  v_top_artist         TEXT;
  v_top_times          INT;
  v_peak_hour          TEXT;
  v_active_tables_now  INT;
BEGIN
  -- Canciones reproducidas en el rango
  SELECT COUNT(*) INTO v_songs_played
    FROM queue
   WHERE bar_id = p_bar_id
     AND status = 'played'
     AND played_at BETWEEN p_from AND p_to;

  -- Suma de pujas de canciones reproducidas o saltadas en el rango
  SELECT COALESCE(SUM(bid_amount), 0) INTO v_total_bids
    FROM queue
   WHERE bar_id = p_bar_id
     AND status IN ('played', 'skipped')
     AND COALESCE(played_at, added_at) BETWEEN p_from AND p_to;

  -- Créditos vendidos (recargas completadas) en el rango
  SELECT COALESCE(SUM(amount), 0) INTO v_credits_sold
    FROM credits_transactions
   WHERE bar_id = p_bar_id
     AND type = 'recharge'
     AND status = 'completed'
     AND created_at BETWEEN p_from AND p_to;

  -- Pico de mesas activas (de bar_stats diarios)
  SELECT COALESCE(MAX(peak_tables), 0) INTO v_peak_tables
    FROM bar_stats
   WHERE bar_id = p_bar_id
     AND date BETWEEN p_from::DATE AND p_to::DATE;

  -- Mesas activas ahora
  SELECT COUNT(*) INTO v_active_tables_now
    FROM tables
   WHERE bar_id = p_bar_id AND is_active AND NOT is_banned;

  -- Canción más pedida en el rango
  SELECT title, artist, COUNT(*) AS c
    INTO v_top_title, v_top_artist, v_top_times
    FROM queue
   WHERE bar_id = p_bar_id
     AND status IN ('played', 'skipped')
     AND COALESCE(played_at, added_at) BETWEEN p_from AND p_to
   GROUP BY title, artist
   ORDER BY c DESC
   LIMIT 1;

  -- Hora pico (hora local con más solicitudes de canción)
  SELECT TO_CHAR(DATE_TRUNC('hour', added_at), 'HH24:00') INTO v_peak_hour
    FROM queue
   WHERE bar_id = p_bar_id
     AND added_at BETWEEN p_from AND p_to
   GROUP BY DATE_TRUNC('hour', added_at)
   ORDER BY COUNT(*) DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'songs_played',      v_songs_played,
    'total_bids',        v_total_bids,
    'credits_sold',      v_credits_sold,
    'peak_tables',       v_peak_tables,
    'active_tables_now', v_active_tables_now,
    'top_song', CASE WHEN v_top_title IS NOT NULL THEN
      jsonb_build_object('title', v_top_title, 'artist', v_top_artist, 'times', v_top_times)
    ELSE NULL END,
    'peak_hour', v_peak_hour
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_bar_stats_summary TO authenticated;

-- ── RPC: top canciones del bar ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_top_songs(p_bar_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  title        TEXT,
  artist       TEXT,
  times_played BIGINT,
  avg_bid      NUMERIC,
  max_bid      INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    title,
    artist,
    COUNT(*)              AS times_played,
    ROUND(AVG(bid_amount), 1) AS avg_bid,
    MAX(bid_amount)       AS max_bid
  FROM queue
  WHERE bar_id = p_bar_id
    AND status IN ('played', 'skipped')
  GROUP BY title, artist
  ORDER BY times_played DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_songs TO authenticated;

-- ── RPC: top canciones global (todos los bares) ───────────────────────────────

CREATE OR REPLACE FUNCTION get_global_top_songs(p_limit INT DEFAULT 10)
RETURNS TABLE(
  title        TEXT,
  artist       TEXT,
  times_played BIGINT,
  avg_bid      NUMERIC,
  max_bid      INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    title,
    artist,
    COUNT(*)                  AS times_played,
    ROUND(AVG(bid_amount), 1) AS avg_bid,
    MAX(bid_amount)           AS max_bid
  FROM queue
  WHERE status IN ('played', 'skipped')
  GROUP BY title, artist
  ORDER BY times_played DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_global_top_songs TO authenticated;

-- ── RPC: ranking global de bares ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_global_bar_ranking(p_limit INT DEFAULT 10)
RETURNS TABLE(
  bar_id       UUID,
  bar_name     TEXT,
  bar_emoji    TEXT,
  bar_slug     TEXT,
  total_songs  BIGINT,
  total_bids   BIGINT,
  table_count  BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id                                     AS bar_id,
    b.name                                   AS bar_name,
    b.emoji                                  AS bar_emoji,
    b.slug                                   AS bar_slug,
    COUNT(DISTINCT q.id)                     AS total_songs,
    COALESCE(SUM(q.bid_amount), 0)           AS total_bids,
    COUNT(DISTINCT t.id)                     AS table_count
  FROM bars b
  LEFT JOIN queue q ON q.bar_id = b.id AND q.status IN ('played', 'skipped')
  LEFT JOIN tables t ON t.bar_id = b.id AND t.is_active
  GROUP BY b.id, b.name, b.emoji, b.slug
  ORDER BY total_bids DESC, total_songs DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_global_bar_ranking TO authenticated;

-- ── RPC: guardar estadísticas diarias ────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_daily_stats(p_bar_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date           DATE := CURRENT_DATE;
  v_total_songs    INT;
  v_total_bids     BIGINT;
  v_credits_sold   BIGINT;
  v_active_tables  INT;
  v_peak_tables    INT;
BEGIN
  SELECT COUNT(*) INTO v_total_songs
    FROM queue
   WHERE bar_id = p_bar_id
     AND status = 'played'
     AND played_at::DATE = v_date;

  SELECT COALESCE(SUM(bid_amount), 0) INTO v_total_bids
    FROM queue
   WHERE bar_id = p_bar_id
     AND status IN ('played', 'skipped')
     AND COALESCE(played_at, added_at)::DATE = v_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_sold
    FROM credits_transactions
   WHERE bar_id = p_bar_id
     AND type = 'recharge'
     AND status = 'completed'
     AND created_at::DATE = v_date;

  SELECT COUNT(*) INTO v_active_tables
    FROM tables
   WHERE bar_id = p_bar_id AND is_active AND NOT is_banned;

  -- Pico: max distinct active tables con actividad hoy
  SELECT COALESCE(MAX(daily_peak), v_active_tables) INTO v_peak_tables
  FROM (
    SELECT COUNT(DISTINCT table_id) AS daily_peak
      FROM queue
     WHERE bar_id = p_bar_id
       AND added_at::DATE = v_date
       AND table_id IS NOT NULL
  ) sub;

  INSERT INTO bar_stats (
    bar_id, date, total_songs, total_bids,
    total_credits_sold, active_tables, peak_tables
  )
  VALUES (
    p_bar_id, v_date, v_total_songs, v_total_bids,
    v_credits_sold, v_active_tables, v_peak_tables
  )
  ON CONFLICT (bar_id, date) DO UPDATE SET
    total_songs        = EXCLUDED.total_songs,
    total_bids         = EXCLUDED.total_bids,
    total_credits_sold = EXCLUDED.total_credits_sold,
    active_tables      = EXCLUDED.active_tables,
    peak_tables        = EXCLUDED.peak_tables;
END;
$$;

GRANT EXECUTE ON FUNCTION record_daily_stats TO authenticated;
