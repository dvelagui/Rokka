'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAdmin, getBarConfig } from '@rokka/supabase'
import type { AdminState, BarProfile } from '@rokka/supabase'

interface AdminContextValue {
  admin: AdminState['user']
  bar: BarProfile | null
  barConfig: BarProfile['config'] | null
  isLoading: boolean
  refreshBar: () => Promise<void>
  /** Aplica cambios localmente sin re-fetch — evita lag de lectura tras escritura */
  updateBarLocal: (partial: Partial<BarProfile>) => void
  /** Estado de pausa compartido entre Header y QueueTab */
  isPaused: boolean
  togglePause: () => void
}

const AdminContext = createContext<AdminContextValue>({
  admin: null,
  bar: null,
  barConfig: null,
  isLoading: true,
  refreshBar: async () => {},
  updateBarLocal: () => {},
  isPaused: false,
  togglePause: () => {},
})

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, barId, loading } = useAdmin()
  const [bar, setBar]             = useState<BarProfile | null>(null)
  const [barLoading, setBarLoading] = useState(false)
  const [isPaused, setIsPaused]   = useState(false)

  const loadBar = useCallback(async (id: string) => {
    setBarLoading(true)
    try {
      const data = await getBarConfig(id)
      setBar(data)
    } catch {
      setBar(null)
    } finally {
      setBarLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!barId) { setBar(null); return }
    void loadBar(barId)
  }, [barId, loadBar])

  const refreshBar = useCallback(async () => {
    if (barId) await loadBar(barId)
  }, [barId, loadBar])

  const updateBarLocal = useCallback((partial: Partial<BarProfile>) => {
    setBar((prev) => (prev ? { ...prev, ...partial } : prev))
  }, [])

  const togglePause = useCallback(() => setIsPaused((p) => !p), [])

  return (
    <AdminContext.Provider value={{
      admin: user,
      bar,
      barConfig: bar?.config ?? null,
      isLoading: loading || barLoading,
      refreshBar,
      updateBarLocal,
      isPaused,
      togglePause,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext(): AdminContextValue {
  return useContext(AdminContext)
}
