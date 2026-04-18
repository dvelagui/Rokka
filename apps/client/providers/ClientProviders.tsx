'use client'

import { type ReactNode } from 'react'
import { RealtimeProvider } from '@rokka/supabase'
import { TableProvider, useTableContext } from './TableProvider'
import { ToastProvider } from './ToastProvider'

/**
 * Thin wrapper that reads barId from TableContext and passes it to
 * the package's RealtimeProvider — so Realtime only subscribes once
 * the table session is known.
 */
function RealtimeWrapper({ children }: { children: ReactNode }) {
  const { table } = useTableContext()
  return (
    <RealtimeProvider barId={table?.barId ?? null} role="client">
      {children}
    </RealtimeProvider>
  )
}

/** Root client-side provider tree for the client app. */
export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <TableProvider>
      <RealtimeWrapper>
        <ToastProvider>
          {children}
        </ToastProvider>
      </RealtimeWrapper>
    </TableProvider>
  )
}
