import type { QueueItemWithVotes } from '../rpc'

// ── Roles ─────────────────────────────────────────────────────────────────────

export type RealtimeRole = 'client' | 'admin' | 'tv'

// ── Connection ────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

// ── Queue events ──────────────────────────────────────────────────────────────

export type QueueEvent =
  | { type: 'song_added';             item: QueueItemWithVotes }
  | { type: 'song_removed';           id: string }
  | { type: 'bid_placed';             id: string; newBid: number }
  | { type: 'song_playing';           item: QueueItemWithVotes }
  | { type: 'song_skipped';           id: string }

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  bar_id: string
  table_id: string | null
  message: string
  message_type: 'msg' | 'admin' | 'reaction' | 'system'
  is_pinned: boolean
  created_at: string
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export interface VoteCounts {
  skipVotes: number
  keepVotes: number
  thresholdReached: boolean
}

// ── Tables (admin) ────────────────────────────────────────────────────────────

export interface TableRow {
  id: string
  bar_id: string
  number: number
  label: string
  is_active: boolean
  is_banned: boolean
  session_token: string | null
  credits: number
  connected_at: string | null
  max_occupants: number
}

export type TableEvent =
  | { type: 'table_connected';        tableId: string }
  | { type: 'table_disconnected';     tableId: string }
  | { type: 'credits_updated';        tableId: string; credits: number }

// ── Orders (admin) ────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string
  bar_id: string
  table_id: string
  items: unknown[]
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
  waiter_id: string | null
  created_at: string
  updated_at: string
}

// ── Ads ───────────────────────────────────────────────────────────────────────

export interface AdRow {
  id: string
  bar_id: string
  emoji: string
  title: string
  subtitle: string | null
  color: string
  duration_seconds: number
  is_own: boolean
  company_name: string | null
  is_active: boolean
  sort_order: number
  image_url: string | null
  start_date: string | null
  end_date: string | null
  time_start: string | null
  time_end: string | null
  max_impressions: number | null
  impressions_count: number
}

export interface AdImpressionReportRow {
  ad_id: string
  title: string
  emoji: string
  is_active: boolean
  total_count: number
  last_shown: string | null
}

export interface AdImpressionRow {
  id: string
  ad_id: string
  bar_id: string
  source: string
  shown_at: string
}

// ── Broadcast payloads ────────────────────────────────────────────────────────

export interface ReactionPayload {
  emoji: string
  tableId: string
  /** 0–100 percentage, for floating animation placement */
  x: number
}

export interface TableCallPayload {
  tableId: string
  tableLabel: string
}

export type AdminActionType = 'pin_message' | 'pause_music' | 'clear_queue' | 'announce'

export interface AdminActionPayload {
  action: AdminActionType
  data?: Record<string, unknown>
}
