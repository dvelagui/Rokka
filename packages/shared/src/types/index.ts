// ─── Bar & Venue ──────────────────────────────────────────────────────────────

export interface Bar {
  id: string
  name: string
  slug: string
  isOpen: boolean
  settings: BarSettings
  createdAt: string
}

export interface BarSettings {
  maxQueueLength: number
  votingEnabled: boolean
  requestsEnabled: boolean
  maxRequestsPerTable: number
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface Table {
  id: string
  barId: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
}

// ─── Song & Queue ─────────────────────────────────────────────────────────────

export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  duration: number // seconds
  youtubeId: string
  coverUrl?: string
  genre?: string
}

export type QueueItemStatus = 'pending' | 'playing' | 'played' | 'skipped'

export interface QueueItem {
  id: string
  barId: string
  songId: string
  song: Song
  tableId: string
  tableName: string
  requestedBy?: string
  status: QueueItemStatus
  votes: number
  position: number
  createdAt: string
  playedAt?: string
}

export interface VotePayload {
  queueItemId: string
  tableId: string
  direction: 'up' | 'down'
}

// ─── Realtime Events ──────────────────────────────────────────────────────────

export type RealtimeEvent =
  | { type: 'queue:updated'; payload: QueueItem[] }
  | { type: 'queue:item:added'; payload: QueueItem }
  | { type: 'queue:item:playing'; payload: QueueItem }
  | { type: 'queue:item:finished'; payload: QueueItem }
  | { type: 'bar:status:changed'; payload: { isOpen: boolean } }
