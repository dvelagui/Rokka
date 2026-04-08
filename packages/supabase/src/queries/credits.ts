import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransactionType = 'recharge' | 'bid' | 'refund' | 'reward'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled'

export interface CreditTransaction {
  id: string
  bar_id: string
  table_id: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  reference: string | null
  qr_code: string | null
  verified_by: string | null
  created_at: string
}

export interface InitiateRechargeResult {
  qrCode: string
  transactionId: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Créditos actuales de una mesa. */
export async function getTableCredits(tableId: string): Promise<number> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('tables')
    .select('credits')
    .eq('id', tableId)
    .single()
  if (error) throw new Error(error.message)
  return (data as { credits: number }).credits
}

/**
 * Historial de transacciones.
 * - `tableId` definido → transacciones de esa mesa
 * - Sin `tableId` → todas las del bar (para admin)
 */
export async function getTransactionHistory(
  barId: string,
  tableId?: string,
  limit = 20,
): Promise<CreditTransaction[]> {
  const supabase = getSupabaseBrowserClient()
  let query = supabase
    .from('credits_transactions')
    .select('*')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tableId) query = query.eq('table_id', tableId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as CreditTransaction[]
}

/**
 * Admin: inicia recarga QR. Los créditos NO se suman aún.
 * Retorna el código QR y el id de la transacción pendiente.
 */
export async function initiateRecharge(
  barId: string,
  tableId: string,
  amount: number,
  waiterId?: string,
): Promise<InitiateRechargeResult> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('initiate_recharge_qr', {
    p_bar_id:    barId,
    p_table_id:  tableId,
    p_amount:    amount,
    p_waiter_id: waiterId ?? null,
  })
  if (error) throw new Error(error.message)
  const result = data as { qr_code: string; transaction_id: string }
  return { qrCode: result.qr_code, transactionId: result.transaction_id }
}

/**
 * Cliente: confirma la recarga escaneando el QR.
 * Valida el código, suma créditos y retorna el nuevo saldo.
 */
export async function confirmRecharge(
  transactionId: string,
  scannedQrCode: string,
): Promise<number> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('confirm_recharge_qr', {
    p_transaction_id: transactionId,
    p_scanned_code:   scannedQrCode,
  })
  if (error) throw new Error(error.message)
  return data as number
}

/**
 * Interno: descuenta créditos de una mesa (usado por pujas).
 * Verifica saldo suficiente antes de descontar.
 * Retorna el nuevo saldo.
 */
export async function deductCredits(
  tableId: string,
  barId: string,
  amount: number,
  reference?: string,
): Promise<number> {
  const supabase = getSupabaseBrowserClient()

  // Verificar saldo
  const current = await getTableCredits(tableId)
  if (current < amount) {
    throw new Error(`Créditos insuficientes. Tienes ${current} créditos`)
  }

  const { data, error } = await supabase
    .from('tables')
    .update({ credits: current - amount })
    .eq('id', tableId)
    .select('credits')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('credits_transactions').insert({
    bar_id:    barId,
    table_id:  tableId,
    amount:    -amount,
    type:      'bid',
    status:    'completed',
    reference: reference ?? null,
  })

  return (data as { credits: number }).credits
}

/**
 * Interno: devuelve créditos a una mesa (usado cuando se salta canción con puja).
 * Retorna el nuevo saldo.
 */
export async function refundCredits(
  tableId: string,
  barId: string,
  amount: number,
  reference?: string,
): Promise<number> {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.rpc('recharge_credits', {
    p_bar_id:      barId,
    p_table_id:    tableId,
    p_amount:      amount,
    p_reference:   reference ?? null,
    p_qr_code:     null,
    p_verified_by: 'Sistema (refund)',
  })

  if (error) throw new Error(error.message)
  return data as number
}
