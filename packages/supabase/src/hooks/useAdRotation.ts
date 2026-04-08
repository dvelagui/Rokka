'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getAds } from '../queries/ads'
import type { AdRow } from '../realtime/types'

/** Muestra un anuncio cada N canciones reproducidas */
const SONGS_PER_AD = 3
/** O cada N segundos aunque no haya llegado al límite de canciones */
const MAX_SECONDS_WITHOUT_AD = 2 * 60 // 2 minutos

/**
 * Intercala anuncios propios y de terceros en un patrón 2:1.
 * Ej: [own, own, 3rd, own, own, 3rd, ...]
 */
function buildRotationQueue(ads: AdRow[]): AdRow[] {
  const own      = ads.filter((a) => a.is_own)
  const external = ads.filter((a) => !a.is_own)
  if (external.length === 0) return own
  if (own.length === 0) return external

  const result: AdRow[] = []
  let o = 0, e = 0
  while (o < own.length || e < external.length) {
    if (o < own.length) result.push(own[o++])
    if (o < own.length) result.push(own[o++])
    if (e < external.length) result.push(external[e++])
  }
  return result
}

export interface UseAdRotationReturn {
  currentAd: AdRow | null
  isShowingAd: boolean
  /** Segundos restantes para que el anuncio se cierre automáticamente */
  countdown: number
  /** Cierra el anuncio manualmente */
  dismissAd: () => void
}

export function useAdRotation(barId: string | null): UseAdRotationReturn {
  const [ads, setAds] = useState<AdRow[]>([])
  const [currentAd, setCurrentAd] = useState<AdRow | null>(null)
  const [isShowingAd, setIsShowingAd] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Refs for mutable state that doesn't need re-renders
  const rotationRef      = useRef<AdRow[]>([])
  const adIndexRef       = useRef(0)
  const songCountRef     = useRef(0)
  const countdownTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeTimer        = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load ads ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!barId) return
    getAds(barId, true).then((data) => {
      setAds(data)
      rotationRef.current = buildRotationQueue(data)
    })
  }, [barId])

  // ── Rebuild rotation queue when ads change ─────────────────────────────────

  useEffect(() => {
    rotationRef.current = buildRotationQueue(ads)
  }, [ads])

  // ── Show next ad ───────────────────────────────────────────────────────────

  const showNextAd = useCallback(() => {
    const queue = rotationRef.current
    if (queue.length === 0) return

    const ad = queue[adIndexRef.current % queue.length]
    adIndexRef.current++
    songCountRef.current = 0

    // Clear any existing countdown
    if (countdownTimer.current) clearInterval(countdownTimer.current)

    setCurrentAd(ad)
    setIsShowingAd(true)
    setCountdown(ad.duration_seconds)

    // Tick countdown every second
    let remaining = ad.duration_seconds
    countdownTimer.current = setInterval(() => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownTimer.current!)
        setIsShowingAd(false)
        setCurrentAd(null)
        setCountdown(0)
      }
    }, 1_000)
  }, [])

  // ── Dismiss manually ───────────────────────────────────────────────────────

  const dismissAd = useCallback(() => {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    setIsShowingAd(false)
    setCurrentAd(null)
    setCountdown(0)
    songCountRef.current = 0
  }, [])

  // ── Time-based trigger ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!barId || rotationRef.current.length === 0) return

    timeTimer.current = setInterval(() => {
      if (!isShowingAd) showNextAd()
    }, MAX_SECONDS_WITHOUT_AD * 1_000)

    return () => {
      if (timeTimer.current) clearInterval(timeTimer.current)
    }
  }, [barId, isShowingAd, showNextAd])

  // ── Song-count trigger via Supabase realtime ───────────────────────────────

  useEffect(() => {
    if (!barId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`adRotation:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string }
          const old     = payload.old as { status: string }

          // Increment when a song transitions to 'played'
          if (updated.status === 'played' && old.status !== 'played') {
            songCountRef.current++
            if (songCountRef.current >= SONGS_PER_AD && !isShowingAd) {
              showNextAd()
            }
          }
        },
      )
      // Listen to ads changes and reload
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads',
          filter: `bar_id=eq.${barId}`,
        },
        () => {
          getAds(barId, true).then((data) => {
            setAds(data)
            rotationRef.current = buildRotationQueue(data)
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      if (countdownTimer.current) clearInterval(countdownTimer.current)
      if (timeTimer.current) clearInterval(timeTimer.current)
    }
  }, [barId, isShowingAd, showNextAd])

  return { currentAd, isShowingAd, countdown, dismissAd }
}
