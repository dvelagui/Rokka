-- ============================================================
-- 006 — RPCs complementarios para RLS scoped
-- ============================================================
-- Estos RPCs permiten que anon (mesas) lean datos sensibles que
-- sólo existen en tablas sin policy anon SELECT.
-- ============================================================

-- ── RPC: obtener pedidos de una mesa por token ────────────────────────────────

CREATE OR REPLACE FUNCTION get_orders_for_table(
  p_bar_id UUID,
  p_token  TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table tables%ROWTYPE;
BEGIN
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id AND session_token = p_token AND is_active AND NOT is_banned;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida o mesa inactiva';
  END IF;

  RETURN QUERY
    SELECT * FROM orders
     WHERE bar_id = p_bar_id AND table_id = v_table.id
     ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_orders_for_table TO anon, authenticated;

-- ── RPC: obtener historial de créditos de una mesa por token ──────────────────

CREATE OR REPLACE FUNCTION get_credits_history_for_table(
  p_bar_id UUID,
  p_token  TEXT
)
RETURNS SETOF credits_transactions
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table tables%ROWTYPE;
BEGIN
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id AND session_token = p_token AND is_active AND NOT is_banned;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida o mesa inactiva';
  END IF;

  RETURN QUERY
    SELECT * FROM credits_transactions
     WHERE bar_id = p_bar_id AND table_id = v_table.id
     ORDER BY created_at DESC
     LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_credits_history_for_table TO anon, authenticated;

-- ── RPC: enviar mensaje de chat validando token ───────────────────────────────
-- Evita que anon inserte mensajes sin pertenecer a una mesa activa.

CREATE OR REPLACE FUNCTION send_chat_message(
  p_bar_id      UUID,
  p_token       TEXT,
  p_message     TEXT,
  p_message_type message_type DEFAULT 'msg'
)
RETURNS chat_messages
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table tables%ROWTYPE;
  v_row   chat_messages%ROWTYPE;
BEGIN
  -- Validar token
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id AND session_token = p_token AND is_active AND NOT is_banned;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida o mesa baneada';
  END IF;

  -- Validar que sólo mesas usen tipos de mensaje permitidos
  IF p_message_type NOT IN ('msg', 'reaction') THEN
    RAISE EXCEPTION 'Tipo de mensaje no permitido para mesas';
  END IF;

  INSERT INTO chat_messages (bar_id, table_id, message, message_type)
  VALUES (p_bar_id, v_table.id, p_message, p_message_type)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION send_chat_message TO anon, authenticated;

-- ── RPC: crear pedido validando token ────────────────────────────────────────

CREATE OR REPLACE FUNCTION place_order(
  p_bar_id UUID,
  p_token  TEXT,
  p_items  JSONB,
  p_total  INT
)
RETURNS orders
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table tables%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  -- Validar token
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id AND session_token = p_token AND is_active AND NOT is_banned;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida o mesa baneada';
  END IF;

  IF p_total <= 0 THEN
    RAISE EXCEPTION 'El total debe ser mayor a 0';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe tener al menos un ítem';
  END IF;

  INSERT INTO orders (bar_id, table_id, items, total, status)
  VALUES (p_bar_id, v_table.id, p_items, p_total, 'pending')
  RETURNING * INTO v_order;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, v_table.label, 'order_placed',
          'Pedido por $' || p_total || ' (' || jsonb_array_length(p_items) || ' ítems)');

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order TO anon, authenticated;

-- ── RPC: info pública del bar (sin tv_pin) ────────────────────────────────────
-- Usada por TV y mesas para leer nombre, config y estado del bar.

CREATE OR REPLACE FUNCTION get_bar_public_info(p_bar_id UUID)
RETURNS TABLE(
  id         UUID,
  name       TEXT,
  emoji      TEXT,
  slug       TEXT,
  is_open    BOOLEAN,
  config     JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, emoji, slug,
         (config->>'is_open')::boolean AS is_open,
         config
    FROM bars
   WHERE id = p_bar_id;
$$;

GRANT EXECUTE ON FUNCTION get_bar_public_info TO anon, authenticated;

-- ── RPC: verificar si una canción está bloqueada ──────────────────────────────
-- Antes de pedir una canción, el cliente puede verificar si está vetada.

CREATE OR REPLACE FUNCTION is_song_blocked(
  p_bar_id UUID,
  p_title  TEXT,
  p_artist TEXT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_songs
     WHERE bar_id = p_bar_id
       AND lower(title)  = lower(p_title)
       AND lower(artist) = lower(p_artist)
  );
$$;

GRANT EXECUTE ON FUNCTION is_song_blocked TO anon, authenticated;
