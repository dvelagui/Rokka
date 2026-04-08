'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getActiveQueue } from '../rpc'
import type { QueueItemWithVotes } from '../rpc'
import type { QueueEvent, ConnectionStatus } from './types'

export interface QueueRealtimeState {
  queue: QueueItemWithVotes[]
  currentSong: QueueItemWithVotes | null
  lastEvent: QueueEvent | null
  isLoading: boolean
  status: ConnectionStatus
}

export function useQueueRealtime(barId: string | null): QueueRealtimeState {
  const [queue, setQueue] = useState<QueueItemWithVotes[]>([])
  const [lastEvent, setLastEvent] = useState<QueueEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const prevQueueRef = useRef<Map<string, QueueItemWithVotes>>(new Map())

  const fetchQueue = useCallback(async () => {
    if (!barId) return
    const data = await getActiveQueue(barId)
    setQueue(data)
    prevQueueRef.current = new Map(data.map((item) => [item.id, item]))
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      setStatus('disconnected')
      return
    }

    setIsLoading(true)
    fetchQueue().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`queue-rt:${barId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queue', filter: `bar_id=eq.${barId}` },
        (payload) => {
          void fetchQueue().then(() => {
            // Find newly added item in updated queue to emit typed event
            const newItem = prevQueueRef.current.get((payload.new as { id: string }).id)
            if (newItem) {
              setLastEvent({ type: 'song_added', item: newItem })
            }
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue', filter: `bar_id=eq.${barId}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string; bid_amount: number }
          const old = payload.old as { bid_amount: number }

          void fetchQueue().then(() => {
            const item = prevQueueRef.current.get(updated.id)
            if (!item) return

            if (updated.status === 'playing') {
              setLastEvent({ type: 'song_playing', item })
            } else if (updated.status === 'skipped') {
              setLastEvent({ type: 'song_skipped', id: updated.id })
            } else if (updated.bid_amount > (old.bid_amount ?? 0)) {
              setLastEvent({ type: 'bid_placed', id: updated.id, newBid: updated.bid_amount })
            }
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'queue', filter: `bar_id=eq.${barId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setLastEvent({ type: 'song_removed', id: deletedId })
          void fetchQueue()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => { void fetchQueue() },
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('connected')
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('reconnecting')
        else if (s === 'CLOSED') setStatus('disconnected')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, fetchQueue])

  const currentSong = queue.find((item) => item.status === 'playing') ?? null

  return { queue, currentSong, lastEvent, isLoading, status }
}
