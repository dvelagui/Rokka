// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  RealtimeRole,
  ConnectionStatus,
  QueueEvent,
  ChatMessage,
  VoteCounts,
  TableRow,
  TableEvent,
  OrderRow,
  AdRow,
  ReactionPayload,
  TableCallPayload,
  AdminActionType,
  AdminActionPayload,
} from './types'

// ── Individual hooks ──────────────────────────────────────────────────────────
export { useQueueRealtime } from './useQueueRealtime'
export type { QueueRealtimeState } from './useQueueRealtime'

export { useChatRealtime } from './useChatRealtime'
export type { ChatRealtimeState } from './useChatRealtime'

export { useVotesRealtime } from './useVotesRealtime'
export type { VotesRealtimeState } from './useVotesRealtime'

export { useTablesRealtime } from './useTablesRealtime'
export type { TablesRealtimeState } from './useTablesRealtime'

export { useOrdersRealtime } from './useOrdersRealtime'
export type { OrdersRealtimeState } from './useOrdersRealtime'

export { useAdsRealtime } from './useAdsRealtime'
export type { AdsRealtimeState } from './useAdsRealtime'

export { useBroadcast } from './useBroadcast'
export type { BroadcastState, BroadcastActions } from './useBroadcast'

// ── Master hook ───────────────────────────────────────────────────────────────
export { useBarRealtime } from './useBarRealtime'
export type { BarRealtimeState } from './useBarRealtime'

// ── Provider + consumer hook ──────────────────────────────────────────────────
export { RealtimeProvider, useRealtime } from './RealtimeProvider'
