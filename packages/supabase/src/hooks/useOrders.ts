'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getOrders, getTableOrders, type Order, type OrderStatus } from '../queries/orders'

export interface UseOrdersReturn {
  orders: Order[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Suscripción realtime a órdenes.
 * - `tableId` definido → órdenes de esa mesa (para clientes)
 * - Sin `tableId` → todas las del bar (para admin), filtrables por `statusFilter`
 */
export function useOrders(
  barId: string | null,
  tableId?: string | null,
  statusFilter?: OrderStatus,
): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!barId) return
    try {
      let data: Order[]
      if (tableId) {
        data = await getTableOrders(tableId)
      } else {
        data = await getOrders(barId, statusFilter)
      }
      setOrders(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [barId, tableId, statusFilter])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchOrders().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`useOrders:${barId}:${tableId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order
          // Si hay filtro de mesa, ignorar órdenes de otras mesas
          if (tableId && newOrder.table_id !== tableId) return
          // Aplicar filtro de estado si existe
          if (statusFilter && newOrder.status !== statusFilter) return
          setOrders((prev) => [newOrder, ...prev])
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
          const updated = payload.new as Order
          if (tableId && updated.table_id !== tableId) return

          setOrders((prev) => {
            // Si el status actualizado no coincide con el filtro, eliminar del listado
            if (statusFilter && updated.status !== statusFilter) {
              return prev.filter((o) => o.id !== updated.id)
            }
            return prev.map((o) => (o.id === updated.id ? updated : o))
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, tableId, statusFilter, fetchOrders])

  return { orders, isLoading, error, refresh: fetchOrders }
}
