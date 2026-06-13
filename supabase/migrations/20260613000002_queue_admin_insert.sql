-- ── Fix: el admin agrega canciones a la cola directamente vía
-- `.from('queue').insert(...)` (adminAddToQueue), pero no existía policy de
-- INSERT para "authenticated" en queue (solo INSERT vía RPC request_song
-- para anon). Sin esta policy, RLS bloquea el insert y el buscador del
-- admin falla silenciosamente.

CREATE POLICY "queue__admin_insert"
  ON queue FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));
