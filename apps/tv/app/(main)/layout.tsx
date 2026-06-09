import type { ReactNode } from 'react'
import { TVProvider } from '../../providers/TVProvider'
import { RealtimeProvider } from '../../providers/RealtimeProvider'

/**
 * Shell layout for all routes inside (main).
 * Wraps children with TVProvider (auth check + bar data) and
 * RealtimeProvider (Supabase realtime channels for the TV role).
 *
 * Structure:
 *   flex-col h-screen
 *     flex-1  ← video + content area (page renders here)
 *     [fixed bottom bar is rendered by each page via its own markup]
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <TVProvider>
      <RealtimeProvider>
        <div className="w-screen h-screen bg-black overflow-hidden flex flex-col">
          {children}
        </div>
      </RealtimeProvider>
    </TVProvider>
  )
}
