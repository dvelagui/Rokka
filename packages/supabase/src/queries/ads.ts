import { getSupabaseBrowserClient } from '../client'
import type { AdRow, AdImpressionReportRow, AdImpressionRow } from '../realtime/types'

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Anuncios del bar ordenados por sort_order.
 * `activeOnly = true` → solo activos y dentro de su programación (fecha/horario),
 *   vía RPC `get_active_ads` (también desactiva los que vencieron).
 * `activeOnly = false` → todos (para admin).
 */
export async function getAds(barId: string, activeOnly = true): Promise<AdRow[]> {
  const supabase = getSupabaseBrowserClient()

  if (activeOnly) {
    const { data, error } = await supabase.rpc('get_active_ads', { p_bar_id: barId })
    // Si la migración de programación de anuncios todavía no se aplicó, la RPC
    // `get_active_ads` no existe — usamos un filtro básico como respaldo para
    // que los anuncios sigan funcionando mientras se aplica la migración.
    if (error) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('ads')
        .select('*')
        .eq('bar_id', barId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (fallbackError) throw new Error(fallbackError.message)
      return (fallback ?? []) as AdRow[]
    }
    return (data ?? []) as AdRow[]
  }

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('bar_id', barId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdRow[]
}

/** Registra una visualización del anuncio (incrementa contador, puede desactivarlo si llega al límite). */
export async function recordAdImpression(adId: string, source: 'tv' | 'client'): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.rpc('record_ad_impression', { p_ad_id: adId, p_source: source })
  if (error) throw new Error(error.message)
}

/** Informe de impresiones por anuncio: total mostrado y última vez. */
export async function getAdImpressionsReport(barId: string): Promise<AdImpressionReportRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_ad_impressions_report', { p_bar_id: barId })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdImpressionReportRow[]
}

/** Historial de impresiones de un anuncio (más recientes primero). */
export async function getAdImpressionsHistory(adId: string, limit = 50): Promise<AdImpressionRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_ad_impressions_history', {
    p_ad_id: adId,
    p_limit: limit,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdImpressionRow[]
}

export async function createAd(
  barId: string,
  data: {
    emoji: string
    title: string
    subtitle?: string
    color?: string
    durationSeconds?: number
    isOwn?: boolean
    companyName?: string
    isActive?: boolean
    imageUrl?: string
    startDate?: string | null
    endDate?: string | null
    timeStart?: string | null
    timeEnd?: string | null
    maxImpressions?: number | null
  },
): Promise<AdRow> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase
    .from('ads')
    .insert({
      bar_id:           barId,
      emoji:            data.emoji,
      title:            data.title,
      subtitle:         data.subtitle ?? null,
      color:            data.color ?? '#00E5FF',
      duration_seconds: data.durationSeconds ?? 8,
      is_own:           data.isOwn ?? true,
      company_name:     data.companyName ?? null,
      is_active:        data.isActive ?? true,
      image_url:        data.imageUrl ?? null,
      start_date:       data.startDate ?? null,
      end_date:         data.endDate ?? null,
      time_start:       data.timeStart ?? null,
      time_end:         data.timeEnd ?? null,
      max_impressions:  data.maxImpressions ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as AdRow
}

export async function updateAd(
  adId: string,
  data: Partial<{
    emoji: string
    title: string
    subtitle: string
    color: string
    duration_seconds: number
    is_own: boolean
    company_name: string
    is_active: boolean
    image_url: string | null
    start_date: string | null
    end_date: string | null
    time_start: string | null
    time_end: string | null
    max_impressions: number | null
  }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('ads').update(data).eq('id', adId)
  if (error) throw new Error(error.message)
}

export async function deleteAd(adId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('ads').delete().eq('id', adId)
  if (error) throw new Error(error.message)
}

export async function toggleAdActive(adId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data: current, error: fetchErr } = await supabase
    .from('ads')
    .select('is_active')
    .eq('id', adId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const newValue = !(current as { is_active: boolean }).is_active
  const { error } = await supabase.from('ads').update({ is_active: newValue }).eq('id', adId)
  if (error) throw new Error(error.message)
  return newValue
}

/**
 * Reordena los anuncios asignando sort_order = posición en el array.
 * `adIds` debe contener todos los IDs del bar en el nuevo orden.
 */
export async function reorderAds(barId: string, adIds: string[]): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  // Batch updates using Promise.all
  await Promise.all(
    adIds.map((id, index) =>
      supabase
        .from('ads')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('bar_id', barId)
        .then(({ error }) => {
          if (error) throw new Error(error.message)
        }),
    ),
  )
}
