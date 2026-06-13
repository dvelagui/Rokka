'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getAds, recordAdImpression } from '../queries/ads'
import type { AdRow } from '../realtime/types'

/** Song-mode: show an ad every N songs played */
const SONGS_PER_AD = 3

/**
 * Intercala anuncios propios y de terceros en un patrón 2:1.
 * Ej: [own, own, 3rd, own, own, 3rd, ...]
 */
function buildRotationQueue(ads: AdRow[]): AdRow[] {
  const own = ads.filter((a) => a.is_own)
  const external = ads.filter((a) => !a.is_own)
  if (external.length === 0) return own
  if (own.length === 0) return external

  const result: AdRow[] = []
  let o = 0,
    e = 0
  while (o < own.length || e < external.length) {
    if (o < own.length) result.push(own[o++])
    if (o < own.length) result.push(own[o++])
    if (e < external.length) result.push(external[e++])
  }
  return result
}

export interface UseAdRotationOptions {
  /**
   * 'song' (default) — trigger after every N songs (client app).
   * 'time'           — trigger on a fixed timer (TV screen).
   */
  mode?: 'song' | 'time'
  /** Seconds before the first ad appears in time mode. Default: 5. */
  initialDelaySec?: number
  /** Seconds between ads in time mode (starts counting after previous ad ends). Default: 30. */
  intervalSec?: number
  /** App showing the ad — recorded with each impression for reporting. */
  source: 'tv' | 'client'
}

export interface UseAdRotationReturn {
  currentAd: AdRow | null
  isShowingAd: boolean
  /** Seconds remaining until the ad auto-closes */
  countdown: number
  /** Close the current ad manually */
  dismissAd: () => void
  /** Show the next ad in the rotation immediately */
  triggerAd: () => void
}

export function useAdRotation(
  barId: string | null,
  opts: UseAdRotationOptions,
): UseAdRotationReturn {
  const mode = opts.mode ?? 'song'
  const initialDelayMs = (opts.initialDelaySec ?? 5) * 1_000
  const intervalMs = (opts.intervalSec ?? 30) * 1_000
  const source = opts.source

  const [ads, setAds] = useState<AdRow[]>([])
  const [currentAd, setCurrentAd] = useState<AdRow | null>(null)
  const [isShowingAd, setIsShowingAd] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Refs for mutable state that doesn't trigger re-renders
  const rotationRef = useRef<AdRow[]>([])
  const adIndexRef = useRef(0)
  const songCountRef = useRef(0)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set to true once the first ad has been shown (time mode gate)
  const hasFirstShownRef = useRef(false)
  // Set to true once the initial setTimeout has been queued (prevents double-scheduling)
  const isFirstScheduledRef = useRef(false)

  // Keep intervalMs fresh for the "schedule next" effect without recreating showNextAd
  const intervalMsRef = useRef(intervalMs)
  useEffect(() => {
    intervalMsRef.current = intervalMs
  }, [intervalMs])

  // ── Load ads ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!barId) return
    getAds(barId, true)
      .then((data) => {
        setAds(data)
        rotationRef.current = buildRotationQueue(data)
      })
      .catch((err) => console.error('useAdRotation: error loading ads', err))
  }, [barId])

  // ── Rebuild rotation queue when ads change ────────────────────────────────────

  useEffect(() => {
    rotationRef.current = buildRotationQueue(ads)
  }, [ads])

  // ── Show next ad ──────────────────────────────────────────────────────────────

  const showNextAd = useCallback(() => {
    const queue = rotationRef.current
    if (queue.length === 0) return

    // Clear any pending schedule timer
    if (scheduleRef.current) {
      clearTimeout(scheduleRef.current)
      scheduleRef.current = null
    }

    const ad = queue[adIndexRef.current % queue.length]
    adIndexRef.current++
    songCountRef.current = 0
    hasFirstShownRef.current = true

    if (countdownTimer.current) clearInterval(countdownTimer.current)

    setCurrentAd(ad)
    setIsShowingAd(true)
    setCountdown(ad.duration_seconds)
    recordAdImpression(ad.id, source).catch(() => {})

    let remaining = ad.duration_seconds
    countdownTimer.current = setInterval(() => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownTimer.current!)
        countdownTimer.current = null
        setIsShowingAd(false)
        setCurrentAd(null)
        setCountdown(0)
      }
    }, 1_000)
  }, [source])

  // ── Dismiss manually ──────────────────────────────────────────────────────────

  const dismissAd = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }
    setIsShowingAd(false)
    setCurrentAd(null)
    setCountdown(0)
    songCountRef.current = 0
  }, [])

  // ── Time mode: schedule first ad when ads load ────────────────────────────────

  useEffect(() => {
    if (mode !== 'time') return
    if (ads.length === 0) return
    if (isFirstScheduledRef.current) return

    isFirstScheduledRef.current = true
    scheduleRef.current = setTimeout(showNextAd, initialDelayMs)

    return () => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current)
        scheduleRef.current = null
      }
    }
  }, [mode, ads.length, initialDelayMs, showNextAd])

  // ── Time mode: schedule next ad after current one ends ────────────────────────

  useEffect(() => {
    if (mode !== 'time') return
    if (!hasFirstShownRef.current) return // wait until at least one ad has been shown
    if (isShowingAd) return               // ad is currently visible — do nothing
    if (ads.length === 0) return          // no ads to show

    scheduleRef.current = setTimeout(showNextAd, intervalMsRef.current)
    return () => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current)
        scheduleRef.current = null
      }
    }
  }, [mode, isShowingAd, ads.length, showNextAd])

  // ── Song mode: Supabase realtime listener ─────────────────────────────────────

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
          if (mode !== 'song') return // time mode has its own trigger
          const updated = payload.new as { status: string }
          const old = payload.old as { status: string }

          if (updated.status === 'played' && old.status !== 'played') {
            songCountRef.current++
            if (songCountRef.current >= SONGS_PER_AD && !isShowingAd) {
              showNextAd()
            }
          }
        },
      )
      // Always listen for ad changes and refresh rotation queue
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads',
          filter: `bar_id=eq.${barId}`,
        },
        () => {
          getAds(barId, true)
            .then((data) => {
              setAds(data)
              rotationRef.current = buildRotationQueue(data)
            })
            .catch((err) => console.error('useAdRotation: error reloading ads', err))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, mode, isShowingAd, showNextAd])

  // ── Cleanup timers on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current)
      if (scheduleRef.current) clearTimeout(scheduleRef.current)
    }
  }, [])

  return { currentAd, isShowingAd, countdown, dismissAd, triggerAd: showNextAd }
}
