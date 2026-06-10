-- ============================================================
-- 015 — Fix: admin no puede escribir en activity_log
-- ============================================================
-- 005_rls_scoped dejó activity_log solo con policy de SELECT para admin,
-- asumiendo que todos los INSERT pasarían por RPCs SECURITY DEFINER. Pero
-- addLogEntry() y otras queries (orders.ts, tables.ts) insertan directo
-- desde el cliente admin autenticado, lo que RLS bloquea con:
-- "new row violates row-level security policy for table activity_log".
--
-- Se agrega policy de INSERT para admins, scoped a su propio bar.

CREATE POLICY "activity_log__admin_insert"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));
