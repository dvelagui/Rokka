/**
 * TIPOS GENERADOS DE SUPABASE
 *
 * Para regenerar desde la instancia local:
 *   npx supabase gen types typescript --local > packages/shared/src/types/database.ts
 *
 * Este archivo es un stub manual que refleja el schema actual.
 * Regenerar tras cada migración.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type QueueStatusEnum      = 'queued' | 'playing' | 'played' | 'skipped'
export type VoteTypeEnum         = 'skip' | 'keep'
export type MessageTypeEnum      = 'msg' | 'admin' | 'reaction' | 'system'
export type TransactionTypeEnum  = 'recharge' | 'bid' | 'refund' | 'reward'
export type OrderStatusEnum      = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
export type AdminRoleEnum        = 'owner' | 'manager'

// ── Table Row types ───────────────────────────────────────────────────────────

export interface BarsRow {
  id:         string
  name:       string
  emoji:      string
  logo_url:   string | null
  slug:       string
  config:     Record<string, unknown>
  tv_pin:     string | null
  created_at: string
  updated_at: string
}

export interface TablesRow {
  id:            string
  bar_id:        string
  number:        number
  label:         string
  is_active:     boolean
  is_banned:     boolean
  session_token: string | null
  credits:       number
  connected_at:  string | null
  max_occupants: number
}

export interface QueueRow {
  id:               string
  bar_id:           string
  title:            string
  artist:           string
  youtube_video_id: string | null
  thumbnail_url:    string | null
  table_id:         string | null
  bid_amount:       number
  position:         number
  dedication:       string | null
  status:           QueueStatusEnum
  added_at:         string
  played_at:        string | null
}

export interface VotesRow {
  id:         string
  queue_id:   string
  table_id:   string
  vote_type:  VoteTypeEnum
  created_at: string
}

export interface ChatMessagesRow {
  id:           string
  bar_id:       string
  table_id:     string | null
  message:      string
  message_type: MessageTypeEnum
  is_pinned:    boolean
  created_at:   string
}

export interface CreditsTransactionsRow {
  id:          string
  bar_id:      string
  table_id:    string
  amount:      number
  type:        TransactionTypeEnum
  status:      'pending' | 'completed' | 'cancelled'
  reference:   string | null
  qr_code:     string | null
  verified_by: string | null
  created_at:  string
}

export interface OrdersRow {
  id:         string
  bar_id:     string
  table_id:   string
  items:      unknown[]
  total:      number
  status:     OrderStatusEnum
  waiter_id:  string | null
  created_at: string
  updated_at: string
}

export interface AdsRow {
  id:               string
  bar_id:           string
  emoji:            string
  title:            string
  subtitle:         string | null
  color:            string
  duration_seconds: number
  is_own:           boolean
  company_name:     string | null
  is_active:        boolean
  sort_order:       number
}

export interface WaitersRow {
  id:         string
  bar_id:     string
  name:       string
  phone:      string | null
  pin:        string
  shift:      string
  is_active:  boolean
  created_at: string
}

export interface MenuCategoriesRow {
  id:         string
  bar_id:     string
  name:       string
  emoji:      string
  sort_order: number
}

export interface MenuSubcategoriesRow {
  id:          string
  category_id: string
  name:        string
  sort_order:  number
}

export interface MenuItemsRow {
  id:             string
  bar_id:         string
  subcategory_id: string
  name:           string
  price:          number
  is_available:   boolean
  sort_order:     number
}

export interface ActivityLogRow {
  id:         string
  bar_id:     string
  actor:      string
  action:     string
  detail:     string
  created_at: string
}

export interface BarStatsRow {
  id:                 string
  bar_id:             string
  date:               string
  total_bids:         number
  total_songs:        number
  total_credits_sold: number
  active_tables:      number
  peak_tables:        number
}

export interface BarAdminsRow {
  id:         string
  user_id:    string
  bar_id:     string
  role:       AdminRoleEnum
  created_at: string
}

export interface FavoritesRow {
  id:               string
  bar_id:           string
  title:            string
  artist:           string
  youtube_video_id: string | null
  times_played:     number
  added_at:         string
}

export interface BlockedSongsRow {
  id:         string
  bar_id:     string
  title:      string
  artist:     string
  blocked_by: string
  reason:     string | null
  created_at: string
}

export interface GenresRow {
  id:     string
  bar_id: string
  name:   string
  emoji:  string
  color:  string
}

export interface GenreSongsRow {
  id:               string
  genre_id:         string
  title:            string
  artist:           string
  youtube_video_id: string | null
}

// ── Database shape ────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      bars:                  { Row: BarsRow;                  Insert: Partial<BarsRow> & Pick<BarsRow, 'name' | 'slug'>;            Update: Partial<BarsRow> }
      tables:                { Row: TablesRow;                Insert: Partial<TablesRow> & Pick<TablesRow, 'bar_id' | 'number' | 'label'>; Update: Partial<TablesRow> }
      queue:                 { Row: QueueRow;                 Insert: Partial<QueueRow> & Pick<QueueRow, 'bar_id' | 'title' | 'artist' | 'position'>; Update: Partial<QueueRow> }
      votes:                 { Row: VotesRow;                 Insert: Omit<VotesRow, 'id' | 'created_at'>;     Update: Partial<VotesRow> }
      chat_messages:         { Row: ChatMessagesRow;          Insert: Partial<ChatMessagesRow> & Pick<ChatMessagesRow, 'bar_id' | 'message'>; Update: Partial<ChatMessagesRow> }
      credits_transactions:  { Row: CreditsTransactionsRow;   Insert: Partial<CreditsTransactionsRow> & Pick<CreditsTransactionsRow, 'bar_id' | 'table_id' | 'amount' | 'type'>; Update: Partial<CreditsTransactionsRow> }
      orders:                { Row: OrdersRow;                Insert: Partial<OrdersRow> & Pick<OrdersRow, 'bar_id' | 'table_id' | 'items' | 'total'>; Update: Partial<OrdersRow> }
      ads:                   { Row: AdsRow;                   Insert: Partial<AdsRow> & Pick<AdsRow, 'bar_id' | 'title'>;           Update: Partial<AdsRow> }
      waiters:               { Row: WaitersRow;               Insert: Partial<WaitersRow> & Pick<WaitersRow, 'bar_id' | 'name' | 'pin'>; Update: Partial<WaitersRow> }
      menu_categories:       { Row: MenuCategoriesRow;        Insert: Partial<MenuCategoriesRow> & Pick<MenuCategoriesRow, 'bar_id' | 'name'>; Update: Partial<MenuCategoriesRow> }
      menu_subcategories:    { Row: MenuSubcategoriesRow;     Insert: Partial<MenuSubcategoriesRow> & Pick<MenuSubcategoriesRow, 'category_id' | 'name'>; Update: Partial<MenuSubcategoriesRow> }
      menu_items:            { Row: MenuItemsRow;             Insert: Partial<MenuItemsRow> & Pick<MenuItemsRow, 'bar_id' | 'subcategory_id' | 'name' | 'price'>; Update: Partial<MenuItemsRow> }
      activity_log:          { Row: ActivityLogRow;           Insert: Partial<ActivityLogRow> & Pick<ActivityLogRow, 'bar_id' | 'actor' | 'action' | 'detail'>; Update: never }
      bar_stats:             { Row: BarStatsRow;              Insert: Partial<BarStatsRow> & Pick<BarStatsRow, 'bar_id' | 'date'>;   Update: Partial<BarStatsRow> }
      bar_admins:            { Row: BarAdminsRow;             Insert: Partial<BarAdminsRow> & Pick<BarAdminsRow, 'user_id' | 'bar_id'>; Update: Partial<BarAdminsRow> }
      favorites:             { Row: FavoritesRow;             Insert: Partial<FavoritesRow> & Pick<FavoritesRow, 'bar_id' | 'title' | 'artist'>; Update: Partial<FavoritesRow> }
      blocked_songs:         { Row: BlockedSongsRow;          Insert: Partial<BlockedSongsRow> & Pick<BlockedSongsRow, 'bar_id' | 'title' | 'artist' | 'blocked_by'>; Update: Partial<BlockedSongsRow> }
      genres:                { Row: GenresRow;                Insert: Partial<GenresRow> & Pick<GenresRow, 'bar_id' | 'name'>;       Update: Partial<GenresRow> }
      genre_songs:           { Row: GenreSongsRow;            Insert: Partial<GenreSongsRow> & Pick<GenreSongsRow, 'genre_id' | 'title' | 'artist'>; Update: Partial<GenreSongsRow> }
    }
    Enums: {
      queue_status:     QueueStatusEnum
      vote_type:        VoteTypeEnum
      message_type:     MessageTypeEnum
      transaction_type: TransactionTypeEnum
      order_status:     OrderStatusEnum
      admin_role:       AdminRoleEnum
    }
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** Tipo de una fila de tabla. Ej: `Tables<'bars'>` */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Tipo de un enum. Ej: `Enums<'queue_status'>` */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
