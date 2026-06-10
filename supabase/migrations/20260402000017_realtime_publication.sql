-- ============================================================
-- 017 — Fix: tablas no están en la publicación supabase_realtime
-- ============================================================
-- 008_realtime puso REPLICA IDENTITY FULL en estas tablas, pero
-- ninguna migración las agregó a la publicación `supabase_realtime`
-- (la que usa Supabase para enviar eventos `postgres_changes`).
-- Sin esto, los canales se suscriben sin error pero nunca reciben
-- eventos: la app cliente necesita refrescar para ver cambios en
-- cola, chat, créditos de mesa, votos, anuncios y pedidos.
--
-- Idempotente: omite las tablas que ya estén en la publicación
-- (p.ej. si alguna se agregó manualmente desde el dashboard).

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['queue', 'chat_messages', 'votes', 'tables', 'ads', 'orders']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
