'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { VoteCounts } from './types'

/** Porcentaje de mesas que deben votar skip para emitir el evento */
const SKIP_THRESHOLD = 0.5

export interface VotesRealtimeState extends VoteCounts {
  isLoading: boolean
}

export function useVotesRealtime(
  barId: string | null,
  currentQueueId: string | null,
): VotesRealtimeState {
  const [skipVotes, setSkipVotes] = useState(0)
  const [keepVotes, setKeepVotes] = useState(0)
  const [totalActiveTables, setTotalActiveTables] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const prevQueueId = useRef<string | null>(null)

  // Fetch total active tables once per barId
  useEffect(() => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('tables')
      .select('id', { count: 'exact', head: true })
      .eq('bar_id', barId)
      .eq('is_active', true)
      .eq('is_banned', false)
      .then(({ count }) => {
        setTotalActiveTables(Math.max(count ?? 1, 1))
      })
  }, [barId])

  const fetchVotes = useCallback(async () => {
    if (!currentQueueId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('queue_id', currentQueueId)
    if (!error && data) {
      setSkipVotes(data.filter((v) => v.vote_type === 'skip').length)
      setKeepVotes(data.filter((v) => v.vote_type === 'keep').length)
    }
  }, [currentQueueId])

  // Reset when song changes
  useEffect(() => {
    if (currentQueueId !== prevQueueId.current) {
      prevQueueId.current = currentQueueId
      setSkipVotes(0)
      setKeepVotes(0)
      if (currentQueueId) {
        setIsLoading(true)
        fetchVotes().finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    }
  }, [currentQueueId, fetchVotes])

  useEffect(() => {
    if (!barId || !currentQueueId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`votes-rt:${barId}:${currentQueueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `queue_id=eq.${currentQueueId}`,
        },
        (payload) => {
          const vote = payload.new as { vote_type: 'skip' | 'keep' }
          if (vote.vote_type === 'skip') setSkipVotes((n) => n + 1)
          else setKeepVotes((n) => n + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'votes',
          filter: `queue_id=eq.${currentQueueId}`,
        },
        () => {
          // Vote changed — re-fetch for accuracy
          void fetchVotes()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, currentQueueId, fetchVotes])

  const thresholdReached = skipVotes / totalActiveTables >= SKIP_THRESHOLD

  return { skipVotes, keepVotes, thresholdReached, isLoading }
}
