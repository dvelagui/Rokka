'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  useTable,
  getSupabaseBrowserClient,
  getBarPublicInfo,
  clearTableSession,
} from '@rokka/supabase'
import type { TableSessionData } from '@rokka/supabase'
import { useInactivityTimeout } from '@/lib/use-inactivity-timeout'
import { InactivityWarning } from '@/components/InactivityWarning'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BarPublicInfo {
  id: string
  name: string
  emoji: string
  slug: string
  is_open: boolean
  config: {
    max_canciones_por_mesa: number
    avg_song_duration: number
    chat_habilitado?: boolean
    pedidos_habilitado?: boolean
    min_bid?: number
    auto_skip_threshold?: number
  }
}

export interface TableContextValue {
  table: (TableSessionData & { token: string }) | null
  bar: BarPublicInfo | null
  credits: number
  isLoading: boolean
  isBanned: boolean
  error: string | null
}

// Routes that skip session validation / redirect
const PUBLIC_ROUTES = ['/join', '/no-session']

// ── Context ───────────────────────────────────────────────────────────────────

const TableContext = createContext<TableContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function TableProvider({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { session, loading, error } = useTable()

  const [bar, setBar]                           = useState<BarPublicInfo | null>(null)
  const [credits, setCredits]                   = useState(0)
  const [midSessionBanned, setMidSessionBanned] = useState(false)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)

  // Sync credits from session (initial load) ───────────────────────────────
  useEffect(() => {
    if (session) setCredits(session.credits)
  }, [session])

  // Load public bar info ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.barId) return
    getBarPublicInfo(session.barId)
      .then((data) => data && setBar(data as BarPublicInfo))
      .catch(console.error)
  }, [session?.barId])

  // Realtime credits update via postgres_changes ────────────────────────────
  useEffect(() => {
    if (!session?.tableId) return
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`table-credits:${session.tableId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'tables',
          filter: `id=eq.${session.tableId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          if (typeof row.credits === 'number') setCredits(row.credits)
          if (row.is_banned === true) setMidSessionBanned(true)
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [session?.tableId])

  // Redirect unauthenticated users ──────────────────────────────────────────
  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
    if (!loading && !session && !isPublic) {
      router.replace('/no-session')
    }
  }, [loading, session, pathname, router])

  // Inactivity timeout ──────────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  const handleInactivityTimeout = useCallback(() => {
    setShowInactivityWarning(false)
    clearTableSession()
    router.replace('/no-session')
  }, [router])

  const handleInactivityWarning = useCallback(() => {
    setShowInactivityWarning(true)
  }, [])

  const handleInactivityResume = useCallback(() => {
    setShowInactivityWarning(false)
  }, [])

  useInactivityTimeout({
    enabled: !loading && !!session && !isPublicRoute,
    onTimeout: handleInactivityTimeout,
    onWarning: handleInactivityWarning,
    onResume:  handleInactivityResume,
  })

  return (
    <TableContext.Provider
      value={{
        table:     session,
        bar,
        credits,
        isLoading: loading,
        isBanned:  error === 'sesion_invalida' || midSessionBanned,
        error,
      }}
    >
      {children}
      {showInactivityWarning && (
        <InactivityWarning onContinue={handleInactivityResume} />
      )}
    </TableContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTableContext(): TableContextValue {
  const ctx = useContext(TableContext)
  if (!ctx) throw new Error('useTableContext must be inside <TableProvider>')
  return ctx
}
