-- ============================================================
-- 009 — RPCs: envío seguro de mensajes y votación con skip automático
-- ============================================================

-- ── RPC: enviar mensaje con filtro de groserías y autoban ─────────────────────
-- Retorna JSONB:
--   {success: true,  data: <chat_messages row>}
--   {success: false, profanity: true}
--   {success: false, banned: true}   ← ban recién aplicado
--   {success: false, error: "..."}   ← otros errores

CREATE OR REPLACE FUNCTION send_message_safe(
  p_bar_id  UUID,
  p_token   TEXT,
  p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table        tables%ROWTYPE;
  v_new_msg      chat_messages%ROWTYPE;
  v_flag_count   INT;
  PROFANITY_LIST TEXT[] := ARRAY[
    'mierda','puta','puto','hijueputa','carajo','verga',
    'fuck','shit','bitch','pendejo'
  ];
BEGIN
  -- Validar sesión
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id
     AND session_token = p_token
     AND is_active
     AND NOT is_banned;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sesión inválida o mesa baneada');
  END IF;

  -- Validar longitud
  IF char_length(p_message) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mensaje demasiado largo (máx 200 caracteres)');
  END IF;

  -- Verificar groserías
  IF EXISTS (
    SELECT 1 FROM unnest(PROFANITY_LIST) AS w
     WHERE p_message ILIKE '%' || w || '%'
  ) THEN
    -- Registrar intento
    INSERT INTO activity_log (bar_id, actor, action, detail)
    VALUES (p_bar_id, v_table.label, 'profanity_attempt',
            'Mensaje filtrado: ' || left(p_message, 50));

    -- Contar intentos en los últimos 10 minutos
    SELECT COUNT(*) INTO v_flag_count
      FROM activity_log
     WHERE bar_id = p_bar_id
       AND actor = v_table.label
       AND action = 'profanity_attempt'
       AND created_at >= NOW() - INTERVAL '10 minutes';

    -- Autoban si alcanza el umbral
    IF v_flag_count >= 3 THEN
      UPDATE tables SET is_banned = TRUE WHERE id = v_table.id;

      INSERT INTO chat_messages (bar_id, table_id, message, message_type)
      VALUES (p_bar_id, NULL,
              v_table.label || ' ha sido silenciada por lenguaje inapropiado',
              'system');

      INSERT INTO activity_log (bar_id, actor, action, detail)
      VALUES (p_bar_id, 'Sistema', 'table_auto_banned',
              v_table.label || ' baneada por 3 intentos de groserías en 10 min');

      RETURN jsonb_build_object('success', false, 'profanity', true, 'banned', true);
    END IF;

    RETURN jsonb_build_object('success', false, 'profanity', true);
  END IF;

  -- Insertar mensaje limpio
  INSERT INTO chat_messages (bar_id, table_id, message, message_type)
  VALUES (p_bar_id, v_table.id, p_message, 'msg')
  RETURNING * INTO v_new_msg;

  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_new_msg)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_message_safe TO anon, authenticated;

-- ── RPC: mensaje de admin (DJ) con soporte de pin ─────────────────────────────

CREATE OR REPLACE FUNCTION send_admin_chat_message(
  p_bar_id    UUID,
  p_message   TEXT,
  p_is_pinned BOOLEAN DEFAULT FALSE
)
RETURNS chat_messages
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row chat_messages%ROWTYPE;
BEGIN
  -- Desfijar mensajes previos si este va a ser fijado
  IF p_is_pinned THEN
    UPDATE chat_messages
       SET is_pinned = FALSE
     WHERE bar_id = p_bar_id AND is_pinned = TRUE;
  END IF;

  INSERT INTO chat_messages (bar_id, table_id, message, message_type, is_pinned)
  VALUES (p_bar_id, NULL, p_message, 'admin', p_is_pinned)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION send_admin_chat_message TO authenticated;

-- ── RPC: votar y comprobar skip automático ────────────────────────────────────
-- Retorna JSONB: {skip, keep, total, was_skipped}

CREATE OR REPLACE FUNCTION cast_vote_and_check(
  p_queue_id  UUID,
  p_table_id  UUID,
  p_bar_id    UUID,
  p_vote_type vote_type
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         queue%ROWTYPE;
  v_skip_count   INT;
  v_keep_count   INT;
  v_active_tables INT;
  v_was_skipped  BOOLEAN := FALSE;
BEGIN
  -- Verificar que la canción existe y está en estado válido
  SELECT * INTO v_item
    FROM queue
   WHERE id = p_queue_id AND bar_id = p_bar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canción no encontrada';
  END IF;

  IF v_item.status NOT IN ('queued', 'playing') THEN
    RAISE EXCEPTION 'Solo se puede votar en canciones en cola o reproduciendo';
  END IF;

  -- Insertar o actualizar voto
  INSERT INTO votes (queue_id, table_id, vote_type)
  VALUES (p_queue_id, p_table_id, p_vote_type)
  ON CONFLICT (queue_id, table_id)
  DO UPDATE SET vote_type = EXCLUDED.vote_type;

  -- Contar votos actualizados
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'skip'),
    COUNT(*) FILTER (WHERE vote_type = 'keep')
  INTO v_skip_count, v_keep_count
  FROM votes
  WHERE queue_id = p_queue_id;

  -- Contar mesas activas del bar
  SELECT COUNT(*) INTO v_active_tables
    FROM tables
   WHERE bar_id = p_bar_id AND is_active = TRUE AND is_banned = FALSE;

  v_active_tables := GREATEST(v_active_tables, 1);

  -- Comprobar umbral de skip (>50% de mesas activas)
  IF v_skip_count::FLOAT / v_active_tables > 0.5 THEN
    -- Marcar como skipped
    UPDATE queue
       SET status = 'skipped', played_at = NOW()
     WHERE id = p_queue_id;

    -- Devolver créditos de la puja si aplica
    IF v_item.bid_amount > 0 AND v_item.table_id IS NOT NULL THEN
      UPDATE tables
         SET credits = credits + v_item.bid_amount
       WHERE id = v_item.table_id;

      INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference)
      VALUES (p_bar_id, v_item.table_id, v_item.bid_amount, 'refund',
              'Refund por skip popular: ' || v_item.title);
    END IF;

    -- Mensaje de sistema en el chat
    INSERT INTO chat_messages (bar_id, table_id, message, message_type)
    VALUES (p_bar_id, NULL,
            'La canción "' || v_item.title || '" fue saltada por votación popular 🗳️',
            'system');

    INSERT INTO activity_log (bar_id, actor, action, detail)
    VALUES (p_bar_id, 'Sistema', 'song_voted_skip',
            v_item.title || ' — skip: ' || v_skip_count || '/' || v_active_tables || ' mesas');

    v_was_skipped := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'skip',        v_skip_count,
    'keep',        v_keep_count,
    'total',       v_skip_count + v_keep_count,
    'was_skipped', v_was_skipped
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cast_vote_and_check TO anon, authenticated;
