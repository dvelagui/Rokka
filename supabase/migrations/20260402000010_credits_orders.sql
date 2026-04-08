-- ============================================================
-- 010 — Créditos QR y órdenes validadas
-- ============================================================

-- ── Agregar estado a credits_transactions ─────────────────────────────────────
-- 'completed' es el valor por defecto para compatibilidad con filas existentes

ALTER TABLE credits_transactions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
  CHECK (status IN ('pending', 'completed', 'cancelled'));

-- ── RPC: iniciar recarga con código QR ────────────────────────────────────────
-- El admin/mesero genera la recarga; los créditos NO se suman aún.
-- Retorna {qr_code, transaction_id}

CREATE OR REPLACE FUNCTION initiate_recharge_qr(
  p_bar_id    UUID,
  p_table_id  UUID,
  p_amount    INT,
  p_waiter_id TEXT DEFAULT NULL   -- nombre/id del mesero (opcional)
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_code TEXT;
  v_tx_id   UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser positivo';
  END IF;

  -- Verificar que la mesa pertenece al bar
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id AND bar_id = p_bar_id) THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;

  -- Generar código QR único: "RC" + 6 chars mayúsculas/dígitos
  v_qr_code := 'RC' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));

  INSERT INTO credits_transactions (
    bar_id, table_id, amount, type, status, qr_code, verified_by
  )
  VALUES (
    p_bar_id, p_table_id, p_amount, 'recharge', 'pending', v_qr_code,
    COALESCE(p_waiter_id, 'Admin')
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'qr_code',        v_qr_code,
    'transaction_id', v_tx_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION initiate_recharge_qr TO authenticated;

-- ── RPC: confirmar recarga por código QR ──────────────────────────────────────
-- El cliente escanea el QR; se valida y se acreditan los créditos.
-- Retorna nuevo saldo de la mesa.

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
     AND type = 'recharge'
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada o ya procesada';
  END IF;

  -- Validar código QR
  IF v_tx.qr_code <> upper(trim(p_scanned_code)) THEN
    RAISE EXCEPTION 'Código QR inválido';
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

GRANT EXECUTE ON FUNCTION confirm_recharge_qr TO anon, authenticated;

-- ── RPC: crear pedido con validación de precios en servidor ───────────────────
-- p_items: JSONB array de [{item_id UUID, qty INT}]
-- Calcula total desde precios en DB (no confía en el cliente).
-- Retorna la orden creada.

CREATE OR REPLACE FUNCTION create_order_validated(
  p_bar_id UUID,
  p_token  TEXT,
  p_items  JSONB
)
RETURNS orders
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table    tables%ROWTYPE;
  v_order    orders%ROWTYPE;
  v_item     JSONB;
  v_item_id  UUID;
  v_qty      INT;
  v_price    INT;
  v_name     TEXT;
  v_total    INT := 0;
  v_items_out JSONB := '[]'::JSONB;
BEGIN
  -- Validar token de mesa
  SELECT * INTO v_table
    FROM tables
   WHERE bar_id = p_bar_id
     AND session_token = p_token
     AND is_active
     AND NOT is_banned;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión inválida o mesa baneada';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe tener al menos un ítem';
  END IF;

  -- Validar cada ítem y construir total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'item_id')::UUID;
    v_qty     := (v_item->>'qty')::INT;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para ítem %', v_item_id;
    END IF;

    SELECT price, name INTO v_price, v_name
      FROM menu_items
     WHERE id = v_item_id
       AND bar_id = p_bar_id
       AND is_available = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ítem % no disponible', v_item_id;
    END IF;

    v_total     := v_total + (v_price * v_qty);
    v_items_out := v_items_out || jsonb_build_array(
      jsonb_build_object(
        'item_id', v_item_id,
        'name',    v_name,
        'qty',     v_qty,
        'price',   v_price
      )
    );
  END LOOP;

  -- Insertar orden
  INSERT INTO orders (bar_id, table_id, items, total, status)
  VALUES (p_bar_id, v_table.id, v_items_out, v_total, 'pending')
  RETURNING * INTO v_order;

  -- Log
  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (
    p_bar_id,
    v_table.label,
    'order_placed',
    'Pedido $' || v_total || ' (' || jsonb_array_length(p_items) || ' ítems)'
  );

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_validated TO anon, authenticated;
