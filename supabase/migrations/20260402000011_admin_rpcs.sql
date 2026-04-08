-- ============================================================
-- 011 — RPCs administrativos: mesas, meseros, config
-- ============================================================

-- ── RPC: banear mesa ──────────────────────────────────────────────────────────
-- Setea is_banned, invalida token, inserta mensaje sistema, registra log.

CREATE OR REPLACE FUNCTION ban_table_rpc(
  p_bar_id   UUID,
  p_table_id UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  SELECT label INTO v_label
    FROM tables
   WHERE id = p_table_id AND bar_id = p_bar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  UPDATE tables
     SET is_banned = TRUE,
         session_token = NULL
   WHERE id = p_table_id;

  INSERT INTO chat_messages (bar_id, table_id, message, message_type)
  VALUES (
    p_bar_id,
    NULL,
    v_label || ' ha sido bloqueada por el administrador' ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END,
    'system'
  );

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (
    p_bar_id,
    'Admin',
    'table_banned',
    v_label || CASE WHEN p_reason IS NOT NULL THEN ' — razón: ' || p_reason ELSE '' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ban_table_rpc TO authenticated;

-- ── RPC: desbanear mesa ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION unban_table_rpc(p_bar_id UUID, p_table_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  SELECT label INTO v_label
    FROM tables
   WHERE id = p_table_id AND bar_id = p_bar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  UPDATE tables SET is_banned = FALSE WHERE id = p_table_id;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'table_unbanned', v_label || ' desbaneada');
END;
$$;

GRANT EXECUTE ON FUNCTION unban_table_rpc TO authenticated;

-- ── RPC: activar/desactivar mesa ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION toggle_table_active_rpc(p_bar_id UUID, p_table_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label     TEXT;
  v_is_active BOOLEAN;
BEGIN
  SELECT label, is_active INTO v_label, v_is_active
    FROM tables
   WHERE id = p_table_id AND bar_id = p_bar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  -- Al desactivar, invalidar el token de sesión
  IF v_is_active THEN
    UPDATE tables
       SET is_active = FALSE, session_token = NULL
     WHERE id = p_table_id;
  ELSE
    UPDATE tables
       SET is_active = TRUE
     WHERE id = p_table_id;
  END IF;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (
    p_bar_id,
    'Admin',
    CASE WHEN v_is_active THEN 'table_deactivated' ELSE 'table_activated' END,
    v_label
  );

  RETURN NOT v_is_active;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_table_active_rpc TO authenticated;

-- ── RPC: validar PIN de mesero ────────────────────────────────────────────────
-- Usado para confirmar recargas y acciones de mesero.

CREATE OR REPLACE FUNCTION authenticate_waiter(p_bar_id UUID, p_pin TEXT)
RETURNS TABLE(
  id         UUID,
  name       TEXT,
  phone      TEXT,
  shift      TEXT,
  is_active  BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, phone, shift, is_active
    FROM waiters
   WHERE bar_id = p_bar_id
     AND pin = p_pin
     AND is_active = TRUE
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION authenticate_waiter TO anon, authenticated;

-- ── RPC: crear mesero con validación de PIN único ─────────────────────────────

CREATE OR REPLACE FUNCTION create_waiter_rpc(
  p_bar_id UUID,
  p_name   TEXT,
  p_pin    TEXT,
  p_phone  TEXT DEFAULT NULL,
  p_shift  TEXT DEFAULT 'full'
)
RETURNS waiters
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row waiters%ROWTYPE;
BEGIN
  -- Validar formato de PIN
  IF p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'El PIN debe ser de exactamente 4 dígitos';
  END IF;

  -- Validar unicidad del PIN dentro del bar
  IF EXISTS (SELECT 1 FROM waiters WHERE bar_id = p_bar_id AND pin = p_pin) THEN
    RAISE EXCEPTION 'Ya existe un mesero con ese PIN en este bar';
  END IF;

  INSERT INTO waiters (bar_id, name, pin, phone, shift)
  VALUES (p_bar_id, p_name, p_pin, p_phone, p_shift)
  RETURNING * INTO v_row;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'waiter_created', p_name || ' (turno: ' || p_shift || ')');

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION create_waiter_rpc TO authenticated;

-- ── RPC: merge de configuración del bar ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_bar_config(
  p_bar_id UUID,
  p_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_config JSONB;
BEGIN
  -- Extraer tv_pin si viene en el payload y actualizarlo en la columna dedicada
  IF p_config ? 'tv_pin' THEN
    UPDATE bars SET tv_pin = p_config->>'tv_pin' WHERE id = p_bar_id;
  END IF;

  -- Merge config JSONB (|| sobrescribe las claves existentes)
  UPDATE bars
     SET config      = config || (p_config - 'tv_pin'),
         updated_at  = NOW()
   WHERE id = p_bar_id
  RETURNING config INTO v_new_config;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bar no encontrado';
  END IF;

  RETURN v_new_config;
END;
$$;

GRANT EXECUTE ON FUNCTION update_bar_config TO authenticated;
