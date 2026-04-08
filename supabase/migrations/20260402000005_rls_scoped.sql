-- ============================================================
-- 005 — RLS SCOPED: Policies por bar, por rol
-- ============================================================
--
-- MODELO DE ACCESO
-- ─────────────────
-- • service_role   → bypass total de RLS (Server Actions, RPCs SECURITY DEFINER)
-- • authenticated  → admin autenticado; scope siempre = su propio bar via bar_admins
-- • anon           → mesas y TV; sin identidad Supabase
--                    - lecturas de datos públicos del bar (UUIDs son unguessables)
--                    - escrituras sólo en tablas de bajo riesgo con constraints
--                    - mutaciones sensibles SIEMPRE vía RPC SECURITY DEFINER
--
-- NOTA IMPORTANTE sobre anon + Realtime
-- ──────────────────────────────────────
-- Para que el suscriptor anon reciba eventos de Realtime, la política SELECT
-- debe evaluar TRUE. Como las mesas no tienen uid(), usamos USING (TRUE) para
-- datos semipúblicos (queue, chat, menu, ads, géneros).
-- La aislación de bar se consigue porque los clientes filtran por bar_id (UUID
-- imposible de adivinar) en sus queries y suscripciones.
-- ============================================================

-- ── 1. Eliminar todas las policies de la migración 002 ────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN (
         -- bars
         'bars_read_all', 'bars_write_admin',
         -- tables
         'tables_read_all', 'tables_write_admin',
         -- queue
         'queue_read_all', 'queue_insert_anon', 'queue_update_admin', 'queue_delete_admin',
         -- votes
         'votes_read_all', 'votes_insert_anon',
         -- chat
         'chat_read_all', 'chat_insert_anon', 'chat_update_admin', 'chat_delete_admin',
         -- credits
         'credits_tx_read_admin', 'credits_tx_write_admin',
         -- waiters
         'waiters_admin_only',
         -- menu
         'menu_categories_read_all', 'menu_categories_write_admin',
         'menu_subcategories_read_all', 'menu_subcategories_write_admin',
         'menu_items_read_all', 'menu_items_write_admin',
         -- orders
         'orders_read_admin', 'orders_insert_anon', 'orders_update_admin',
         -- ads
         'ads_read_all', 'ads_write_admin',
         -- géneros
         'genres_read_all', 'genres_write_admin',
         'genre_songs_read_all', 'genre_songs_write_admin',
         -- misc
         'favorites_read_all', 'favorites_write_admin',
         'blocked_songs_admin',
         'activity_log_admin', 'bar_stats_admin'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END
$$;

-- ── 2. Funciones helper ───────────────────────────────────────────────────────

-- Retorna el bar_id del usuario autenticado actual.
-- SECURITY DEFINER + search_path fijado = seguro contra search_path injection.
-- STABLE permite que el query planner lo evalúe una vez por sentencia, no por fila.
CREATE OR REPLACE FUNCTION get_bar_id_for_user(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bar_id FROM bar_admins WHERE user_id = p_user_id LIMIT 1;
$$;

-- Devuelve TRUE si el usuario actual es admin del bar indicado.
CREATE OR REPLACE FUNCTION is_admin_of_bar(p_bar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bar_admins
     WHERE user_id = auth.uid() AND bar_id = p_bar_id
  );
$$;

-- Devuelve TRUE si la mesa está activa y no baneada.
-- Usada internamente por los RPCs; expuesta también para validaciones en app.
CREATE OR REPLACE FUNCTION is_table_active(p_table_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tables
     WHERE id = p_table_id
       AND is_active = TRUE
       AND is_banned  = FALSE
  );
$$;

-- Grants
GRANT EXECUTE ON FUNCTION get_bar_id_for_user  TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_of_bar       TO authenticated;
GRANT EXECUTE ON FUNCTION is_table_active       TO authenticated, anon;

-- ── 3. bars ───────────────────────────────────────────────────────────────────
-- Admins ven y editan sólo su propio bar.
-- Anon no accede directamente (usa RPCs como verify_tv_pin, get_active_queue).

CREATE POLICY "bars__admin_select"
  ON bars FOR SELECT TO authenticated
  USING (id = (SELECT get_bar_id_for_user()));

CREATE POLICY "bars__admin_update"
  ON bars FOR UPDATE TO authenticated
  USING (id = (SELECT get_bar_id_for_user()))
  WITH CHECK (id = (SELECT get_bar_id_for_user()));

-- ── 4. tables (mesas) ─────────────────────────────────────────────────────────
-- CRUD completo para el admin de ese bar.
-- Anon no lee tables directamente; las RPCs SECURITY DEFINER se encargan.

CREATE POLICY "tables__admin_select"
  ON tables FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "tables__admin_insert"
  ON tables FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "tables__admin_update"
  ON tables FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "tables__admin_delete"
  ON tables FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 5. queue ──────────────────────────────────────────────────────────────────
-- SELECT: público (anon + authenticated) — necesario para Realtime.
-- INSERT: solo vía RPC request_song (SECURITY DEFINER). No hay policy anon INSERT.
-- UPDATE/DELETE: admin de ese bar.

CREATE POLICY "queue__public_select"
  ON queue FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "queue__admin_update"
  ON queue FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "queue__admin_delete"
  ON queue FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 6. votes ──────────────────────────────────────────────────────────────────
-- SELECT: público.
-- INSERT: solo vía RPC vote_on_song (SECURITY DEFINER). El UNIQUE(queue_id, table_id)
--         ya impide votar dos veces por la misma canción.

CREATE POLICY "votes__public_select"
  ON votes FOR SELECT TO anon, authenticated
  USING (TRUE);

-- ── 7. chat_messages ──────────────────────────────────────────────────────────
-- SELECT: público (Realtime).
-- INSERT anon: mesas pueden enviar mensajes normales y reacciones.
--   Constraints: no pueden poner is_pinned=true ni message_type admin/system.
-- INSERT authenticated: admin puede enviar cualquier tipo de mensaje de su bar.
-- UPDATE/DELETE: sólo admin (para pinear, borrar mensajes).

CREATE POLICY "chat__public_select"
  ON chat_messages FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "chat__anon_insert"
  ON chat_messages FOR INSERT TO anon
  WITH CHECK (
    message_type IN ('msg', 'reaction')
    AND is_pinned = FALSE
  );

CREATE POLICY "chat__admin_insert"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "chat__admin_update"
  ON chat_messages FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "chat__admin_delete"
  ON chat_messages FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 8. credits_transactions ───────────────────────────────────────────────────
-- SELECT: admin ve todas las transacciones de su bar.
-- INSERT/UPDATE/DELETE: solo vía RPCs SECURITY DEFINER (recharge_credits, etc.)
--   No hay policy de INSERT para authenticated o anon.

CREATE POLICY "credits_tx__admin_select"
  ON credits_transactions FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 9. waiters ────────────────────────────────────────────────────────────────

CREATE POLICY "waiters__admin_all"
  ON waiters FOR ALL TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

-- ── 10. menu_categories ───────────────────────────────────────────────────────

CREATE POLICY "menu_categories__public_select"
  ON menu_categories FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "menu_categories__admin_write"
  ON menu_categories FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "menu_categories__admin_update"
  ON menu_categories FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "menu_categories__admin_delete"
  ON menu_categories FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 11. menu_subcategories ────────────────────────────────────────────────────
-- No tiene bar_id propio; la aislación usa join a menu_categories.

CREATE POLICY "menu_subcategories__public_select"
  ON menu_subcategories FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "menu_subcategories__admin_write"
  ON menu_subcategories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_categories mc
       WHERE mc.id = category_id
         AND mc.bar_id = (SELECT get_bar_id_for_user())
    )
  );

CREATE POLICY "menu_subcategories__admin_update"
  ON menu_subcategories FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
       WHERE mc.id = category_id
         AND mc.bar_id = (SELECT get_bar_id_for_user())
    )
  );

CREATE POLICY "menu_subcategories__admin_delete"
  ON menu_subcategories FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
       WHERE mc.id = category_id
         AND mc.bar_id = (SELECT get_bar_id_for_user())
    )
  );

-- ── 12. menu_items ────────────────────────────────────────────────────────────

CREATE POLICY "menu_items__public_select"
  ON menu_items FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "menu_items__admin_write"
  ON menu_items FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "menu_items__admin_update"
  ON menu_items FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "menu_items__admin_delete"
  ON menu_items FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 13. orders ────────────────────────────────────────────────────────────────
-- SELECT: admin ve todas las de su bar; las mesas ven las suyas vía RPC.
-- INSERT anon: mesas pueden crear pedidos (status='pending', total>=0).
--   La validación completa (mesa activa, items válidos) queda en el app layer.
-- UPDATE: sólo admin.

CREATE POLICY "orders__admin_select"
  ON orders FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "orders__anon_insert"
  ON orders FOR INSERT TO anon
  WITH CHECK (
    status = 'pending'
    AND total >= 0
    AND jsonb_array_length(items) > 0
  );

CREATE POLICY "orders__admin_update"
  ON orders FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "orders__admin_delete"
  ON orders FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 14. ads ───────────────────────────────────────────────────────────────────
-- Anon puede leer anuncios activos (TV necesita esto con Realtime).

CREATE POLICY "ads__public_select"
  ON ads FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "ads__admin_select_all"
  ON ads FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "ads__admin_write"
  ON ads FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "ads__admin_update"
  ON ads FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "ads__admin_delete"
  ON ads FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 15. genres ────────────────────────────────────────────────────────────────

CREATE POLICY "genres__public_select"
  ON genres FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "genres__admin_write"
  ON genres FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "genres__admin_update"
  ON genres FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "genres__admin_delete"
  ON genres FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 16. genre_songs ───────────────────────────────────────────────────────────
-- No tiene bar_id propio; usa join a genres.

CREATE POLICY "genre_songs__public_select"
  ON genre_songs FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "genre_songs__admin_write"
  ON genre_songs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM genres g
       WHERE g.id = genre_id
         AND g.bar_id = (SELECT get_bar_id_for_user())
    )
  );

CREATE POLICY "genre_songs__admin_update"
  ON genre_songs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM genres g
       WHERE g.id = genre_id
         AND g.bar_id = (SELECT get_bar_id_for_user())
    )
  );

CREATE POLICY "genre_songs__admin_delete"
  ON genre_songs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM genres g
       WHERE g.id = genre_id
         AND g.bar_id = (SELECT get_bar_id_for_user())
    )
  );

-- ── 17. favorites ─────────────────────────────────────────────────────────────

CREATE POLICY "favorites__public_select"
  ON favorites FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "favorites__admin_write"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "favorites__admin_update"
  ON favorites FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "favorites__admin_delete"
  ON favorites FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 18. blocked_songs ─────────────────────────────────────────────────────────

CREATE POLICY "blocked_songs__admin_select"
  ON blocked_songs FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "blocked_songs__admin_write"
  ON blocked_songs FOR INSERT TO authenticated
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "blocked_songs__admin_update"
  ON blocked_songs FOR UPDATE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()))
  WITH CHECK (bar_id = (SELECT get_bar_id_for_user()));

CREATE POLICY "blocked_songs__admin_delete"
  ON blocked_songs FOR DELETE TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 19. activity_log ──────────────────────────────────────────────────────────
-- Solo admin puede leer.
-- INSERT solo vía RPCs SECURITY DEFINER (request_song, skip_song, etc. ya lo hacen).
-- No hay policy de INSERT para roles directos → fuerza el uso de RPCs.

CREATE POLICY "activity_log__admin_select"
  ON activity_log FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 20. bar_stats ─────────────────────────────────────────────────────────────
-- Solo admin puede leer.
-- INSERT/UPDATE solo vía RPCs SECURITY DEFINER (play_next_song lo actualiza).

CREATE POLICY "bar_stats__admin_select"
  ON bar_stats FOR SELECT TO authenticated
  USING (bar_id = (SELECT get_bar_id_for_user()));

-- ── 21. bar_admins ────────────────────────────────────────────────────────────
-- Ya tiene policies desde la migración 004.
-- Forzamos idempotencia por si acaso.

DROP POLICY IF EXISTS "bar_admins_select_own"   ON bar_admins;
DROP POLICY IF EXISTS "bar_admins_insert_service" ON bar_admins;
DROP POLICY IF EXISTS "bar_admins_delete_service" ON bar_admins;

CREATE POLICY "bar_admins__own_select"
  ON bar_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT y DELETE sólo via service_role (register_bar_admin RPC lo hace)
