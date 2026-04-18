'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdRotation } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'

const INITIAL_DELAY_MS  = 10_000   // primer anuncio a los 10s
const INTERVAL_MS       = 90_000   // luego cada 90s

export function AdPopup() {
  const { bar }                                            = useTableContext()
  const { currentAd, isShowingAd, countdown, dismissAd, triggerAd } =
    useAdRotation(bar?.id ?? null)

  const initialFired = useRef(false)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Initial 10s trigger + 90s interval ──────────────────────────────────

  useEffect(() => {
    if (!bar?.id) return

    // First ad after 10s
    const initialTimer = setTimeout(() => {
      if (!initialFired.current) {
        initialFired.current = true
        triggerAd()
      }

      // Subsequent ads every 90s
      intervalRef.current = setInterval(() => {
        if (!isShowingAd) triggerAd()
      }, INTERVAL_MS)
    }, INITIAL_DELAY_MS)

    return () => {
      clearTimeout(initialTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar?.id])

  // Clear interval while an ad is showing so the next one starts
  // INTERVAL_MS after the previous one closes, not from a fixed clock.
  useEffect(() => {
    if (isShowingAd) {
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else if (initialFired.current) {
      intervalRef.current = setInterval(() => {
        triggerAd()
      }, INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isShowingAd, triggerAd])

  if (!currentAd) return null

  const borderColor = `${currentAd.color}42`   // 26% opacity hex
  const bgGradient  = `linear-gradient(160deg, ${currentAd.color}14 0%, #111111 60%)`

  return (
    <AnimatePresence>
      {isShowingAd && (
        <>
          {/* Overlay */}
          <motion.div
            key="ad-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70"
            onClick={dismissAd}
          />

          {/* Card */}
          <motion.div
            key="ad-card"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{   y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed left-4 right-4 z-50"
            style={{ bottom: 70 }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                background:   bgGradient,
                border:       `1px solid ${borderColor}`,
                borderRadius: '16px 16px 11px 11px',
              }}
            >
              {/* Close button */}
              <button
                onClick={dismissAd}
                className="absolute top-3 right-3 text-white/40 text-sm w-7 h-7
                           flex items-center justify-center rounded-full
                           hover:bg-white/10 active:bg-white/20 transition-colors z-10"
              >
                ✕
              </button>

              {/* Content */}
              <div className="px-4 pt-4 pb-5 flex items-start gap-3">
                <span className="text-[28px] leading-none shrink-0 mt-0.5">
                  {currentAd.emoji}
                </span>
                <div className="flex-1 min-w-0 pr-6">
                  <p
                    className="font-bold text-sm leading-snug"
                    style={{ color: currentAd.color }}
                  >
                    {currentAd.title}
                  </p>
                  {currentAd.subtitle && (
                    <p className="text-white/50 text-[11px] mt-0.5 leading-snug">
                      {currentAd.subtitle}
                    </p>
                  )}
                  {!currentAd.is_own && currentAd.company_name && (
                    <p className="text-white/25 text-[10px] mt-1">
                      {currentAd.company_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Countdown bar */}
              <div className="h-0.5 bg-white/5">
                <motion.div
                  className="h-full"
                  style={{ background: currentAd.color }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: currentAd.duration_seconds,
                    ease: 'linear',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
