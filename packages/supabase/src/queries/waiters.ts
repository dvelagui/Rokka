import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WaiterMovement {
  id: string
  type: 'order' | 'recharge'
  table_id: string
  amount: number
  detail: string
  status: string
  created_at: string
}

export interface Waiter {
  id: string
  bar_id: string
  name: string
  phone: string | null
  pin: string
  shift: string
  is_active: boolean
  created_at: string
}

export type WaiterPublic = Omit<Waiter, 'pin'>

// ── Queries ───────────────────────────────────────────────────────────────────

/** Todos los meseros del bar (sin PIN para lectura normal). */
export async function getWaiters(barId: string): Promise<WaiterPublic[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('waiters')
    .select('id, bar_id, name, phone, shift, is_active, created_at')
    .eq('bar_id', barId)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as WaiterPublic[]
}

/** Crear mesero con validación de PIN único (4 dígitos) dentro del bar. */
export async function createWaiter(
  barId: string,
  data: { name: string; pin: string; phone?: string; shift?: string },
): Promise<WaiterPublic> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase.rpc('create_waiter_rpc', {
    p_bar_id: barId,
    p_name:   data.name,
    p_pin:    data.pin,
    p_phone:  data.phone ?? null,
    p_shift:  data.shift ?? 'full',
  })
  if (error) throw new Error(error.message)
  const { pin: _pin, ...pub } = row as Waiter
  return pub as WaiterPublic
}

/** Actualizar datos del mesero (pin opcional). */
export async function updateWaiter(
  waiterId: string,
  data: Partial<{ name: string; phone: string; shift: string; pin: string }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('waiters')
    .update(data)
    .eq('id', waiterId)
  if (error) throw new Error(error.message)
}

/** Activar o desactivar mesero. Retorna nuevo estado. */
export async function toggleWaiterActive(waiterId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data: current, error: fetchErr } = await supabase
    .from('waiters')
    .select('is_active')
    .eq('id', waiterId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const newValue = !(current as { is_active: boolean }).is_active
  const { error } = await supabase
    .from('waiters')
    .update({ is_active: newValue })
    .eq('id', waiterId)
  if (error) throw new Error(error.message)
  return newValue
}

/** Eliminar mesero. */
export async function deleteWaiter(barId: string, waiterId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('waiters')
    .delete()
    .eq('id', waiterId)
    .eq('bar_id', barId)
  if (error) throw new Error(error.message)
}

/**
 * Autenticar mesero por PIN (para confirmar recargas, etc.).
 * Retorna los datos del mesero sin PIN, o null si el PIN no es válido.
 */
export async function authenticateWaiter(
  barId: string,
  pin: string,
): Promise<WaiterPublic | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('authenticate_waiter', {
    p_bar_id: barId,
    p_pin:    pin,
  })
  if (error) throw new Error(error.message)
  const rows = data as WaiterPublic[] | null
  return (rows && rows.length > 0) ? rows[0] : null
}

/**
 * Movimientos de un mesero: cruza órdenes (waiter_id) + recargas (verified_by).
 * Retorna lista unificada ordenada por fecha desc.
 */
export async function getWaiterMovements(
  barId: string,
  waiterId: string,
  limit = 60,
): Promise<WaiterMovement[]> {
  const supabase = getSupabaseBrowserClient()

  const [ordersRes, txRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, table_id, items, total, status, created_at')
      .eq('bar_id', barId)
      .eq('waiter_id', waiterId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('credits_transactions')
      .select('id, table_id, amount, type, status, created_at')
      .eq('bar_id', barId)
      .eq('verified_by', waiterId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const movements: WaiterMovement[] = []

  for (const o of ordersRes.data ?? []) {
    const items = (o.items as { name: string; qty: number }[]) ?? []
    const detail = items
      .slice(0, 2)
      .map((i) => `${i.qty}× ${i.name}`)
      .join(', ') + (items.length > 2 ? ' …' : '')
    movements.push({
      id:         o.id,
      type:       'order',
      table_id:   o.table_id,
      amount:     o.total as number,
      detail,
      status:     o.status as string,
      created_at: o.created_at as string,
    })
  }

  for (const tx of txRes.data ?? []) {
    movements.push({
      id:         tx.id,
      type:       'recharge',
      table_id:   tx.table_id,
      amount:     tx.amount as number,
      detail:     'Recarga QR',
      status:     tx.status as string,
      created_at: tx.created_at as string,
    })
  }

  return movements.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
