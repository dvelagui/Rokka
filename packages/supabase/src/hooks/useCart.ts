'use client'

import { useState, useCallback, useMemo } from 'react'
import { createOrder, type Order } from '../queries/orders'
import type { MenuItem } from '../queries/menu'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  item: MenuItem
  qty: number
}

export interface UseCartReturn {
  items: CartItem[]
  total: number
  itemCount: number
  isLoading: boolean
  error: string | null

  addItem: (item: MenuItem) => void
  removeItem: (itemId: string) => void
  updateQty: (itemId: string, qty: number) => void
  clearCart: () => void

  /**
   * Envía el pedido al servidor.
   * Requiere `barId` y `token` de sesión de la mesa.
   * Vacía el carrito si el pedido se crea con éxito.
   */
  checkout: (barId: string, token: string) => Promise<Order>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c,
        )
      }
      return [...prev, { item, qty: 1 }]
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((c) => c.item.id !== itemId))
  }, [])

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((c) => c.item.id !== itemId))
    } else {
      setItems((prev) =>
        prev.map((c) => (c.item.id === itemId ? { ...c, qty } : c)),
      )
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setError(null)
  }, [])

  const checkout = useCallback(
    async (barId: string, token: string): Promise<Order> => {
      if (items.length === 0) throw new Error('El carrito está vacío')
      setIsLoading(true)
      setError(null)
      try {
        const order = await createOrder(
          barId,
          token,
          items.map((c) => ({ itemId: c.item.id, qty: c.qty })),
        )
        setItems([])
        return order
      } catch (e) {
        const msg = (e as Error).message
        setError(msg)
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [items],
  )

  const total = useMemo(
    () => items.reduce((sum, c) => sum + c.item.price * c.qty, 0),
    [items],
  )

  const itemCount = useMemo(
    () => items.reduce((sum, c) => sum + c.qty, 0),
    [items],
  )

  return {
    items,
    total,
    itemCount,
    isLoading,
    error,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    checkout,
  }
}
