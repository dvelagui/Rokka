'use client'

import { useEffect, useState, useCallback } from 'react'
import { getMenu, type MenuCategory } from '../queries/menu'

export interface UseMenuReturn {
  categories: MenuCategory[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useMenu(barId: string | null, adminView = false): UseMenuReturn {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMenu = useCallback(async () => {
    if (!barId) return
    try {
      const data = await getMenu(barId, adminView)
      setCategories(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [barId, adminView])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    fetchMenu().finally(() => setIsLoading(false))
  }, [barId, fetchMenu])

  return { categories, isLoading, error, refresh: fetchMenu }
}
