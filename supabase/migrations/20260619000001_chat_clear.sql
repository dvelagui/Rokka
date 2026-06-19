-- ── 1. Nuevo valor en el enum message_type ───────────────────────────────────
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'clear';

-- ── 2. RPC: limpiar manualmente el chat de un bar (llamada desde admin) ───────
CREATE OR REPLACE FUNCTION clear_chat_messages(p_bar_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM chat_messages WHERE bar_id = p_bar_id;

  -- Insertar marcador 'clear' para que los clientes conectados re-fetchen vía realtime
  INSERT INTO chat_messages (bar_id, message, message_type)
  VALUES (p_bar_id, 'Chat limpiado por el administrador', 'clear');
END;
$$;

GRANT EXECUTE ON FUNCTION clear_chat_messages(UUID) TO authenticated;

-- ── 3. Función para limpieza automática periódica ─────────────────────────────
CREATE OR REPLACE FUNCTION auto_clear_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bar_id UUID;
BEGIN
  FOR v_bar_id IN
    SELECT DISTINCT bar_id
    FROM   chat_messages
    WHERE  created_at < NOW() - INTERVAL '12 hours'
      AND  message_type != 'clear'
  LOOP
    DELETE FROM chat_messages
    WHERE  bar_id = v_bar_id
      AND  message_type != 'clear';

    INSERT INTO chat_messages (bar_id, message, message_type)
    VALUES (v_bar_id, 'Chat reiniciado automáticamente', 'clear');
  END LOOP;
END;
$$;

-- ── 4. Programar ejecución cada 12 horas via pg_cron ─────────────────────────
-- (pg_cron está disponible en Supabase cloud; en local puede no ejecutarse
--  en background pero la migración no falla)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Evitar duplicados si la migración se re-aplica
  BEGIN
    PERFORM cron.unschedule('rokka-auto-clear-chat');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'rokka-auto-clear-chat',
    '0 */12 * * *',
    'SELECT auto_clear_old_chat_messages()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible, se omite el cron de limpieza automática: %', SQLERRM;
END;
$$;
