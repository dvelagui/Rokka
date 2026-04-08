// ─── ROKKA Theme Colors ───────────────────────────────────────────────────────

export const ROKKA_COLORS = {
  cyan: '#00E5FF',
  purple: '#D500F9',
  fire: '#FF4500',
  red: '#FF1744',
  green: '#00E676',
  gold: '#FFD700',
  orange: '#FF6D00',
  background: '#0a0a0a',
  card: '#111111',
  border: '#1a1a1a',
} as const

// ─── App Ports ────────────────────────────────────────────────────────────────

export const APP_PORTS = {
  client: 3000,
  admin: 3001,
  tv: 3002,
} as const

// ─── Queue Limits ─────────────────────────────────────────────────────────────

export const QUEUE_DEFAULTS = {
  maxQueueLength: 20,
  maxRequestsPerTable: 3,
  votingEnabled: true,
  requestsEnabled: true,
} as const

// ─── Supabase Realtime Channels ───────────────────────────────────────────────

export const REALTIME_CHANNELS = {
  queue: (barId: string) => `queue:${barId}`,
  bar: (barId: string) => `bar:${barId}`,
} as const
