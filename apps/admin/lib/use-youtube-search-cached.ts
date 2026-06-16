'use client'

import { useState, useCallback, useRef } from 'react'
import type { YoutubeSongResult } from '@rokka/supabase'

const DEBOUNCE_MS = 1200
const MIN_QUERY_LEN = 3

export interface UseYouTubeSearchCachedReturn {
  results: YoutubeSongResult[]
  isSearching: boolean
  error: string | null
  search: (query: string) => void
  clear: () => void
}

/**
 * Igual que `useYouTubeSearch` de @rokka/supabase, pero busca a través de
 * /api/youtube-search (caché de Supabase de 24h) en vez de llamar a YouTube
 * directamente desde el navegador.
 */
export function useYouTubeSearchCached(maxResults = 10): UseYouTubeSearchCachedReturn {
  const [results, setResults] = useState<YoutubeSongResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)

      if (query.trim().length < MIN_QUERY_LEN) {
        setResults([])
        setError(null)
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setError(null)

      timerRef.current = setTimeout(async () => {
        try {
          const url = `/api/youtube-search?q=${encodeURIComponent(query.trim())}&max=${maxResults}`
          const res = await fetch(url)
          const json = (await res.json()) as { results?: YoutubeSongResult[]; error?: string }
          if (json.error) throw new Error(json.error)
          setResults(json.results ?? [])
        } catch (e) {
          setError((e as Error).message)
          setResults([])
        } finally {
          setIsSearching(false)
        }
      }, DEBOUNCE_MS)
    },
    [maxResults],
  )

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setResults([])
    setError(null)
    setIsSearching(false)
  }, [])

  return { results, isSearching, error, search, clear }
}
