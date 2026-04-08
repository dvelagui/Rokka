// ── Tema visual ───────────────────────────────────────────────────────────────

export const ROKKA_COLORS = {
  cyan:       '#00E5FF',
  purple:     '#D500F9',
  fire:       '#FF4500',
  red:        '#FF1744',
  green:      '#00E676',
  gold:       '#FFD700',
  orange:     '#FF6D00',
  background: '#0a0a0a',
  card:       '#111111',
  border:     '#1a1a1a',
} as const

// ── Puertos de las apps ───────────────────────────────────────────────────────

export const APP_PORTS = {
  client: 3000,
  admin:  3001,
  tv:     3002,
} as const

// ── Chat ──────────────────────────────────────────────────────────────────────

export const MAX_CHAT_LENGTH      = 200
export const MAX_DEDICATION_LENGTH = 100

/** Reacciones permitidas en el chat */
export const ALLOWED_REACTIONS = ['🔥', '❤️', '😂', '🎵', '👏', '🙌', '🤘', '💃'] as const
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number]

/** Lista base de palabras prohibidas (misma que el RPC de SQL) */
export const PROFANITY_LIST = [
  'mierda', 'puta', 'puto', 'hijueputa', 'carajo',
  'verga', 'fuck', 'shit', 'bitch', 'pendejo',
] as const

// ── Cola ──────────────────────────────────────────────────────────────────────

export const QUEUE_DEFAULTS = {
  maxQueueLength:      20,
  maxSongsPerTable:    3,
  minBid:              50,
  votingEnabled:       true,
  requestsEnabled:     true,
  /** Duración promedio por defecto en segundos (3.5 min) */
  avgSongDuration:     210,
  /** % de votos skip para skip automático */
  autoSkipThreshold:   50,
} as const

export const QUEUE_STATUSES = ['queued', 'playing', 'played', 'skipped'] as const

// ── Pedidos ───────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  'pending', 'confirmed', 'preparing', 'delivered', 'cancelled',
] as const

// ── Meseros ───────────────────────────────────────────────────────────────────

export const SHIFTS = [
  'Mañana (6am-2pm)',
  'Tarde (2pm-10pm)',
  'Noche (10pm-6am)',
  'Partido',
] as const
export type Shift = (typeof SHIFTS)[number]

// ── Géneros musicales ─────────────────────────────────────────────────────────

export const GENRE_LIST_DEFAULT = [
  'Reggaeton',
  'Pop',
  'Rock',
  'Salsa',
  'Electrónica',
  'Urbano',
  'Balada',
  'Cumbia',
  'Vallenato',
] as const

// ── Créditos ──────────────────────────────────────────────────────────────────

/** Paquetes de recarga predefinidos */
export const RECHARGE_AMOUNTS = [1_000, 2_000, 5_000, 10_000, 20_000] as const

// ── Anuncios ──────────────────────────────────────────────────────────────────

export const AD_DEFAULTS = {
  durationSeconds: 8,
  color:           '#00E5FF',
  songsPerAd:      3,
  maxSecsWithoutAd: 120,
} as const

// ── Canales Supabase Realtime ─────────────────────────────────────────────────

export const REALTIME_CHANNELS = {
  queue:     (barId: string) => `queue:${barId}`,
  chat:      (barId: string) => `chat:${barId}`,
  broadcast: (barId: string) => `bar:${barId}:broadcast`,
  tables:    (barId: string) => `tables:${barId}`,
  orders:    (barId: string) => `orders:${barId}`,
} as const

// ── Puja alta (umbral para notificación) ──────────────────────────────────────

export const HIGH_BID_THRESHOLD = 100
