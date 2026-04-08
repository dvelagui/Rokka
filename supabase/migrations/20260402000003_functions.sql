-- ============================================================
-- 003 — FUNCIONES Y RPCs
-- ============================================================

-- ── RPC: pedir canción (con puja de créditos) ─────────────────────────────────
-- La mesa pide una canción, se le descuentan créditos y se inserta en la cola.
-- Retorna el nuevo item de la cola.

CREATE OR REPLACE FUNCTION request_song(
  p_bar_id           UUID,
  p_table_id         UUID,
  p_title            TEXT,
  p_artist           TEXT,
  p_youtube_video_id TEXT DEFAULT NULL,
  p_thumbnail_url    TEXT DEFAULT NULL,
  p_bid_amount       INT  DEFAULT 0,
  p_dedication       TEXT DEFAULT NULL
)
RETURNS queue
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_table      tables%ROWTYPE;
  v_next_pos   INT;
  v_new_item   queue%ROWTYPE;
BEGIN
  -- Verificar que la mesa existe y está activa
  SELECT * INTO v_table FROM tables WHERE id = p_table_id AND bar_id = p_bar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;
  IF v_table.is_banned THEN
    RAISE EXCEPTION 'Mesa bloqueada';
  END IF;
  IF NOT v_table.is_active THEN
    RAISE EXCEPTION 'Mesa inactiva';
  END IF;

  -- Verificar créditos si hay puja
  IF p_bid_amount > 0 AND v_table.credits < p_bid_amount THEN
    RAISE EXCEPTION 'Créditos insuficientes. Tienes % créditos', v_table.credits;
  END IF;

  -- Calcular posición (después de la canción que está sonando)
  SELECT COALESCE(MAX(position), 0) + 1
    INTO v_next_pos
    FROM queue
   WHERE bar_id = p_bar_id AND status = 'queued';

  -- Si hay puja, insertar antes de canciones con menor puja
  IF p_bid_amount > 0 THEN
    -- Desplazar hacia abajo las canciones con menor puja
    UPDATE queue
       SET position = position + 1
     WHERE bar_id = p_bar_id
       AND status = 'queued'
       AND bid_amount < p_bid_amount;

    SELECT COALESCE(MIN(position), v_next_pos)
      INTO v_next_pos
      FROM queue
     WHERE bar_id = p_bar_id
       AND status = 'queued'
       AND bid_amount < p_bid_amount;
  END IF;

  -- Descontar créditos
  IF p_bid_amount > 0 THEN
    UPDATE tables SET credits = credits - p_bid_amount WHERE id = p_table_id;

    INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference)
    VALUES (p_bar_id, p_table_id, -p_bid_amount, 'bid', 'Puja canción: ' || p_title);
  END IF;

  -- Insertar en cola
  INSERT INTO queue (bar_id, table_id, title, artist, youtube_video_id, thumbnail_url,
                     bid_amount, position, dedication, status)
  VALUES (p_bar_id, p_table_id, p_title, p_artist, p_youtube_video_id, p_thumbnail_url,
          p_bid_amount, v_next_pos, p_dedication, 'queued')
  RETURNING * INTO v_new_item;

  -- Log
  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Mesa ' || (SELECT label FROM tables WHERE id = p_table_id),
          'song_requested', p_title || ' — ' || p_artist || ' (puja: ' || p_bid_amount || ')');

  RETURN v_new_item;
END;
$$;

GRANT EXECUTE ON FUNCTION request_song TO anon, authenticated;

-- ── RPC: votar en una canción ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION vote_on_song(
  p_queue_id  UUID,
  p_table_id  UUID,
  p_vote_type vote_type
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO votes (queue_id, table_id, vote_type)
  VALUES (p_queue_id, p_table_id, p_vote_type)
  ON CONFLICT (queue_id, table_id) DO UPDATE
    SET vote_type = EXCLUDED.vote_type;
END;
$$;

GRANT EXECUTE ON FUNCTION vote_on_song TO anon, authenticated;

-- ── RPC: obtener cola activa con conteo de votos ──────────────────────────────

CREATE OR REPLACE FUNCTION get_active_queue(p_bar_id UUID)
RETURNS TABLE(
  id               UUID,
  title            TEXT,
  artist           TEXT,
  youtube_video_id TEXT,
  thumbnail_url    TEXT,
  table_id         UUID,
  table_label      TEXT,
  bid_amount       INT,
  "position"       INT,
  dedication       TEXT,
  status           queue_status,
  added_at         TIMESTAMPTZ,
  skip_votes       BIGINT,
  keep_votes       BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    q.id,
    q.title,
    q.artist,
    q.youtube_video_id,
    q.thumbnail_url,
    q.table_id,
    t.label AS table_label,
    q.bid_amount,
    q.position,
    q.dedication,
    q.status,
    q.added_at,
    COUNT(v.id) FILTER (WHERE v.vote_type = 'skip') AS skip_votes,
    COUNT(v.id) FILTER (WHERE v.vote_type = 'keep') AS keep_votes
  FROM queue q
  LEFT JOIN tables t ON t.id = q.table_id
  LEFT JOIN votes v  ON v.queue_id = q.id
  WHERE q.bar_id = p_bar_id
    AND q.status IN ('queued', 'playing')
  GROUP BY q.id, t.label
  ORDER BY
    CASE q.status WHEN 'playing' THEN 0 ELSE 1 END,
    q.bid_amount DESC,
    q.position ASC;
$$;

GRANT EXECUTE ON FUNCTION get_active_queue TO anon, authenticated;

-- ── RPC: recargar créditos a una mesa ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION recharge_credits(
  p_bar_id     UUID,
  p_table_id   UUID,
  p_amount     INT,
  p_reference  TEXT DEFAULT NULL,
  p_qr_code    TEXT DEFAULT NULL,
  p_verified_by TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser positivo';
  END IF;

  UPDATE tables
     SET credits = credits + p_amount
   WHERE id = p_table_id AND bar_id = p_bar_id
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference, qr_code, verified_by)
  VALUES (p_bar_id, p_table_id, p_amount, 'recharge', p_reference, p_qr_code, p_verified_by);

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, COALESCE(p_verified_by, 'Sistema'),
          'credits_recharged',
          'Mesa recargó ' || p_amount || ' créditos. Ref: ' || COALESCE(p_reference, '-'));

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION recharge_credits TO authenticated;

-- ── RPC: avanzar canción (admin) ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION play_next_song(p_bar_id UUID)
RETURNS queue
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current  queue%ROWTYPE;
  v_next     queue%ROWTYPE;
BEGIN
  -- Marcar canción actual como played
  UPDATE queue
     SET status = 'played', played_at = NOW()
   WHERE bar_id = p_bar_id AND status = 'playing'
  RETURNING * INTO v_current;

  -- Actualizar stats del día
  INSERT INTO bar_stats (bar_id, date, total_songs)
  VALUES (p_bar_id, CURRENT_DATE, 1)
  ON CONFLICT (bar_id, date)
  DO UPDATE SET total_songs = bar_stats.total_songs + 1;

  -- Obtener siguiente en cola (mayor puja → menor posición)
  SELECT * INTO v_next
    FROM queue
   WHERE bar_id = p_bar_id AND status = 'queued'
   ORDER BY bid_amount DESC, position ASC
   LIMIT 1;

  IF FOUND THEN
    UPDATE queue SET status = 'playing' WHERE id = v_next.id;
    v_next.status := 'playing';

    INSERT INTO activity_log (bar_id, actor, action, detail)
    VALUES (p_bar_id, 'Sistema', 'song_started', v_next.title || ' — ' || v_next.artist);

    RETURN v_next;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION play_next_song TO authenticated;

-- ── RPC: skipear canción con refund de créditos ───────────────────────────────

CREATE OR REPLACE FUNCTION skip_song(p_queue_id UUID, p_bar_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_item queue%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM queue WHERE id = p_queue_id AND bar_id = p_bar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canción no encontrada en la cola';
  END IF;

  UPDATE queue SET status = 'skipped', played_at = NOW() WHERE id = p_queue_id;

  -- Devolver créditos de la puja si aplica
  IF v_item.bid_amount > 0 AND v_item.table_id IS NOT NULL THEN
    UPDATE tables SET credits = credits + v_item.bid_amount WHERE id = v_item.table_id;

    INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference)
    VALUES (p_bar_id, v_item.table_id, v_item.bid_amount, 'refund',
            'Refund puja skipped: ' || v_item.title);
  END IF;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'song_skipped', v_item.title || ' — ' || v_item.artist);
END;
$$;

GRANT EXECUTE ON FUNCTION skip_song TO authenticated;

-- ── RPC: validar session_token de mesa ────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_table_session(
  p_bar_id      UUID,
  p_token       TEXT
)
RETURNS tables
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM tables
   WHERE bar_id = p_bar_id
     AND session_token = p_token
     AND is_active = TRUE
     AND is_banned = FALSE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION validate_table_session TO anon, authenticated;

-- ── RPC: obtener créditos de una mesa por token ───────────────────────────────

CREATE OR REPLACE FUNCTION get_table_credits(
  p_bar_id UUID,
  p_token  TEXT
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT credits FROM tables
   WHERE bar_id = p_bar_id AND session_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_table_credits TO anon, authenticated;
