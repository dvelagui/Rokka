-- ============================================================
-- 013 — Fix: gen_random_bytes() not found in production
-- ============================================================
-- En Supabase, pgcrypto se instala en el esquema "extensions", pero las
-- funciones SECURITY DEFINER con `SET search_path = public` (u otro
-- search_path que no incluya "extensions") no pueden resolver
-- gen_random_bytes(), causando: function gen_random_bytes(integer) does not exist.
-- Se agrega "extensions" al search_path de las funciones afectadas.

ALTER FUNCTION initiate_recharge_qr(UUID, UUID, INT, TEXT)
  SET search_path = public, extensions;

ALTER FUNCTION refresh_table_session(UUID, UUID)
  SET search_path = public, extensions;
