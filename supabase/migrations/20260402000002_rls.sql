-- ============================================================
-- 002 — ROW LEVEL SECURITY
-- ============================================================
-- Modelo de acceso:
--   - El cliente (mesas) accede de forma anónima con session_token
--   - El admin usa authenticated o service_role
--   - Las RPCs SECURITY DEFINER manejan mutaciones sensibles
-- ============================================================

-- ── Habilitar RLS en todas las tablas ─────────────────────────────────────────

ALTER TABLE bars                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables              ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue               ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_subcategories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres              ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_songs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_songs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_stats           ENABLE ROW LEVEL SECURITY;

-- ── bars: lectura pública, escritura sólo admin ───────────────────────────────

CREATE POLICY "bars_read_all"
  ON bars FOR SELECT USING (TRUE);

CREATE POLICY "bars_write_admin"
  ON bars FOR ALL USING (auth.role() = 'service_role');

-- ── tables: lectura pública, escritura sólo admin ─────────────────────────────

CREATE POLICY "tables_read_all"
  ON tables FOR SELECT USING (TRUE);

CREATE POLICY "tables_write_admin"
  ON tables FOR ALL USING (auth.role() = 'service_role');

-- ── queue: lectura pública, escritura anon/authenticated + admin ───────────────

CREATE POLICY "queue_read_all"
  ON queue FOR SELECT USING (TRUE);

CREATE POLICY "queue_insert_anon"
  ON queue FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "queue_update_admin"
  ON queue FOR UPDATE USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "queue_delete_admin"
  ON queue FOR DELETE USING (auth.role() = 'service_role');

-- ── votes: lectura pública, inserción anon ────────────────────────────────────

CREATE POLICY "votes_read_all"
  ON votes FOR SELECT USING (TRUE);

CREATE POLICY "votes_insert_anon"
  ON votes FOR INSERT WITH CHECK (TRUE);

-- ── chat_messages: lectura pública, inserción anon ────────────────────────────

CREATE POLICY "chat_read_all"
  ON chat_messages FOR SELECT USING (TRUE);

CREATE POLICY "chat_insert_anon"
  ON chat_messages FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "chat_update_admin"
  ON chat_messages FOR UPDATE USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "chat_delete_admin"
  ON chat_messages FOR DELETE USING (auth.role() = 'service_role');

-- ── credits_transactions: lectura/escritura admin ─────────────────────────────

CREATE POLICY "credits_tx_read_admin"
  ON credits_transactions FOR SELECT USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "credits_tx_write_admin"
  ON credits_transactions FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── waiters: sólo admin ───────────────────────────────────────────────────────

CREATE POLICY "waiters_admin_only"
  ON waiters FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── menú: lectura pública, escritura admin ────────────────────────────────────

CREATE POLICY "menu_categories_read_all"
  ON menu_categories FOR SELECT USING (TRUE);

CREATE POLICY "menu_categories_write_admin"
  ON menu_categories FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "menu_subcategories_read_all"
  ON menu_subcategories FOR SELECT USING (TRUE);

CREATE POLICY "menu_subcategories_write_admin"
  ON menu_subcategories FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "menu_items_read_all"
  ON menu_items FOR SELECT USING (TRUE);

CREATE POLICY "menu_items_write_admin"
  ON menu_items FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── orders: inserción anon, lectura/gestión admin ─────────────────────────────

CREATE POLICY "orders_read_admin"
  ON orders FOR SELECT USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "orders_insert_anon"
  ON orders FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE USING (auth.role() IN ('service_role', 'authenticated'));

-- ── ads: lectura pública ──────────────────────────────────────────────────────

CREATE POLICY "ads_read_all"
  ON ads FOR SELECT USING (is_active = TRUE);

CREATE POLICY "ads_write_admin"
  ON ads FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── géneros y canciones: lectura pública ──────────────────────────────────────

CREATE POLICY "genres_read_all"
  ON genres FOR SELECT USING (TRUE);

CREATE POLICY "genres_write_admin"
  ON genres FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "genre_songs_read_all"
  ON genre_songs FOR SELECT USING (TRUE);

CREATE POLICY "genre_songs_write_admin"
  ON genre_songs FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── favorites / blocked_songs: admin ─────────────────────────────────────────

CREATE POLICY "favorites_read_all"
  ON favorites FOR SELECT USING (TRUE);

CREATE POLICY "favorites_write_admin"
  ON favorites FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "blocked_songs_admin"
  ON blocked_songs FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ── activity_log / bar_stats: admin ──────────────────────────────────────────

CREATE POLICY "activity_log_admin"
  ON activity_log FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "bar_stats_admin"
  ON bar_stats FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));
