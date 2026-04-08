'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getTables } from '../queries/tables'
import type { TableRow } from '../realtime/types'

export interface UseTablesReturn {
  tables: TableRow[]
  /** Mesas activas y no baneadas */
  activeTables: TableRow[]
  /** Mesas que han llamado al mesero en esta sesión (via broadcast) */
  callingTables: Set<string>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Limpia la bandera "llamando" de una mesa */
  clearCall: (tableId: string) => void
}

export function useTables(barId: string | null): UseTablesReturn {
  const [tables, setTables] = useState<TableRow[]>([])
  const [callingTables, setCallingTables] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    if (!barId) return
    try {
      const data = await getTables(barId)
      setTables(data)
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
    fetchTables().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    // Postgres changes para cambios en el estado de las mesas
    const pgChannel = supabase
      .channel(`useTables:${barId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setTables((prev) => prev.filter((t) => t.id !== deleted.id))
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as TableRow
            setTables((prev) =>
              [...prev, inserted].sort((a, b) => a.number - b.number),
            )
          } else {
            const updated = payload.new as TableRow
            setTables((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          }
        },
      )
      .subscribe()

    // Broadcast: escuchar llamadas de mesero
    const bcChannel = supabase
      .channel(`bar:${barId}:broadcast`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'table_call' }, ({ payload }) => {
        const { tableId } = payload as { tableId: string }
        setCallingTables((prev) => new Set([...prev, tableId]))
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(pgChannel)
      void supabase.removeChannel(bcChannel)
    }
  }, [barId, fetchTables])

  const clearCall = useCallback((tableId: string) => {
    setCallingTables((prev) => {
      const next = new Set(prev)
      next.delete(tableId)
      return next
    })
  }, [])

  const activeTables = tables.filter((t) => t.is_active && !t.is_banned)

  return {
    tables,
    activeTables,
    callingTables,
    isLoading,
    error,
    refresh: fetchTables,
    clearCall,
  }
}
