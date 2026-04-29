import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BarStatsSummary {
  /** Canciones reproducidas (status='played') en el rango */
  songs_played: number
  /** Suma de pujas de canciones reproducidas/saltadas */
  total_bids: number
  /** Créditos recargados (recargas completadas) */
  credits_sold: number
  /** Pico de mesas simultáneas (de bar_stats diarios) */
  peak_tables: number
  /** Mesas activas en este momento */
  active_tables_now: number
  /** Canción más pedida en el rango */
  top_song: { title: string; artist: string; times: number } | null
  /** Hora con más actividad, ej: "21:00" */
  peak_hour: string | null
}

export interface TopSong {
  title: string
  artist: string
  times_played: number
  avg_bid: number
  max_bid: number
}

export interface GlobalBarRanking {
  bar_id: string
  bar_name: string
  bar_emoji: string
  bar_slug: string
  total_songs: number
  total_bids: number
  table_count: number
}

export interface DateRange {
  from: Date
  to: Date
}

export interface DailyRevenue {
  date: string   // YYYY-MM-DD
  amount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayRange(): DateRange {
  const now = new Date()
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  return { from, to: now }
}

function weekRange(): DateRange {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - now.getDay())
  from.setHours(0, 0, 0, 0)
  return { from, to: now }
}

function monthRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from, to: now }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * KPIs del bar para un rango de fechas.
 * Por defecto retorna stats de hoy.
 */
export async function getBarStats(
  barId: string,
  dateRange?: DateRange,
): Promise<BarStatsSummary> {
  const range = dateRange ?? todayRange()
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_bar_stats_summary', {
    p_bar_id: barId,
    p_from:   range.from.toISOString(),
    p_to:     range.to.toISOString(),
  })
  if (error) throw new Error(error.message)
  return data as BarStatsSummary
}

/**
 * Conveniencia: stats por período predefinido.
 */
export async function getStatsByPeriod(
  barId: string,
  period: 'today' | 'week' | 'month',
): Promise<BarStatsSummary> {
  const range =
    period === 'today' ? todayRange() :
    period === 'week'  ? weekRange()  :
    monthRange()
  return getBarStats(barId, range)
}

/**
 * Guarda/actualiza las estadísticas del día actual en bar_stats.
 * Se puede llamar manualmente o al final del día.
 */
export async function recordDailyStats(barId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('record_daily_stats', { p_bar_id: barId })
  if (error) throw new Error(error.message)
}

/** Top N canciones más reproducidas del bar. */
export async function getTopSongs(barId: string, limit = 10): Promise<TopSong[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_top_songs', {
    p_bar_id: barId,
    p_limit:  limit,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as TopSong[]
}

/** Top N canciones más pedidas en todos los bares. */
export async function getGlobalTopSongs(limit = 10): Promise<TopSong[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_global_top_songs', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data ?? []) as TopSong[]
}

/** Ranking global de bares por total de pujas y canciones reproducidas. */
export async function getGlobalBarRanking(limit = 10): Promise<GlobalBarRanking[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_global_bar_ranking', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data ?? []) as GlobalBarRanking[]
}

/**
 * Ingresos diarios por recargas completadas para los últimos N días.
 * Días sin actividad se incluyen con amount = 0.
 */
export async function getDailyRevenue(barId: string, days = 14): Promise<DailyRevenue[]> {
  const supabase = getSupabaseBrowserClient()
  const from = new Date()
  from.setDate(from.getDate() - days + 1)
  from.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('credits_transactions')
    .select('created_at, amount')
    .eq('bar_id', barId)
    .eq('type', 'recharge')
    .eq('status', 'completed')
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const byDay = new Map<string, number>()
  for (const row of (data ?? []) as { created_at: string; amount: number }[]) {
    const date = row.created_at.slice(0, 10)
    byDay.set(date, (byDay.get(date) ?? 0) + row.amount)
  }

  const result: DailyRevenue[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    result.push({ date, amount: byDay.get(date) ?? 0 })
  }
  return result
}
