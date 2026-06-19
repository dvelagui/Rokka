'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { INACTIVITY_WARNING_MS } from '@/lib/use-inactivity-timeout'

const WARNING_SECONDS = Math.round(INACTIVITY_WARNING_MS / 1_000)

interface InactivityWarningProps {
  onContinue: () => void
}

export function InactivityWarning({ onContinue }: InactivityWarningProps) {
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1_000)
    return () => clearInterval(interval)
  }, [])

  const progress = secondsLeft / WARNING_SECONDS

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 text-center space-y-4"
      >
        {/* Countdown ring */}
        <div className="relative mx-auto w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff10" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl">
            😴
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-white font-semibold text-base">¿Sigues aquí?</p>
          <p className="text-white/50 text-sm">
            La sesión se cerrará en{' '}
            <span className="text-white font-mono font-bold tabular-nums">
              {secondsLeft}s
            </span>
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 rounded-2xl bg-rokka-cyan text-black font-bold text-sm
                     hover:bg-rokka-cyan/80 active:scale-95 transition-all"
        >
          Continuar sesión
        </button>
      </motion.div>
    </div>
  )
}
