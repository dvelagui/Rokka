-- ── Estrategia de cola vacía ──────────────────────────────────────────────────
-- Si al avanzar la cola no queda nada en estado 'queued', play_next_song toma
-- la siguiente canción de "favorites" del bar (rotando por la menos
-- reproducida) y la pone a sonar directamente, para que la música nunca se
-- detenga aunque las mesas no pidan nada.

CREATE OR REPLACE FUNCTION play_next_song(p_bar_id UUID)
RETURNS queue
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current  queue%ROWTYPE;
  v_next     queue%ROWTYPE;
  v_fav      favorites%ROWTYPE;
  v_next_pos INT;
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

  -- Cola vacía: rotar a la siguiente favorita menos reproducida
  SELECT * INTO v_fav
    FROM favorites
   WHERE bar_id = p_bar_id
   ORDER BY times_played ASC, random()
   LIMIT 1;

  IF FOUND THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_pos
      FROM queue WHERE bar_id = p_bar_id;

    INSERT INTO queue (bar_id, title, artist, youtube_video_id, table_id, bid_amount, position, status)
    VALUES (p_bar_id, v_fav.title, v_fav.artist, v_fav.youtube_video_id, NULL, 0, v_next_pos, 'playing')
    RETURNING * INTO v_next;

    UPDATE favorites SET times_played = times_played + 1 WHERE id = v_fav.id;

    INSERT INTO activity_log (bar_id, actor, action, detail)
    VALUES (p_bar_id, 'Sistema', 'song_started', v_next.title || ' — ' || v_next.artist || ' (favorita automática)');

    RETURN v_next;
  END IF;

  RETURN NULL;
END;
$$;
