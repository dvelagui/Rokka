// ── Cliente ───────────────────────────────────────────────────────────────────
export { getSupabaseBrowserClient } from './client'
export type { SupabaseClient } from '@supabase/supabase-js'

// ── Auth: Admin ───────────────────────────────────────────────────────────────
export { signInAdmin, signOutAdmin, signUpBar, getAdminSession } from './auth/admin'

// ── Auth: Mesa ────────────────────────────────────────────────────────────────
export {
  createTableSession,
  validateTableSession,
  storeTableSession,
  getStoredTableSession,
  clearTableSession,
} from './auth/table'
export type { TableSessionData, StoredTableSession, TableCheckResult } from './auth/table'
export { checkTableByToken } from './auth/table'

// ── Auth: TV ──────────────────────────────────────────────────────────────────
export {
  authenticateTV,
  storeTVSession,
  getStoredTVSession,
  clearTVSession,
} from './auth/tv'
export type { TVSessionData } from './auth/tv'

// ── RPCs ──────────────────────────────────────────────────────────────────────
export {
  // Cola
  getActiveQueue,
  requestSong,
  voteOnSong,
  playNextSong,
  skipSong,
  bidOnSong,
  reorderQueue,
  removeFromQueue,
  // Créditos
  rechargeCredits,
  // Chat
  sendChatMessage,
  // Pedidos
  placeOrder,
  getOrdersForTable,
  getCreditsHistory,
  // Util
  isSongBlocked,
  getBarPublicInfo,
} from './rpc'
export type { QueueItemWithVotes, OrderItem } from './rpc'

// ── Queries ───────────────────────────────────────────────────────────────────
export { getMessages, sendMessage, sendAdminMessage, getPinnedMessage } from './queries/chat'
export type { ChatMessageWithLabel, SendMessageResult } from './queries/chat'

export { getVotes, castVote, getMyVote } from './queries/votes'
export type { VoteTotals, CastVoteResult } from './queries/votes'

export {
  getTableCredits,
  getTransactionHistory,
  initiateRecharge,
  confirmRecharge,
  getTransactionByQrCode,
  deductCredits,
  refundCredits,
} from './queries/credits'
export type { CreditTransaction, TransactionType, TransactionStatus, InitiateRechargeResult } from './queries/credits'

export {
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
} from './queries/menu'
export type { MenuItem, MenuSubcategory, MenuCategory } from './queries/menu'

export { createOrder, getOrders, getTableOrders, updateOrderStatus } from './queries/orders'
export type { Order, OrderItemRow, OrderStatus } from './queries/orders'

export {
  getTables,
  createTable,
  updateTable,
  toggleTableActive,
  banTable,
  unbanTable,
  deleteTable,
  generateTableQR,
  callWaiter,
} from './queries/tables'

export {
  getWaiters,
  createWaiter,
  updateWaiter,
  toggleWaiterActive,
  deleteWaiter,
  authenticateWaiter,
} from './queries/waiters'
export type { Waiter, WaiterPublic } from './queries/waiters'

export { getBarConfig, updateBarConfig, updateBarProfile } from './queries/bar'
export type { BarConfig, BarProfile } from './queries/bar'

export { getActivityLog, addLogEntry } from './queries/log'
export type { ActivityLogEntry } from './queries/log'

export { makeNotification, HIGH_BID_THRESHOLD } from './queries/notifications'
export type { AdminNotification, NotificationKind } from './queries/notifications'

export { getAds, createAd, updateAd, deleteAd, toggleAdActive, reorderAds } from './queries/ads'

export { getFavorites, addFavorite, removeFavorite, toggleFavorite } from './queries/favorites'
export type { FavoriteSong } from './queries/favorites'

export { getGenres, getGenreWithSongs, addSongToGenre, removeSongFromGenre, createGenre, deleteGenre } from './queries/genres'
export type { GenreWithSongs } from './queries/genres'

export { getPlayedSongs, getBlockedSongs, vetarCancion, adminAddToQueue } from './queries/history'
export type { PlayedSong, BlockedSong } from './queries/history'

export {
  getBarStats,
  getStatsByPeriod,
  recordDailyStats,
  getTopSongs,
  getGlobalTopSongs,
  getGlobalBarRanking,
} from './queries/stats'
export type { BarStatsSummary, TopSong, GlobalBarRanking, DateRange } from './queries/stats'

// ── Services ──────────────────────────────────────────────────────────────────
export { searchSongs, getVideoDetails, clearYoutubeCache } from './services/youtube'
export type { YoutubeSongResult, YoutubeVideoDetails } from './services/youtube'

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useAdmin } from './hooks/useAdmin'
export type { AdminState } from './hooks/useAdmin'

export { useTable } from './hooks/useTable'
export type { TableState } from './hooks/useTable'

export { useTV } from './hooks/useTV'
export type { TVState } from './hooks/useTV'

export { useQueue } from './hooks/useQueue'
export type { QueueState } from './hooks/useQueue'

export { useQueueActions } from './hooks/useQueueActions'
export type { QueueActions, QueueActionsState } from './hooks/useQueueActions'

export { useChat, ALLOWED_REACTIONS } from './hooks/useChat'
export type { UseChatReturn, ReactionBroadcastPayload, Reaction } from './hooks/useChat'

export { useVoting } from './hooks/useVoting'
export type { UseVotingReturn } from './hooks/useVoting'

export { useCredits } from './hooks/useCredits'
export type { UseCreditsReturn } from './hooks/useCredits'

export { useMenu } from './hooks/useMenu'
export type { UseMenuReturn } from './hooks/useMenu'

export { useCart } from './hooks/useCart'
export type { UseCartReturn, CartItem } from './hooks/useCart'

export { useOrders } from './hooks/useOrders'
export type { UseOrdersReturn } from './hooks/useOrders'

export { useTables } from './hooks/useTables'
export type { UseTablesReturn } from './hooks/useTables'

export { useWaiters } from './hooks/useWaiters'
export type { UseWaitersReturn } from './hooks/useWaiters'

export { useAdminNotifications } from './hooks/useAdminNotifications'
export type { UseAdminNotificationsReturn } from './hooks/useAdminNotifications'

export { useYouTubeSearch } from './hooks/useYouTubeSearch'
export type { UseYouTubeSearchReturn } from './hooks/useYouTubeSearch'

export { useAdRotation } from './hooks/useAdRotation'
export type { UseAdRotationReturn } from './hooks/useAdRotation'

// ── Realtime ──────────────────────────────────────────────────────────────────
export {
  // Individual hooks
  useQueueRealtime,
  useChatRealtime,
  useVotesRealtime,
  useTablesRealtime,
  useOrdersRealtime,
  useAdsRealtime,
  useBroadcast,
  // Master hook
  useBarRealtime,
  // Provider
  RealtimeProvider,
  useRealtime,
} from './realtime'
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
  QueueRealtimeState,
  ChatRealtimeState,
  VotesRealtimeState,
  TablesRealtimeState,
  OrdersRealtimeState,
  AdsRealtimeState,
  BroadcastState,
  BroadcastActions,
  BarRealtimeState,
} from './realtime'
