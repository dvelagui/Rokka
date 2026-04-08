/**
 * Funciones RPC de alto nivel para las apps.
 * Todas van a través de RPCs SECURITY DEFINER y no requieren
 * policies directas de escritura en las tablas.
 */
import { getSupabaseBrowserClient } from './client'

// ── Cola ──────────────────────────────────────────────────────────────────────

export interface QueueItemWithVotes {
  id: string
  title: string
  artist: string
  youtube_video_id: string | null
  thumbnail_url: string | null
  table_id: string | null
  table_label: string | null
  bid_amount: number
  position: number
  dedication: string | null
  status: 'queued' | 'playing' | 'played' | 'skipped'
  added_at: string
  skip_votes: number
  keep_votes: number
}

/** Obtener la cola activa (queued + playing) con conteo de votos. */
export async function getActiveQueue(barId: string): Promise<QueueItemWithVotes[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_active_queue', { p_bar_id: barId })
  if (error) throw new Error(error.message)
  return (data ?? []) as QueueItemWithVotes[]
}

/** Pedir canción (con puja opcional). */
export async function requestSong(params: {
  barId: string
  tableId: string
  title: string
  artist: string
  youtubeVideoId?: string
  thumbnailUrl?: string
  bidAmount?: number
  dedication?: string
}) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('request_song', {
    p_bar_id:           params.barId,
    p_table_id:         params.tableId,
    p_title:            params.title,
    p_artist:           params.artist,
    p_youtube_video_id: params.youtubeVideoId ?? null,
    p_thumbnail_url:    params.thumbnailUrl ?? null,
    p_bid_amount:       params.bidAmount ?? 0,
    p_dedication:       params.dedication ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

/** Votar en una canción. */
export async function voteOnSong(
  queueId: string,
  tableId: string,
  voteType: 'skip' | 'keep',
) {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('vote_on_song', {
    p_queue_id:  queueId,
    p_table_id:  tableId,
    p_vote_type: voteType,
  })
  if (error) throw new Error(error.message)
}

// ── Admin: cola ───────────────────────────────────────────────────────────────

/** Admin: avanzar a la siguiente canción. */
export async function playNextSong(barId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('play_next_song', { p_bar_id: barId })
  if (error) throw new Error(error.message)
  return data
}

/** Admin: skipear canción (con posible refund de créditos). */
export async function skipSong(queueId: string, barId: string) {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('skip_song', {
    p_queue_id: queueId,
    p_bar_id:   barId,
  })
  if (error) throw new Error(error.message)
}

// ── Admin: créditos ───────────────────────────────────────────────────────────

/** Admin: recargar créditos a una mesa. */
export async function rechargeCredits(params: {
  barId: string
  tableId: string
  amount: number
  reference?: string
  qrCode?: string
  verifiedBy?: string
}) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('recharge_credits', {
    p_bar_id:      params.barId,
    p_table_id:    params.tableId,
    p_amount:      params.amount,
    p_reference:   params.reference ?? null,
    p_qr_code:     params.qrCode ?? null,
    p_verified_by: params.verifiedBy ?? null,
  })
  if (error) throw new Error(error.message)
  return data as number // nuevo saldo
}

// ── Mesa: chat ────────────────────────────────────────────────────────────────

/** Mesa: enviar mensaje de chat (valida token en el servidor). */
export async function sendChatMessage(params: {
  barId: string
  token: string
  message: string
  messageType?: 'msg' | 'reaction'
}) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_bar_id:      params.barId,
    p_token:       params.token,
    p_message:     params.message,
    p_message_type: params.messageType ?? 'msg',
  })
  if (error) throw new Error(error.message)
  return data
}

// ── Mesa: pedidos ─────────────────────────────────────────────────────────────

export interface OrderItem {
  item_id: string
  name: string
  qty: number
  price: number
}

/** Mesa: realizar pedido (valida token en el servidor). */
export async function placeOrder(params: {
  barId: string
  token: string
  items: OrderItem[]
  total: number
}) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('place_order', {
    p_bar_id: params.barId,
    p_token:  params.token,
    p_items:  params.items,
    p_total:  params.total,
  })
  if (error) throw new Error(error.message)
  return data
}

/** Mesa: obtener historial de pedidos (valida token en el servidor). */
export async function getOrdersForTable(barId: string, token: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_orders_for_table', {
    p_bar_id: barId,
    p_token:  token,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Mesa: obtener historial de créditos. */
export async function getCreditsHistory(barId: string, token: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_credits_history_for_table', {
    p_bar_id: barId,
    p_token:  token,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}

// ── Cola: pujas y administración ──────────────────────────────────────────────

/** Mesa: puja acumulativa sobre una canción ya encolada. */
export async function bidOnSong(params: {
  queueId: string
  barId: string
  tableId: string
  amount: number
}): Promise<QueueItemWithVotes> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('bid_on_song', {
    p_queue_id: params.queueId,
    p_bar_id:   params.barId,
    p_table_id: params.tableId,
    p_amount:   params.amount,
  })
  if (error) throw new Error(error.message)
  return data as QueueItemWithVotes
}

/** Admin: reordenar canciones sin puja en la cola. */
export async function reorderQueue(
  barId: string,
  items: { id: string; position: number }[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('reorder_queue', {
    p_bar_id: barId,
    p_items:  items,
  })
  if (error) throw new Error(error.message)
}

/** Admin: eliminar canción de la cola (con refund de puja si aplica). */
export async function removeFromQueue(queueId: string, barId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('remove_from_queue', {
    p_queue_id: queueId,
    p_bar_id:   barId,
  })
  if (error) throw new Error(error.message)
}

// ── Varios ────────────────────────────────────────────────────────────────────

/** Verificar si una canción está bloqueada antes de pedirla. */
export async function isSongBlocked(
  barId: string,
  title: string,
  artist: string,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.rpc('is_song_blocked', {
    p_bar_id: barId,
    p_title:  title,
    p_artist: artist,
  })
  return !!data
}

/** Obtener info pública del bar (sin tv_pin). */
export async function getBarPublicInfo(barId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_bar_public_info', { p_bar_id: barId })
  if (error) throw new Error(error.message)
  return (data as unknown[])?.[0] ?? null
}
