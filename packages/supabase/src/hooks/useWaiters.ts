'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getWaiters,
  createWaiter,
  updateWaiter,
  toggleWaiterActive,
  deleteWaiter,
  type WaiterPublic,
} from '../queries/waiters'

export interface UseWaitersReturn {
  waiters: WaiterPublic[]
  isLoading: boolean
  error: string | null
  createWaiter: (data: { name: string; pin: string; phone?: string; shift?: string }) => Promise<WaiterPublic>
  updateWaiter: (waiterId: string, data: Partial<{ name: string; phone: string; shift: string }>) => Promise<void>
  toggleActive: (waiterId: string) => Promise<boolean>
  deleteWaiter: (waiterId: string) => Promise<void>
}

export function useWaiters(barId: string | null): UseWaitersReturn {
  const [waiters, setWaiters] = useState<WaiterPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWaiters = useCallback(async () => {
    if (!barId) return
    try {
      const data = await getWaiters(barId)
      setWaiters(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    fetchWaiters().finally(() => setIsLoading(false))
  }, [barId, fetchWaiters])

  const handleCreate = useCallback(
    async (data: { name: string; pin: string; phone?: string; shift?: string }) => {
      if (!barId) throw new Error('barId requerido')
      const waiter = await createWaiter(barId, data)
      setWaiters((prev) => [...prev, waiter].sort((a, b) => a.name.localeCompare(b.name)))
      return waiter
    },
    [barId],
  )

  const handleUpdate = useCallback(
    async (waiterId: string, data: Partial<{ name: string; phone: string; shift: string }>) => {
      await updateWaiter(waiterId, data)
      setWaiters((prev) =>
        prev.map((w) => (w.id === waiterId ? { ...w, ...data } : w)),
      )
    },
    [],
  )

  const handleToggleActive = useCallback(async (waiterId: string) => {
    const newValue = await toggleWaiterActive(waiterId)
    setWaiters((prev) =>
      prev.map((w) => (w.id === waiterId ? { ...w, is_active: newValue } : w)),
    )
    return newValue
  }, [])

  const handleDelete = useCallback(
    async (waiterId: string) => {
      if (!barId) throw new Error('barId requerido')
      await deleteWaiter(barId, waiterId)
      setWaiters((prev) => prev.filter((w) => w.id !== waiterId))
    },
    [barId],
  )

  return {
    waiters,
    isLoading,
    error,
    createWaiter: handleCreate,
    updateWaiter: handleUpdate,
    toggleActive: handleToggleActive,
    deleteWaiter: handleDelete,
  }
}
