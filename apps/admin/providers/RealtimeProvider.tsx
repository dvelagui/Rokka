'use client'

import type { ReactNode } from 'react'
import { RealtimeProvider as BaseRealtimeProvider } from '@rokka/supabase'
import { useAdminContext } from './AdminProvider'

export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  const { bar } = useAdminContext()
  return (
    <BaseRealtimeProvider barId={bar?.id ?? null} role="admin">
      {children}
    </BaseRealtimeProvider>
  )
}
