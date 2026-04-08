// ── Tipos de notificaciones en memoria (no se persisten en DB) ────────────────

export type NotificationKind =
  | 'table_call'     // Mesa llamando al mesero
  | 'new_order'      // Nuevo pedido recibido
  | 'high_bid'       // Puja alta en la cola
  | 'auto_ban'       // Mesa baneada automáticamente (groserías)
  | 'song_skipped'   // Canción saltada por votación popular

export interface AdminNotification {
  id: string
  kind: NotificationKind
  title: string
  message: string
  read: boolean
  createdAt: Date
  /** Datos adicionales según el tipo */
  data?: Record<string, unknown>
}

/** Umbral de créditos para considerar una puja "alta" */
export const HIGH_BID_THRESHOLD = 100

/** Helpers para construir notificaciones con título/mensaje consistente */
export function makeNotification(
  kind: NotificationKind,
  message: string,
  data?: Record<string, unknown>,
): AdminNotification {
  const titles: Record<NotificationKind, string> = {
    table_call:   '📣 Mesa llamando',
    new_order:    '🛎️ Nuevo pedido',
    high_bid:     '💰 Puja alta',
    auto_ban:     '🚫 Mesa silenciada',
    song_skipped: '⏭️ Canción saltada',
  }
  return {
    id:        crypto.randomUUID(),
    kind,
    title:     titles[kind],
    message,
    read:      false,
    createdAt: new Date(),
    data,
  }
}
