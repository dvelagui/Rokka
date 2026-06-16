import { searchSongs, type YoutubeSongResult } from '@rokka/supabase'
import type { Tables } from '@rokka/shared'
import { createSupabaseServiceClient } from './supabase-server'

// ── Caché de búsquedas de YouTube ─────────────────────────────────────────────
// Reutiliza resultados de búsquedas recientes (24h) guardados en la tabla
// `youtube_cache` para no consumir cuota de la YouTube Data API en búsquedas
// repetidas. Solo se usa desde rutas de servidor (service_role).

const CACHE_TTL_HOURS = 24

/** Normaliza un query para que sea la clave de caché: trim, lowercase, espacios únicos. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Busca canciones reutilizando el caché de Supabase cuando es posible.
 * Si Supabase falla por cualquier motivo, cae directo a YouTube para no
 * romper la búsqueda del usuario.
 */
export async function searchWithCache(
  query: string,
  maxResults = 10,
): Promise<YoutubeSongResult[]> {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  try {
    const supabase = createSupabaseServiceClient()
    const sinceIso = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    const { data: cached, error: selectError } = await supabase
      .from('youtube_cache')
      .select('id, results, hit_count')
      .eq('query', normalized)
      .gt('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!selectError && cached) {
      const row = cached as Pick<Tables<'youtube_cache'>, 'id' | 'results' | 'hit_count'>

      // Cache hit: no se llama a YouTube. Se registra el hit en segundo plano.
      void supabase
        .from('youtube_cache')
        .update({ hit_count: row.hit_count + 1, last_hit_at: new Date().toISOString() })
        .eq('id', row.id)

      return (row.results as unknown as YoutubeSongResult[]).slice(0, maxResults)
    }

    // Cache miss: buscar en YouTube y guardar el resultado para la próxima vez.
    const results = await searchSongs(normalized, maxResults)

    void supabase.from('youtube_cache').insert({ query: normalized, results })

    return results
  } catch {
    return searchSongs(normalized, maxResults)
  }
}

export interface YoutubeCacheStats {
  total_cached: number
  hits_today: number
}

/** Estadísticas del caché, útiles para monitoreo en el panel admin. */
export async function getCacheStats(): Promise<YoutubeCacheStats> {
  const supabase = createSupabaseServiceClient()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [{ count: total_cached }, { data: hitsToday }] = await Promise.all([
    supabase.from('youtube_cache').select('*', { count: 'exact', head: true }),
    supabase
      .from('youtube_cache')
      .select('hit_count')
      .gte('last_hit_at', startOfDay.toISOString()),
  ])

  const hits_today = (hitsToday ?? []).reduce(
    (sum, row) => sum + (row as Pick<Tables<'youtube_cache'>, 'hit_count'>).hit_count,
    0,
  )

  return { total_cached: total_cached ?? 0, hits_today }
}
