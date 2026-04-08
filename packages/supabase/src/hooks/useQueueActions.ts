'use client'

import { useCallback, useState } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { requestSong, voteOnSong, playNextSong, skipSong } from '../rpc'
import type { QueueItemWithVotes } from '../rpc'

export interface QueueActionsState {
  isLoading: boolean
  error: string | null
}

export interface QueueActions {
  addSong: (params: {
    barId: string
    tableId: string
    title: string
    artist: string
    youtubeVideoId?: string
    thumbnailUrl?: string
    bidAmount?: number
    dedication?: string
  }) => Promise<unknown>

  bidOnSong: (params: {
    queueId: string
    barId: string
    tableId: string
    amount: number
  }) => Promise<QueueItemWithVotes>

  vote: (queueId: string, tableId: string, voteType: 'skip' | 'keep') => Promise<void>

  nextSong: (barId: string) => Promise<unknown>

  skip: (queueId: string, barId: string) => Promise<void>

  reorder: (barId: string, items: { id: string; position: number }[]) => Promise<void>

  removeFromQueue: (queueId: string, barId: string) => Promise<void>
}

export function useQueueActions(): QueueActions & QueueActionsState {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wrap = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsLoading(true)
      setError(null)
      try {
        return await fn()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        setError(msg)
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const addSong = useCallback(
    (params: Parameters<typeof requestSong>[0]) => wrap(() => requestSong(params)),
    [wrap],
  )

  const bidOnSong = useCallback(
    (params: { queueId: string; barId: string; tableId: string; amount: number }) =>
      wrap(async () => {
        const supabase = getSupabaseBrowserClient()
        const { data, error: err } = await supabase.rpc('bid_on_song', {
          p_queue_id: params.queueId,
          p_bar_id:   params.barId,
          p_table_id: params.tableId,
          p_amount:   params.amount,
        })
        if (err) throw new Error(err.message)
        return data as QueueItemWithVotes
      }),
    [wrap],
  )

  const vote = useCallback(
    (queueId: string, tableId: string, voteType: 'skip' | 'keep') =>
      wrap(() => voteOnSong(queueId, tableId, voteType)),
    [wrap],
  )

  const nextSong = useCallback(
    (barId: string) => wrap(() => playNextSong(barId)),
    [wrap],
  )

  const skip = useCallback(
    (queueId: string, barId: string) => wrap(() => skipSong(queueId, barId)),
    [wrap],
  )

  const reorder = useCallback(
    (barId: string, items: { id: string; position: number }[]) =>
      wrap(async () => {
        const supabase = getSupabaseBrowserClient()
        const { error: err } = await supabase.rpc('reorder_queue', {
          p_bar_id: barId,
          p_items:  items,
        })
        if (err) throw new Error(err.message)
      }),
    [wrap],
  )

  const removeFromQueue = useCallback(
    (queueId: string, barId: string) =>
      wrap(async () => {
        const supabase = getSupabaseBrowserClient()
        const { error: err } = await supabase.rpc('remove_from_queue', {
          p_queue_id: queueId,
          p_bar_id:   barId,
        })
        if (err) throw new Error(err.message)
      }),
    [wrap],
  )

  return {
    isLoading,
    error,
    addSong,
    bidOnSong,
    vote,
    nextSong,
    skip,
    reorder,
    removeFromQueue,
  }
}
