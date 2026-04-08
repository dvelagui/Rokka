'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { ReactionPayload, TableCallPayload, AdminActionPayload } from './types'

// ── Event types on the shared broadcast channel ───────────────────────────────

type BroadcastEvent =
  | { event: 'reaction';     payload: ReactionPayload }
  | { event: 'table_call';   payload: TableCallPayload }
  | { event: 'admin_action'; payload: AdminActionPayload }

export interface BroadcastState {
  latestReaction: ReactionPayload | null
  latestTableCall: TableCallPayload | null
  latestAdminAction: AdminActionPayload | null
}

export interface BroadcastActions {
  sendReaction: (payload: ReactionPayload) => void
  callWaiter: (payload: TableCallPayload) => void
  sendAdminAction: (payload: AdminActionPayload) => void
}

export function useBroadcast(
  barId: string | null,
): BroadcastState & BroadcastActions {
  const [latestReaction, setLatestReaction] = useState<ReactionPayload | null>(null)
  const [latestTableCall, setLatestTableCall] = useState<TableCallPayload | null>(null)
  const [latestAdminAction, setLatestAdminAction] = useState<AdminActionPayload | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    if (!barId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`bar:${barId}:broadcast`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        setLatestReaction(payload as ReactionPayload)
      })
      .on('broadcast', { event: 'table_call' }, ({ payload }) => {
        setLatestTableCall(payload as TableCallPayload)
      })
      .on('broadcast', { event: 'admin_action' }, ({ payload }) => {
        setLatestAdminAction(payload as AdminActionPayload)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [barId])

  const sendReaction = useCallback((payload: ReactionPayload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload } satisfies {
      type: 'broadcast'
      event: BroadcastEvent['event']
      payload: unknown
    })
  }, [])

  const callWaiter = useCallback((payload: TableCallPayload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'table_call', payload } satisfies {
      type: 'broadcast'
      event: BroadcastEvent['event']
      payload: unknown
    })
  }, [])

  const sendAdminAction = useCallback((payload: AdminActionPayload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'admin_action', payload } satisfies {
      type: 'broadcast'
      event: BroadcastEvent['event']
      payload: unknown
    })
  }, [])

  return {
    latestReaction,
    latestTableCall,
    latestAdminAction,
    sendReaction,
    callWaiter,
    sendAdminAction,
  }
}
