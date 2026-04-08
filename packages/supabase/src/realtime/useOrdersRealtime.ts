'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { OrderRow, ConnectionStatus } from './types'

export interface OrdersRealtimeState {
  orders: OrderRow[]
  newOrderIds: Set<string>
  isLoading: boolean
  status: ConnectionStatus
}

export function useOrdersRealtime(barId: string | null): OrdersRealtimeState {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const fetchOrders = useCallback(async () => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('bar_id', barId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .order('created_at', { ascending: false })
    if (!error && data) {
      setOrders(data as OrderRow[])
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      setStatus('disconnected')
      return
    }

    setIsLoading(true)
    fetchOrders().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`orders-rt:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const newOrder = payload.new as OrderRow
          setOrders((prev) => [newOrder, ...prev])
          setNewOrderIds((prev) => new Set([...prev, newOrder.id]))
          // Auto-clear "new" badge after 10s
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev)
              next.delete(newOrder.id)
              return next
            })
          }, 10_000)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const updated = payload.new as OrderRow
          // Remove from active list if delivered/cancelled
          if (updated.status === 'delivered' || updated.status === 'cancelled') {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id))
          } else {
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o)),
            )
          }
        },
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('connected')
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('reconnecting')
        else if (s === 'CLOSED') setStatus('disconnected')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, fetchOrders])

  return { orders, newOrderIds, isLoading, status }
}
