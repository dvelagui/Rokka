'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'

export interface UseCreditsReturn {
  credits: number
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useCredits(tableId: string | null): UseCreditsReturn {
  const [credits, setCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCredits = useCallback(async () => {
    if (!tableId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('tables')
      .select('credits')
      .eq('id', tableId)
      .single()
    if (!error && data) {
      setCredits((data as { credits: number }).credits)
    }
  }, [tableId])

  useEffect(() => {
    if (!tableId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchCredits().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    // Escuchar actualizaciones de la fila de la mesa
    const channel = supabase
      .channel(`useCredits:${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables',
          filter: `id=eq.${tableId}`,
        },
        (payload) => {
          const updated = payload.new as { credits: number }
          setCredits(updated.credits)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tableId, fetchCredits])

  return { credits, isLoading, refresh: fetchCredits }
}
