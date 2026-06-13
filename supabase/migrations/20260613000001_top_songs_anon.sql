-- ── Fix: la app de mesas (rol anon) usa get_top_songs en la pestaña "Top Bar",
-- pero la función solo estaba otorgada a "authenticated" (panel admin).
-- Sin este grant, la RPC falla con "permission denied" y la pestaña queda vacía.

GRANT EXECUTE ON FUNCTION get_top_songs TO anon;
