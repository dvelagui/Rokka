'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueueRealtime } from './useQueueRealtime'
import { useChatRealtime } from './useChatRealtime'
import { useVotesRealtime } from './useVotesRealtime'
import { useTablesRealtime } from './useTablesRealtime'
import { useOrdersRealtime } from './useOrdersRealtime'
import { useAdsRealtime } from './useAdsRealtime'
import { useBroadcast } from './useBroadcast'
import type { RealtimeRole, ConnectionStatus } from './types'

/** Tiempo en ms sin conexión antes de forzar un re-fetch completo al reconectar */
const STALE_THRESHOLD_MS = 30_000

export interface BarRealtimeState {
  /** Estado de conexión consolidado */
  connectionStatus: ConnectionStatus

  queue: ReturnType<typeof useQueueRealtime>
  chat: ReturnType<typeof useChatRealtime>
  votes: ReturnType<typeof useVotesRealtime>
  ads: ReturnType<typeof useAdsRealtime>
  broadcast: ReturnType<typeof useBroadcast>

  /** Solo admin */
  tables: ReturnType<typeof useTablesRealtime> | null
  orders: ReturnType<typeof useOrdersRealtime> | null
}

export function useBarRealtime(
  barId: string | null,
  role: RealtimeRole,
): BarRealtimeState {
  const disconnectedAt = useRef<number | null>(null)
  const [, forceUpdate] = useState(0)

  // All hooks must be called unconditionally (React rules)
  const queue = useQueueRealtime(barId)
  const chat = useChatRealtime(barId)
  const votes = useVotesRealtime(barId, queue.currentSong?.id ?? null)
  const ads = useAdsRealtime(barId)
  const broadcast = useBroadcast(barId)

  // Admin-only: always call but pass null when not admin (hooks handle null gracefully)
  const tables = useTablesRealtime(role === 'admin' ? barId : null)
  const orders = useOrdersRealtime(role === 'admin' ? barId : null)

  // Consolidated connection status: degraded if any relevant channel is not connected
  const statuses: ConnectionStatus[] = [queue.status, chat.status, ads.status]
  if (role === 'admin') {
    statuses.push(tables.status, orders.status)
  }

  let connectionStatus: ConnectionStatus = 'connected'
  if (statuses.some((s) => s === 'disconnected')) connectionStatus = 'disconnected'
  else if (statuses.some((s) => s === 'reconnecting')) connectionStatus = 'reconnecting'
  else if (statuses.some((s) => s === 'connecting')) connectionStatus = 'connecting'

  // Track disconnect time; trigger full refetch if stale on reconnect
  useEffect(() => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      if (disconnectedAt.current === null) {
        disconnectedAt.current = Date.now()
      }
    } else if (connectionStatus === 'connected') {
      if (disconnectedAt.current !== null) {
        const elapsed = Date.now() - disconnectedAt.current
        disconnectedAt.current = null
        if (elapsed >= STALE_THRESHOLD_MS) {
          // Force re-mount of hooks by nudging state — each hook re-fetches on mount
          forceUpdate((n) => n + 1)
        }
      }
    }
  }, [connectionStatus])

  return {
    connectionStatus,
    queue,
    chat,
    votes,
    ads,
    broadcast,
    tables: role === 'admin' ? tables : null,
    orders: role === 'admin' ? orders : null,
  }
}
