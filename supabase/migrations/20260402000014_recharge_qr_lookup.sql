-- ============================================================
-- 014 — Fix: cliente anónimo no puede leer credits_transactions
-- ============================================================
-- credits_transactions solo tiene policy de SELECT para `authenticated`
-- (admin del bar). El QRScanner del cliente (mesa anónima) llama a
-- getTransactionByQrCode() con un SELECT directo, que RLS bloquea
-- silenciosamente (.single() retorna error -> "QR inválido o ya utilizado").
--
-- Se agrega una RPC SECURITY DEFINER que expone solo transacciones
-- 'recharge' pendientes por su qr_code (equivalente a un token de un solo uso).

CREATE OR REPLACE FUNCTION get_recharge_transaction_by_qr(p_qr_code TEXT)
RETURNS credits_transactions
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT *
    FROM credits_transactions
   WHERE qr_code = upper(trim(p_qr_code))
     AND type = 'recharge'
     AND status = 'pending'
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_recharge_transaction_by_qr TO anon, authenticated;
