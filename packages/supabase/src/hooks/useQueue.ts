'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { QueueItemWithVotes } from '../rpc'

export interface QueueState {
  queue: QueueItemWithVotes[]
  currentSong: QueueItemWithVotes | null
  isLoading: boolean
  error: string | null
}

export function useQueue(barId: string | null): QueueState {
  const [queue, setQueue] = useState<QueueItemWithVotes[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    const { data, err } = await supabase
      .rpc('get_active_queue', { p_bar_id: barId })
      .then((r) => ({ data: r.data, err: r.error }))
    if (err) {
      setError(err.message)
    } else {
      setQueue((data ?? []) as QueueItemWithVotes[])
      setError(null)
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchQueue().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    // Suscribirse a cambios en queue y votes para re-fetch
    const channel = supabase
      .channel(`queue:${barId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue', filter: `bar_id=eq.${barId}` },
        () => { void fetchQueue() },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => { void fetchQueue() },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, fetchQueue])

  const currentSong = queue.find((item) => item.status === 'playing') ?? null

  return { queue, currentSong, isLoading, error }
}
