'use client'

import { useState, useCallback, useRef } from 'react'
import { searchSongs, type YoutubeSongResult } from '../services/youtube'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 3

export interface UseYouTubeSearchReturn {
  results: YoutubeSongResult[]
  isSearching: boolean
  error: string | null
  search: (query: string) => void
  clear: () => void
}

export function useYouTubeSearch(maxResults = 10): UseYouTubeSearchReturn {
  const [results, setResults] = useState<YoutubeSongResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(
    (query: string) => {
      // Clear previous timer
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
          const data = await searchSongs(query.trim(), maxResults)
          setResults(data)
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
