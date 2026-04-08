// ── Types ─────────────────────────────────────────────────────────────────────

export interface YoutubeSongResult {
  videoId: string
  title: string
  /** Canal de YouTube (artista aproximado) */
  artist: string
  thumbnail: string
  /** Duración en segundos (solo disponible via getVideoDetails) */
  duration?: number
}

export interface YoutubeVideoDetails extends YoutubeSongResult {
  duration: number
}

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

const searchCache = new Map<string, CacheEntry<YoutubeSongResult[]>>()
const videoCache  = new Map<string, CacheEntry<YoutubeVideoDetails>>()

function getApiKey(): string {
  const key =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_YOUTUBE_API_KEY) ?? ''
  if (!key) {
    throw new Error(
      'YouTube API key no configurada. Agrega NEXT_PUBLIC_YOUTUBE_API_KEY al .env.local',
    )
  }
  return key
}

// ── ISO 8601 duration → seconds ───────────────────────────────────────────────

function parseDuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) +
         (parseInt(m[2] ?? '0') * 60)   +
          parseInt(m[3] ?? '0')
}

// ── Clean YouTube auto-generated title ───────────────────────────────────────

function cleanTitle(raw: string): string {
  // Remove common suffixes: "(Official Video)", "[HQ]", "(Lyrics)", etc.
  return raw
    .replace(/\s*[\[(](?:official\s*(?:video|music\s*video|audio|lyric)|lyrics?|hq|hd|4k|remaster|live)[^\])\n]*[\])]/gi, '')
    .replace(/\s*-\s*(?:official\s*(?:video|audio|music\s*video)|lyrics?|remaster(?:ed)?)\s*$/gi, '')
    .trim()
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Busca canciones en YouTube Music.
 * Resultados cacheados en memoria por 5 minutos.
 */
export async function searchSongs(
  query: string,
  maxResults = 10,
): Promise<YoutubeSongResult[]> {
  if (!query.trim()) return []

  const cacheKey = `${query}:${maxResults}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const key = getApiKey()
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoCategoryId', '10') // Music
  url.searchParams.set('q', query)
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set('key', key)

  const res = await fetch(url.toString())
  const json = await res.json() as {
    error?: { code: number; errors?: { reason: string }[] }
    items?: {
      id: { videoId: string }
      snippet: {
        title: string
        channelTitle: string
        thumbnails: { medium?: { url: string }; default?: { url: string } }
      }
    }[]
  }

  if (json.error) {
    const isQuotaError = json.error.errors?.some((e) => e.reason === 'quotaExceeded')
    throw new Error(
      isQuotaError
        ? 'Cuota de búsqueda de YouTube agotada por hoy. Inténtalo mañana o usa el modo manual.'
        : `Error de YouTube: ${json.error.code}`,
    )
  }

  const results: YoutubeSongResult[] = (json.items ?? []).map((item) => ({
    videoId:   item.id.videoId,
    title:     cleanTitle(item.snippet.title),
    artist:    item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
  }))

  searchCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS })
  return results
}

/**
 * Obtiene detalles de un video: título, artista, duración exacta.
 * Resultado cacheado en memoria por 5 minutos.
 */
export async function getVideoDetails(videoId: string): Promise<YoutubeVideoDetails> {
  const cached = videoCache.get(videoId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const key = getApiKey()
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', key)

  const res = await fetch(url.toString())
  const json = await res.json() as {
    error?: { code: number }
    items?: {
      snippet: {
        title: string
        channelTitle: string
        thumbnails: { medium?: { url: string }; default?: { url: string } }
      }
      contentDetails: { duration: string }
    }[]
  }

  if (json.error) throw new Error(`Error de YouTube: ${json.error.code}`)
  if (!json.items?.length) throw new Error(`Video ${videoId} no encontrado`)

  const item = json.items[0]
  const details: YoutubeVideoDetails = {
    videoId,
    title:     cleanTitle(item.snippet.title),
    artist:    item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
    duration:  parseDuration(item.contentDetails.duration),
  }

  videoCache.set(videoId, { data: details, expiresAt: Date.now() + CACHE_TTL_MS })
  return details
}

/** Limpia el caché manualmente (útil en tests). */
export function clearYoutubeCache(): void {
  searchCache.clear()
  videoCache.clear()
}
