'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getVotes, castVote, getMyVote, type VoteTotals, type CastVoteResult } from '../queries/votes'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseVotingReturn extends VoteTotals {
  myVote: 'skip' | 'keep' | null
  skipPercent: number
  keepPercent: number
  isLoading: boolean
  error: string | null

  /**
   * Emitir o cambiar el voto de esta mesa.
   * Si la mesa ya votó ese tipo, no hace nada.
   * Retorna el resultado incluyendo si la canción fue saltada.
   */
  castVote: (voteType: 'skip' | 'keep') => Promise<CastVoteResult | null>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoting(
  queueId: string | null,
  barId: string | null,
  tableId: string | null,
): UseVotingReturn {
  const [totals, setTotals] = useState<VoteTotals>({ skip: 0, keep: 0, total: 0 })
  const [myVote, setMyVote] = useState<'skip' | 'keep' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Initial fetch ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!queueId || !tableId) return
    const [voteTotals, myCurrentVote] = await Promise.all([
      getVotes(queueId),
      getMyVote(queueId, tableId),
    ])
    setTotals(voteTotals)
    setMyVote(myCurrentVote)
  }, [queueId, tableId])

  // Reset and re-fetch when the song changes
  useEffect(() => {
    if (!queueId) {
      setTotals({ skip: 0, keep: 0, total: 0 })
      setMyVote(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchAll()
      .catch((e) => setError((e as Error).message))
      .finally(() => setIsLoading(false))
  }, [queueId, fetchAll])

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!queueId || !barId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`useVoting:${barId}:${queueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `queue_id=eq.${queueId}`,
        },
        (payload) => {
          const vote = payload.new as { vote_type: 'skip' | 'keep'; table_id: string }
          setTotals((prev) => {
            const newSkip = vote.vote_type === 'skip' ? prev.skip + 1 : prev.skip
            const newKeep = vote.vote_type === 'keep' ? prev.keep + 1 : prev.keep
            return { skip: newSkip, keep: newKeep, total: newSkip + newKeep }
          })
          // Update own vote if this is our table
          if (tableId && vote.table_id === tableId) {
            setMyVote(vote.vote_type)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'votes',
          filter: `queue_id=eq.${queueId}`,
        },
        () => {
          // Vote changed (table switched skip↔keep) → re-fetch for accuracy
          void fetchAll()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queueId, barId, tableId, fetchAll])

  // ── castVote action ────────────────────────────────────────────────────────

  const handleCastVote = useCallback(
    async (voteType: 'skip' | 'keep'): Promise<CastVoteResult | null> => {
      if (!queueId || !barId || !tableId) return null

      // Optimistic update
      const prevMyVote = myVote
      setMyVote(voteType)

      try {
        const result = await castVote(queueId, tableId, barId, voteType)
        setTotals({ skip: result.skip, keep: result.keep, total: result.total })
        setMyVote(voteType)
        return result
      } catch (e) {
        // Rollback optimistic update
        setMyVote(prevMyVote)
        setError((e as Error).message)
        return null
      }
    },
    [queueId, barId, tableId, myVote],
  )

  // ── Derived percentages ────────────────────────────────────────────────────

  const skipPercent = totals.total > 0 ? Math.round((totals.skip / totals.total) * 100) : 0
  const keepPercent = totals.total > 0 ? Math.round((totals.keep / totals.total) * 100) : 0

  return {
    ...totals,
    myVote,
    skipPercent,
    keepPercent,
    isLoading,
    error,
    castVote: handleCastVote,
  }
}
