-- ============================================================
-- 018 — Fix: créditos de mesa no se actualizan en tiempo real
-- ============================================================
-- 005_rls_scoped solo dejó SELECT en `tables` para `authenticated`
-- (admin). El cliente (mesa anónima) se suscribe a postgres_changes
-- en `tables` para reflejar cambios de `credits` (recargas, pujas),
-- pero Realtime aplica RLS con el rol de la conexión: sin policy de
-- SELECT para `anon`, los eventos UPDATE nunca llegan y hay que
-- refrescar para ver el saldo actualizado.
--
-- Solo para `anon` (no `authenticated`): admin ya tiene su propia
-- policy `tables__admin_select` scoped a su bar_id. Si esta nueva
-- policy también aplicara a `authenticated`, al ser permissive (OR)
-- el admin vería las mesas de TODOS los bares.

CREATE POLICY "tables__anon_select"
  ON tables FOR SELECT TO anon
  USING (TRUE);
