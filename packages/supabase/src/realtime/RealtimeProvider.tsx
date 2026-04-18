'use client'

import React, { createContext, useContext, type ReactNode } from 'react'
import { useBarRealtime } from './useBarRealtime'
import type { BarRealtimeState } from './useBarRealtime'
import type { RealtimeRole, ConnectionStatus } from './types'

// ── Context ───────────────────────────────────────────────────────────────────

const RealtimeContext = createContext<BarRealtimeState | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

interface RealtimeProviderProps {
  barId: string | null
  role: RealtimeRole
  children: ReactNode
}

export function RealtimeProvider({ barId, role, children }: RealtimeProviderProps) {
  const realtime = useBarRealtime(barId, role)

  return (
    <RealtimeContext.Provider value={realtime}>
      {children}
      <ConnectionIndicator status={realtime.connectionStatus} />
    </RealtimeContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtime(): BarRealtimeState {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    throw new Error('useRealtime must be used inside <RealtimeProvider>')
  }
  return ctx
}

// ── Indicator ─────────────────────────────────────────────────────────────────

interface ConnectionIndicatorProps {
  status: ConnectionStatus
}

function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  if (status === 'connected') return null

  const label =
    status === 'reconnecting'
      ? 'Reconectando...'
      : status === 'connecting'
        ? 'Conectando...'
        : 'Sin conexión'

  const bg =
    status === 'disconnected' ? 'bg-red-600' : 'bg-yellow-500'

  return (
    <div
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full
        text-white text-sm font-medium shadow-lg flex items-center gap-2 ${bg}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" />
      {label}
    </div>
  )
}
