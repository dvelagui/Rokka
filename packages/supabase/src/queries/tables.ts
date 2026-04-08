import { getSupabaseBrowserClient } from '../client'
import type { TableRow } from '../realtime/types'

// ── Queries ───────────────────────────────────────────────────────────────────

/** Todas las mesas del bar con estado actual. */
export async function getTables(barId: string): Promise<TableRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('bar_id', barId)
    .order('number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as TableRow[]
}

/** Crear mesa. Label por defecto: "Mesa {number}". */
export async function createTable(
  barId: string,
  data: { number: number; label?: string; maxOccupants?: number },
): Promise<TableRow> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase
    .from('tables')
    .insert({
      bar_id:        barId,
      number:        data.number,
      label:         data.label ?? `Mesa ${data.number}`,
      max_occupants: data.maxOccupants ?? 4,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as TableRow
}

/** Actualizar datos de la mesa. */
export async function updateTable(
  tableId: string,
  data: Partial<{ number: number; label: string; max_occupants: number }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('tables')
    .update(data)
    .eq('id', tableId)
  if (error) throw new Error(error.message)
}

/** Alternar is_active. Al desactivar, invalida el token. Retorna nuevo estado. */
export async function toggleTableActive(barId: string, tableId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('toggle_table_active_rpc', {
    p_bar_id:   barId,
    p_table_id: tableId,
  })
  if (error) throw new Error(error.message)
  return data as boolean
}

/** Banear mesa: invalida sesión, inserta mensaje sistema, registra log. */
export async function banTable(
  barId: string,
  tableId: string,
  reason?: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('ban_table_rpc', {
    p_bar_id:   barId,
    p_table_id: tableId,
    p_reason:   reason ?? null,
  })
  if (error) throw new Error(error.message)
}

/** Desbanear mesa. */
export async function unbanTable(barId: string, tableId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('unban_table_rpc', {
    p_bar_id:   barId,
    p_table_id: tableId,
  })
  if (error) throw new Error(error.message)
}

/**
 * Eliminar mesa. Lanza error si tiene órdenes activas.
 * Las órdenes activas son: pending, confirmed, preparing.
 */
export async function deleteTable(barId: string, tableId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()

  // Verificar órdenes activas
  const { count, error: countErr } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('table_id', tableId)
    .in('status', ['pending', 'confirmed', 'preparing'])

  if (countErr) throw new Error(countErr.message)
  if ((count ?? 0) > 0) {
    throw new Error('No se puede eliminar una mesa con órdenes activas')
  }

  const { error } = await supabase.from('tables').delete().eq('id', tableId).eq('bar_id', barId)
  if (error) throw new Error(error.message)

  await supabase.from('activity_log').insert({
    bar_id: barId,
    actor:  'Admin',
    action: 'table_deleted',
    detail: `Mesa ${tableId} eliminada`,
  })
}

/**
 * Genera nuevo QR para la mesa.
 * Retorna la URL completa para imprimir/mostrar.
 * `appUrl` por defecto lee `NEXT_PUBLIC_CLIENT_URL` o cae a localhost.
 */
export async function generateTableQR(
  barId: string,
  tableId: string,
  appUrl?: string,
): Promise<{ token: string; url: string }> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('refresh_table_session', {
    p_bar_id:   barId,
    p_table_id: tableId,
  })
  if (error) throw new Error(error.message)

  const token = data as string
  const base =
    appUrl ??
    (typeof window !== 'undefined'
      ? (window as Window & { NEXT_PUBLIC_CLIENT_URL?: string }).NEXT_PUBLIC_CLIENT_URL
      : undefined) ??
    'http://localhost:3000'

  return { token, url: `${base}/join?token=${token}` }
}

/**
 * Mesa llama al mesero via broadcast (no persiste en DB).
 * El admin recibe la notificación en su panel.
 */
export async function callWaiter(
  barId: string,
  tableId: string,
  tableLabel: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase.channel(`bar:${barId}:broadcast`)
  // Subscribe briefly, send, then remove
  await new Promise<void>((resolve) => {
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type:    'broadcast',
            event:   'table_call',
            payload: { tableId, tableLabel },
          })
          resolve()
        }
      })
  })
  // Fire-and-forget cleanup after a short delay to ensure message is sent
  setTimeout(() => { void supabase.removeChannel(channel) }, 500)
}
