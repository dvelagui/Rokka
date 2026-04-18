'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastVariant = 'warning' | 'refund'

interface WarningToastProps {
  message:   string | null
  onDismiss: () => void
  variant?:  ToastVariant
  /** Auto-dismiss delay in ms. Default: 4000 for warning, 6000 for refund */
  delay?:    number
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  warning: 'bg-rokka-red/10 border-rokka-red/30 shadow-[0_4px_24px_rgba(255,23,68,0.18)]',
  refund:  'bg-rokka-green/10 border-rokka-green/30 shadow-[0_4px_24px_rgba(0,230,118,0.18)]',
}

const VARIANT_TEXT: Record<ToastVariant, string> = {
  warning: 'text-white',
  refund:  'text-rokka-green',
}

const DEFAULT_DELAY: Record<ToastVariant, number> = {
  warning: 4000,
  refund:  6000,
}

const VARIANT_ANIMATION: Record<ToastVariant, string> = {
  warning: 'shake 0.3s ease-out',
  refund:  'refund-bounce 5s ease-in-out forwards',
}

export function WarningToast({
  message,
  onDismiss,
  variant = 'warning',
  delay,
}: WarningToastProps) {
  const dismissDelay = delay ?? DEFAULT_DELAY[variant]

  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, dismissDelay)
    return () => clearTimeout(t)
  }, [message, onDismiss, dismissDelay])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-[66px] left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div
            style={{ animation: VARIANT_ANIMATION[variant] }}
            className={`flex items-center gap-2.5 border rounded-[10px] px-4 py-3
                        pointer-events-auto max-w-[90%] text-center ${VARIANT_STYLES[variant]}`}
            onClick={onDismiss}
          >
            <p className={`text-sm leading-snug flex-1 ${VARIANT_TEXT[variant]}`}>
              {message}
            </p>
            <button className="text-white/30 text-xs shrink-0">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
