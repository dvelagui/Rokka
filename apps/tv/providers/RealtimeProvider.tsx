'use client'

import { createContext, useContext } from 'react'
import { useBarRealtime, type BarRealtimeState } from '@rokka/supabase'
import { useTVContext } from './TVProvider'
import type { ReactNode } from 'react'

const RealtimeContext = createContext<BarRealtimeState | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { barId } = useTVContext()
  const realtime = useBarRealtime(barId, 'tv')
  return (
    <RealtimeContext.Provider value={realtime}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useTVRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useTVRealtime must be inside RealtimeProvider')
  return ctx
}
