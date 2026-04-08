import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

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

/** Actualizar datos del mesero. */
export async function updateWaiter(
  waiterId: string,
  data: Partial<{ name: string; phone: string; shift: string }>,
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
