'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { AdRow, ConnectionStatus } from './types'

export interface AdsRealtimeState {
  ads: AdRow[]
  isLoading: boolean
  status: ConnectionStatus
}

export function useAdsRealtime(barId: string | null): AdsRealtimeState {
  const [ads, setAds] = useState<AdRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const fetchAds = useCallback(async () => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('bar_id', barId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (!error && data) {
      setAds(data as AdRow[])
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      setStatus('disconnected')
      return
    }

    setIsLoading(true)
    fetchAds().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`ads-rt:${barId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ads', filter: `bar_id=eq.${barId}` },
        () => {
          // Always re-fetch on any change to maintain correct sort_order and active filter
          void fetchAds()
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
  }, [barId, fetchAds])

  return { ads, isLoading, status }
}
