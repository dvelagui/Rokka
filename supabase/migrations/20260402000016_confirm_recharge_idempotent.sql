-- ============================================================
-- 016 — Fix: confirm_recharge_qr falla si ya fue confirmada
-- ============================================================
-- Dos flujos llaman a confirm_recharge_qr para la misma transacción:
--   (A) el cliente escanea el QR desde su celular y confirma, y
--   (B) el admin pulsa "Confirmar Recarga" en RechargeModal tras
--       verificar el pago.
-- Si (A) ocurre primero, la transacción queda 'completed' y la
-- segunda llamada (B) fallaba con "Transacción no encontrada o ya
-- procesada" (400), aunque la recarga ya se haya acreditado bien.
--
-- Se hace la función idempotente: si la transacción ya está
-- 'completed' con el mismo qr_code, retorna el saldo actual sin
-- volver a acreditar ni duplicar el log.

CREATE OR REPLACE FUNCTION confirm_recharge_qr(
  p_transaction_id UUID,
  p_scanned_code   TEXT
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx     credits_transactions%ROWTYPE;
  v_balance INT;
BEGIN
  SELECT * INTO v_tx
    FROM credits_transactions
   WHERE id = p_transaction_id
     AND type = 'recharge';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada';
  END IF;

  -- Validar código QR
  IF v_tx.qr_code <> upper(trim(p_scanned_code)) THEN
    RAISE EXCEPTION 'Código QR inválido';
  END IF;

  -- Idempotente: si ya se confirmó, retornar el saldo actual sin reacreditar
  IF v_tx.status = 'completed' THEN
    SELECT credits INTO v_balance FROM tables WHERE id = v_tx.table_id;
    RETURN v_balance;
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Transacción cancelada';
  END IF;

  -- Acreditar créditos
  UPDATE tables
     SET credits = credits + v_tx.amount
   WHERE id = v_tx.table_id
  RETURNING credits INTO v_balance;

  -- Marcar transacción como completada
  UPDATE credits_transactions
     SET status = 'completed'
   WHERE id = p_transaction_id;

  -- Log
  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (
    v_tx.bar_id,
    COALESCE(v_tx.verified_by, 'Sistema'),
    'credits_recharged',
    'Recarga QR confirmada: +' || v_tx.amount || ' créditos (tx: ' || p_transaction_id || ')'
  );

  RETURN v_balance;
END;
$$;
