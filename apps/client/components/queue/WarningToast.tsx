'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WarningToastProps {
  message:   string | null
  onDismiss: () => void
  /** Auto-dismiss delay in ms. Default: 4000 */
  delay?:    number
}

export function WarningToast({ message, onDismiss, delay = 4000 }: WarningToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, delay)
    return () => clearTimeout(t)
  }, [message, onDismiss, delay])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          // shake runs after entry
          onAnimationComplete={() => {
            const el = document.getElementById('warning-toast-inner')
            el?.classList.add('[animation:shake_0.45s_ease-in-out]')
          }}
          className="fixed top-4 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div
            id="warning-toast-inner"
            style={{ animation: 'shake 0.45s ease-in-out' }}
            className="flex items-center gap-2.5 bg-card border border-border
                       rounded-2xl px-4 py-3 shadow-xl pointer-events-auto max-w-sm w-full"
            onClick={onDismiss}
          >
            <p className="text-white text-sm leading-snug flex-1">{message}</p>
            <button className="text-white/30 text-xs shrink-0">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
