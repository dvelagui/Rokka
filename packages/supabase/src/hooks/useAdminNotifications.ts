'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import {
  makeNotification,
  HIGH_BID_THRESHOLD,
  type AdminNotification,
} from '../queries/notifications'

export interface UseAdminNotificationsReturn {
  notifications: AdminNotification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
}

/** Máximo de notificaciones a mantener en memoria */
const MAX_NOTIFICATIONS = 50

export function useAdminNotifications(barId: string | null): UseAdminNotificationsReturn {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const channelsRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']>[]>([])

  const push = useCallback((n: AdminNotification) => {
    setNotifications((prev) =>
      [n, ...prev].slice(0, MAX_NOTIFICATIONS),
    )
  }, [])

  useEffect(() => {
    if (!barId) return

    const supabase = getSupabaseBrowserClient()

    // 1. Broadcast: mesa llamando
    const bcChannel = supabase
      .channel(`bar:${barId}:broadcast`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'table_call' }, ({ payload }) => {
        const { tableId, tableLabel } = payload as { tableId: string; tableLabel: string }
        push(makeNotification('table_call', `${tableLabel} está llamando al mesero`, { tableId }))
      })
      .subscribe()

    // 2. Órdenes nuevas
    const ordersChannel = supabase
      .channel(`admin-notif-orders:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const order = payload.new as { id: string; table_id: string; total: number }
          push(
            makeNotification(
              'new_order',
              `Nuevo pedido por $${order.total}`,
              { orderId: order.id, tableId: order.table_id },
            ),
          )
        },
      )
      .subscribe()

    // 3. Pujas altas en la cola
    const queueChannel = supabase
      .channel(`admin-notif-queue:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const item = payload.new as {
            id: string
            title: string
            bid_amount: number
            status: string
          }
          const old = payload.old as { bid_amount: number }
          if (
            item.status === 'queued' &&
            item.bid_amount >= HIGH_BID_THRESHOLD &&
            (old.bid_amount ?? 0) < HIGH_BID_THRESHOLD
          ) {
            push(
              makeNotification(
                'high_bid',
                `"${item.title}" tiene una puja de ${item.bid_amount} créditos`,
                { queueId: item.id, bidAmount: item.bid_amount },
              ),
            )
          }
        },
      )
      .subscribe()

    // 4. Activity log: autoban y skip por votación
    const logChannel = supabase
      .channel(`admin-notif-log:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const entry = payload.new as { action: string; detail: string; actor: string }

          if (entry.action === 'table_auto_banned') {
            push(makeNotification('auto_ban', entry.detail, { action: entry.action }))
          } else if (entry.action === 'song_voted_skip') {
            push(makeNotification('song_skipped', entry.detail, { action: entry.action }))
          }
        },
      )
      .subscribe()

    channelsRef.current = [bcChannel, ordersChannel, queueChannel, logChannel]

    return () => {
      channelsRef.current.forEach((ch) => { void supabase.removeChannel(ch) })
      channelsRef.current = []
    }
  }, [barId, push])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAsRead, markAllRead, dismiss }
}
