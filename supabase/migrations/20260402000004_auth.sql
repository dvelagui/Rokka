-- ============================================================
-- 004 — AUTH: bar_admins, tv_pin, RPCs de sesión
-- ============================================================

-- ── Agregar tv_pin a bars ─────────────────────────────────────────────────────

ALTER TABLE bars ADD COLUMN IF NOT EXISTS tv_pin TEXT;

-- ── Tabla: bar_admins ─────────────────────────────────────────────────────────

CREATE TYPE admin_role AS ENUM ('owner', 'manager');

CREATE TABLE bar_admins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_id     UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  role       admin_role  NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, bar_id)
);

ALTER TABLE bar_admins ENABLE ROW LEVEL SECURITY;

-- El admin sólo ve sus propios registros
CREATE POLICY "bar_admins_select_own"
  ON bar_admins FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "bar_admins_insert_service"
  ON bar_admins FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "bar_admins_delete_service"
  ON bar_admins FOR DELETE
  USING (auth.role() = 'service_role');

-- ── RPC: buscar mesa sólo por token ──────────────────────────────────────────
-- Usado por /join en la app de mesas (anon, sin bar_id)

CREATE OR REPLACE FUNCTION get_table_by_token(p_token TEXT)
RETURNS TABLE(
  table_id     UUID,
  bar_id       UUID,
  table_number INT,
  label        TEXT,
  credits      INT,
  is_active    BOOLEAN,
  is_banned    BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    t.id        AS table_id,
    t.bar_id,
    t.number    AS table_number,
    t.label,
    t.credits,
    t.is_active,
    t.is_banned
  FROM tables t
  WHERE t.session_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_table_by_token TO anon, authenticated;

-- ── RPC: renovar token de una mesa (admin genera QR) ─────────────────────────

CREATE OR REPLACE FUNCTION refresh_table_session(p_bar_id UUID, p_table_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Verificar que la mesa pertenece a ese bar
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id AND bar_id = p_bar_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada en ese bar';
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');

  UPDATE tables
     SET session_token = v_token
   WHERE id = p_table_id AND bar_id = p_bar_id;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'table_qr_regenerated',
          'QR regenerado para ' || (SELECT label FROM tables WHERE id = p_table_id));

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_table_session TO authenticated;

-- ── RPC: verificar PIN de TV ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_tv_pin(p_bar_slug TEXT, p_pin TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id
    FROM bars
   WHERE slug = p_bar_slug
     AND tv_pin = p_pin
     AND tv_pin IS NOT NULL
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION verify_tv_pin TO anon, authenticated;

-- ── RPC: registrar bar + admin tras signUp ────────────────────────────────────
-- Se llama una vez después de auth.signUp para crear el bar y vincularlo.

CREATE OR REPLACE FUNCTION register_bar_admin(
  p_user_id UUID,
  p_bar_name TEXT,
  p_bar_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bar_id UUID;
  v_slug   TEXT := p_bar_slug;
  v_n      INT  := 1;
BEGIN
  -- Garantizar slug único añadiendo sufijo si ya existe
  WHILE EXISTS (SELECT 1 FROM bars WHERE slug = v_slug) LOOP
    v_slug := p_bar_slug || '-' || v_n;
    v_n    := v_n + 1;
  END LOOP;

  INSERT INTO bars (name, slug)
  VALUES (p_bar_name, v_slug)
  RETURNING id INTO v_bar_id;

  INSERT INTO bar_admins (user_id, bar_id, role)
  VALUES (p_user_id, v_bar_id, 'owner');

  RETURN v_bar_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_bar_admin TO authenticated;

-- ── Seed: agregar tv_pin al bar de ejemplo ────────────────────────────────────

UPDATE bars SET tv_pin = '123456' WHERE slug = 'la-noche';
