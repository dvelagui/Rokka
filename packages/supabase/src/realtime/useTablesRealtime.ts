'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { TableRow, TableEvent, ConnectionStatus } from './types'

export interface TablesRealtimeState {
  tables: TableRow[]
  lastEvent: TableEvent | null
  isLoading: boolean
  status: ConnectionStatus
}

export function useTablesRealtime(barId: string | null): TablesRealtimeState {
  const [tables, setTables] = useState<TableRow[]>([])
  const [lastEvent, setLastEvent] = useState<TableEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const fetchTables = useCallback(async () => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('bar_id', barId)
      .order('number', { ascending: true })
    if (!error && data) {
      setTables(data as TableRow[])
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      setStatus('disconnected')
      return
    }

    setIsLoading(true)
    fetchTables().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`tables-rt:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const updated = payload.new as TableRow
          const old = payload.old as Partial<TableRow>

          setTables((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t)),
          )

          // Detect specific change types
          if (!old.connected_at && updated.connected_at) {
            setLastEvent({ type: 'table_connected', tableId: updated.id })
          } else if (old.connected_at && !updated.connected_at) {
            setLastEvent({ type: 'table_disconnected', tableId: updated.id })
          } else if (old.credits !== updated.credits) {
            setLastEvent({
              type: 'credits_updated',
              tableId: updated.id,
              credits: updated.credits,
            })
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
  }, [barId, fetchTables])

  return { tables, lastEvent, isLoading, status }
}
