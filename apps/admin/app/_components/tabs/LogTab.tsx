'use client'

import { useState, useEffect, useRef } from 'react'
import { getActivityLog, getSupabaseBrowserClient } from '@rokka/supabase'
import type { ActivityLogEntry } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const ACTION_LABEL: Record<string, string> = {
  waiter_created:     'Mesero creado',
  waiter_updated:     'Mesero editado',
  ad_created:         'Anuncio creado',
  ad_updated:         'Anuncio editado',
  ad_deleted:         'Anuncio eliminado',
  config_updated:     'Configuración actualizada',
  recharge_confirmed: 'Recarga confirmada',
  order_updated:      'Pedido actualizado',
  song_vetoed:        'Canción vetada',
  table_banned:       'Mesa baneada',
  table_unbanned:     'Mesa desbaneada',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ')
}

function borderColor(action: string): string {
  if (action.includes('waiter'))                           return '#7C4DFF'
  if (action.includes('ad'))                              return '#FF6B00'
  if (action.includes('config'))                          return '#00E5FF'
  if (action.includes('recharge') || action.includes('order')) return '#00C853'
  if (action.includes('veto') || action.includes('block') || action.includes('ban')) return '#FF4B4B'
  return '#2a2a2a'
}

function fmtTimestamp(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${time}`
}

function toEntry(row: Omit<ActivityLogEntry, 'hora'>): ActivityLogEntry {
  return {
    ...row,
    hora: new Date(row.created_at).toLocaleTimeString('es', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }),
  }
}

// ── LogTab ────────────────────────────────────────────────────────────────────

export default function LogTab() {
  const { bar } = useAdminContext()
  const [entries,       setEntries]       = useState<ActivityLogEntry[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [hasMore,       setHasMore]       = useState(false)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const offsetRef = useRef(0)

  // Initial load
  useEffect(() => {
    if (!bar?.id) return
    setIsLoading(true)
    getActivityLog(bar.id, PAGE_SIZE, 0)
      .then((data) => {
        setEntries(data)
        setHasMore(data.length === PAGE_SIZE)
        offsetRef.current = data.length
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [bar?.id])

  // Realtime: prepend new entries as they arrive
  useEffect(() => {
    if (!bar?.id) return
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`log-${bar.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'activity_log',
          filter: `bar_id=eq.${bar.id}`,
        },
        (payload) => {
          const entry = toEntry(payload.new as Omit<ActivityLogEntry, 'hora'>)
          setEntries((prev) => [entry, ...prev])
          offsetRef.current += 1
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [bar?.id])

  async function loadMore() {
    if (!bar?.id) return
    setLoadingMore(true)
    try {
      const data = await getActivityLog(bar.id, PAGE_SIZE, offsetRef.current)
      setEntries((prev) => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      offsetRef.current += data.length
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <p className="text-xs text-white/30 mb-3">Registro de todos los movimientos del sistema</p>

      {isLoading ? (
        <p className="text-center text-white/20 text-xs py-8">Cargando log…</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-8">Sin movimientos registrados</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="bg-card border border-[#1e1e1e] rounded-xl px-3 py-2.5 flex items-start gap-3"
              style={{ borderLeftColor: borderColor(e.action), borderLeftWidth: '3px' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white leading-tight">
                  {actionLabel(e.action)}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5 truncate">
                  {e.actor}{e.detail ? ` · ${e.detail}` : ''}
                </p>
              </div>
              <p className="text-[10px] text-white/25 shrink-0 mt-0.5 tabular-nums whitespace-nowrap">
                {fmtTimestamp(e.created_at)}
              </p>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 mt-1 text-xs text-white/40 hover:text-white/70 border border-[#2a2a2a] rounded-xl transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
