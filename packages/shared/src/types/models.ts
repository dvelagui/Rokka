/**
 * TIPOS DE DOMINIO LIMPIOS
 *
 * camelCase, desacoplados de Supabase.
 * Usar en componentes, lógica de UI y tests.
 */

// ── Primitivos compartidos ────────────────────────────────────────────────────

export type QueueStatus    = 'queued' | 'playing' | 'played' | 'skipped'
export type MessageType    = 'msg' | 'admin' | 'reaction' | 'system'
export type VoteType       = 'skip' | 'keep'
export type TransactionType = 'recharge' | 'bid' | 'refund' | 'reward'
export type OrderStatus    = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
export type AdminRole      = 'owner' | 'manager'
export type RealtimeRole   = 'client' | 'admin' | 'tv'

// ── Bar ───────────────────────────────────────────────────────────────────────

export interface BarConfig {
  /** Duración promedio de canción en minutos */
  avgSongDuration: number
  maxTables: number
  /** Puja mínima en créditos */
  minBid: number
  profanityFilter: boolean
  allowDedications: boolean
  /** Porcentaje de votos skip para skip automático (0–100) */
  autoSkipThreshold: number
  maxSongsPerTable: number
  chatEnabled: boolean
  ordersEnabled: boolean
  tvPin: string | null
}

export interface Bar {
  id: string
  name: string
  emoji: string
  logoUrl: string | null
  slug: string
  config: BarConfig
  createdAt: string
  updatedAt: string
}

// ── Mesa ──────────────────────────────────────────────────────────────────────

export interface Table {
  id: string
  barId: string
  number: number
  label: string
  isActive: boolean
  isBanned: boolean
  credits: number
  connectedAt: string | null
  maxOccupants: number
}

// ── Cola ──────────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string
  barId: string
  title: string
  artist: string
  youtubeVideoId: string | null
  thumbnailUrl: string | null
  tableId: string | null
  tableLabel: string | null
  bidAmount: number
  position: number
  dedication: string | null
  status: QueueStatus
  addedAt: string
  playedAt: string | null
  /** Votos skip de esta canción (JOIN) */
  skipVotes?: number
  /** Votos keep de esta canción (JOIN) */
  keepVotes?: number
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  barId: string
  tableId: string | null
  tableLabel: string | null
  message: string
  messageType: MessageType
  isPinned: boolean
  createdAt: string
}

// ── Votos ─────────────────────────────────────────────────────────────────────

export interface Vote {
  id: string
  queueId: string
  tableId: string
  voteType: VoteType
  createdAt: string
}

export interface VoteTally {
  skip: number
  keep: number
  total: number
  skipPercent: number
  keepPercent: number
}

// ── Créditos ──────────────────────────────────────────────────────────────────

export interface CreditTransaction {
  id: string
  barId: string
  tableId: string
  amount: number
  type: TransactionType
  status: 'pending' | 'completed' | 'cancelled'
  reference: string | null
  qrCode: string | null
  verifiedBy: string | null
  createdAt: string
}

// ── Menú ──────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string
  subcategoryId: string
  barId: string
  name: string
  price: number
  isAvailable: boolean
  sortOrder: number
}

export interface MenuSubcategory {
  id: string
  categoryId: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

export interface MenuCategory {
  id: string
  barId: string
  name: string
  emoji: string
  sortOrder: number
  subcategories: MenuSubcategory[]
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  itemId: string
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  barId: string
  tableId: string
  tableLabel: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  waiterId: string | null
  createdAt: string
  updatedAt: string
}

// ── Meseros ───────────────────────────────────────────────────────────────────

export interface Waiter {
  id: string
  barId: string
  name: string
  phone: string | null
  shift: string
  isActive: boolean
  createdAt: string
}

// ── Anuncios ──────────────────────────────────────────────────────────────────

export interface Ad {
  id: string
  barId: string
  emoji: string
  title: string
  subtitle: string | null
  color: string
  durationSeconds: number
  isOwn: boolean
  companyName: string | null
  isActive: boolean
  sortOrder: number
}

// ── Log de actividad ──────────────────────────────────────────────────────────

export interface LogEntry {
  id: string
  barId: string
  actor: string
  action: string
  detail: string
  createdAt: string
  hora: string
}

// ── Notificaciones (en memoria) ───────────────────────────────────────────────

export type NotificationType =
  | 'table_call'
  | 'new_order'
  | 'high_bid'
  | 'auto_ban'
  | 'song_skipped'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  detail: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface BarStats {
  songsPlayed: number
  totalBids: number
  creditsSold: number
  peakTables: number
  activeTablesNow: number
  topSong: { title: string; artist: string; times: number } | null
  peakHour: string | null
}

export interface TopSong {
  title: string
  artist: string
  timesPlayed: number
  avgBid: number
  maxBid: number
}

// ── YouTube ───────────────────────────────────────────────────────────────────

export interface YoutubeSong {
  videoId: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
}

// ── Carrito (estado local) ────────────────────────────────────────────────────

export interface CartItem {
  item: MenuItem
  qty: number
}
