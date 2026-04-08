import { getSupabaseBrowserClient } from '../client'
import type { AdRow } from '../realtime/types'

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Anuncios del bar ordenados por sort_order.
 * `activeOnly = true` → solo activos (para TV/cliente).
 * `activeOnly = false` → todos (para admin).
 */
export async function getAds(barId: string, activeOnly = true): Promise<AdRow[]> {
  const supabase = getSupabaseBrowserClient()
  let query = supabase
    .from('ads')
    .select('*')
    .eq('bar_id', barId)
    .order('sort_order', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AdRow[]
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
      is_active:        true,
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
