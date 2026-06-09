'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredTVSession, getBarPublicInfo } from '@rokka/supabase'
import type { ReactNode } from 'react'

export interface BarPublic {
  id: string
  name: string
  emoji: string | null
  logo_url: string | null
  slug: string
  config?: Record<string, unknown>
}

interface TVContextValue {
  barId: string
  barSlug: string
  bar: BarPublic | null
  barConfig: Record<string, unknown> | null
  isLoading: boolean
}

const TVContext = createContext<TVContextValue | null>(null)

export function TVProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<TVContextValue>({
    barId: '',
    barSlug: '',
    bar: null,
    barConfig: null,
    isLoading: true,
  })

  useEffect(() => {
    const session = getStoredTVSession()
    if (!session) {
      router.replace('/setup')
      return
    }

    getBarPublicInfo(session.barId)
      .then((data) => {
        const bar = (data ?? null) as BarPublic | null
        setState({
          barId: session.barId,
          barSlug: session.barSlug,
          bar,
          barConfig: bar?.config ?? null,
          isLoading: false,
        })
      })
      .catch(() => {
        setState({
          barId: session.barId,
          barSlug: session.barSlug,
          bar: null,
          barConfig: null,
          isLoading: false,
        })
      })
  }, [router])

  if (state.isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="w-14 h-14 rounded-full border-[3px] border-rokka-fire border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!state.barId) return null

  return <TVContext.Provider value={state}>{children}</TVContext.Provider>
}

export function useTVContext() {
  const ctx = useContext(TVContext)
  if (!ctx) throw new Error('useTVContext must be inside TVProvider')
  return ctx
}
