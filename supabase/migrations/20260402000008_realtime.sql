-- ============================================================
-- 008 — REALTIME: REPLICA IDENTITY FULL
-- Necesario para que Supabase Realtime incluya los datos
-- completos en los eventos UPDATE y DELETE.
-- ============================================================

ALTER TABLE queue          REPLICA IDENTITY FULL;
ALTER TABLE chat_messages  REPLICA IDENTITY FULL;
ALTER TABLE votes          REPLICA IDENTITY FULL;
ALTER TABLE tables         REPLICA IDENTITY FULL;
ALTER TABLE ads            REPLICA IDENTITY FULL;
ALTER TABLE orders         REPLICA IDENTITY FULL;
