-- ============================================================
-- 007 — RPCs DE COLA: puja acumulativa, reordenar, eliminar
-- ============================================================

-- ── RPC: puja acumulativa en canción ya encolada ──────────────────────────────
-- Suma p_amount a la puja existente de la canción. Descuenta créditos de la mesa.
-- Solo funciona sobre canciones en estado 'queued'.

CREATE OR REPLACE FUNCTION bid_on_song(
  p_queue_id  UUID,
  p_bar_id    UUID,
  p_table_id  UUID,
  p_amount    INT
)
RETURNS queue
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_item  queue%ROWTYPE;
  v_table tables%ROWTYPE;
BEGIN
  -- Verificar que la canción existe y está en cola
  SELECT * INTO v_item
    FROM queue
   WHERE id = p_queue_id AND bar_id = p_bar_id AND status = 'queued';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canción no encontrada en la cola';
  END IF;

  -- Verificar mesa activa y no baneada
  SELECT * INTO v_table
    FROM tables
   WHERE id = p_table_id AND bar_id = p_bar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa no encontrada';
  END IF;
  IF v_table.is_banned THEN
    RAISE EXCEPTION 'Mesa bloqueada';
  END IF;
  IF NOT v_table.is_active THEN
    RAISE EXCEPTION 'Mesa inactiva';
  END IF;

  -- Verificar créditos
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la puja debe ser positivo';
  END IF;
  IF v_table.credits < p_amount THEN
    RAISE EXCEPTION 'Créditos insuficientes. Tienes % créditos', v_table.credits;
  END IF;

  -- Descontar créditos
  UPDATE tables
     SET credits = credits - p_amount
   WHERE id = p_table_id;

  INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference)
  VALUES (p_bar_id, p_table_id, -p_amount, 'bid',
          'Puja adicional: ' || v_item.title);

  -- Actualizar puja acumulativa
  UPDATE queue
     SET bid_amount = bid_amount + p_amount
   WHERE id = p_queue_id
  RETURNING * INTO v_item;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id,
          'Mesa ' || (SELECT label FROM tables WHERE id = p_table_id),
          'song_bid',
          v_item.title || ' — puja acumulada: ' || v_item.bid_amount);

  RETURN v_item;
END;
$$;

GRANT EXECUTE ON FUNCTION bid_on_song TO anon, authenticated;

-- ── RPC: reordenar cola (solo admin, solo canciones sin puja) ─────────────────
-- Recibe un array de {id, position} y actualiza las posiciones.
-- Rechaza si alguna canción tiene bid_amount > 0.

CREATE OR REPLACE FUNCTION reorder_queue(
  p_bar_id UUID,
  p_items  JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_item     JSONB;
  v_queue_id UUID;
  v_position INT;
  v_bid      INT;
BEGIN
  -- Iterar cada elemento del array
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_queue_id := (v_item->>'id')::UUID;
    v_position := (v_item->>'position')::INT;

    -- Verificar que no tenga puja
    SELECT bid_amount INTO v_bid
      FROM queue
     WHERE id = v_queue_id AND bar_id = p_bar_id AND status = 'queued';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Canción % no encontrada en la cola', v_queue_id;
    END IF;

    IF v_bid > 0 THEN
      RAISE EXCEPTION 'Canción bloqueada por puja';
    END IF;

    UPDATE queue
       SET "position" = v_position
     WHERE id = v_queue_id AND bar_id = p_bar_id;
  END LOOP;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'queue_reordered',
          'Reordenadas ' || jsonb_array_length(p_items) || ' canciones');
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_queue TO authenticated;

-- ── RPC: eliminar canción de la cola (admin, con refund de puja) ──────────────

CREATE OR REPLACE FUNCTION remove_from_queue(
  p_queue_id UUID,
  p_bar_id   UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_item queue%ROWTYPE;
BEGIN
  SELECT * INTO v_item
    FROM queue
   WHERE id = p_queue_id AND bar_id = p_bar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canción no encontrada en la cola';
  END IF;

  IF v_item.status NOT IN ('queued', 'playing') THEN
    RAISE EXCEPTION 'Solo se pueden eliminar canciones en cola o reproduciendo';
  END IF;

  -- Devolver créditos si había puja
  IF v_item.bid_amount > 0 AND v_item.table_id IS NOT NULL THEN
    UPDATE tables
       SET credits = credits + v_item.bid_amount
     WHERE id = v_item.table_id;

    INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference)
    VALUES (p_bar_id, v_item.table_id, v_item.bid_amount, 'refund',
            'Refund eliminación: ' || v_item.title);
  END IF;

  DELETE FROM queue WHERE id = p_queue_id;

  INSERT INTO activity_log (bar_id, actor, action, detail)
  VALUES (p_bar_id, 'Admin', 'song_removed',
          v_item.title || ' — ' || v_item.artist);
END;
$$;

GRANT EXECUTE ON FUNCTION remove_from_queue TO authenticated;
