import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'

export interface OrderItemRow {
  item_id: string
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  bar_id: string
  table_id: string
  items: OrderItemRow[]
  total: number
  status: OrderStatus
  waiter_id: string | null
  created_at: string
  updated_at: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Crear orden con validación de precios en el servidor.
 * El total y los nombres de ítem son calculados en la DB.
 */
export async function createOrder(
  barId: string,
  token: string,
  items: { itemId: string; qty: number }[],
): Promise<Order> {
  if (items.length === 0) throw new Error('El pedido debe tener al menos un ítem')

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('create_order_validated', {
    p_bar_id: barId,
    p_token:  token,
    p_items:  items.map((i) => ({ item_id: i.itemId, qty: i.qty })),
  })
  if (error) throw new Error(error.message)
  return data as Order
}

/**
 * Admin: todas las órdenes del bar, opcionalmente filtradas por estado.
 */
export async function getOrders(barId: string, status?: OrderStatus): Promise<Order[]> {
  const supabase = getSupabaseBrowserClient()
  let query = supabase
    .from('orders')
    .select('*')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Order[]
}

/** Órdenes de una mesa específica. */
export async function getTableOrders(tableId: string): Promise<Order[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('table_id', tableId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Order[]
}

/**
 * Cambiar estado de una orden.
 * Flujo permitido: pending → confirmed → preparing → delivered
 *                  pending|confirmed → cancelled
 */
export async function updateOrderStatus(
  orderId: string,
  barId: string,
  newStatus: OrderStatus,
  waiterId?: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()

  const update: Partial<Order & { updated_at: string }> = { status: newStatus }
  if (waiterId) update.waiter_id = waiterId

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .eq('bar_id', barId)

  if (error) throw new Error(error.message)

  // Log
  await supabase.from('activity_log').insert({
    bar_id: barId,
    actor:  waiterId ? `Mesero ${waiterId}` : 'Admin',
    action: 'order_status_updated',
    detail: `Orden ${orderId} → ${newStatus}`,
  })
}
