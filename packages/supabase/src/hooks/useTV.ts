'use client'

import { useEffect, useState } from 'react'
import { getStoredTVSession, type TVSessionData } from '../auth/tv'

export interface TVState {
  barId: string | null
  barSlug: string | null
  loading: boolean
}

/**
 * Hook para la pantalla TV.
 * Lee el bar_id guardado en localStorage tras el login con PIN.
 */
export function useTV(): TVState {
  const [state, setState] = useState<TVState>({
    barId: null,
    barSlug: null,
    loading: true,
  })

  useEffect(() => {
    const stored: TVSessionData | null = getStoredTVSession()
    setState({
      barId: stored?.barId ?? null,
      barSlug: stored?.barSlug ?? null,
      loading: false,
    })
  }, [])

  return state
}
