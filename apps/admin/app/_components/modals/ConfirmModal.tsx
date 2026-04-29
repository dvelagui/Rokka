'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = 'danger' | 'warning' | 'info'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  variant?: Variant
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VARIANT: Record<Variant, { icon: string; btnCls: string }> = {
  danger:  { icon: '🗑',  btnCls: 'bg-rokka-red   text-white hover:bg-rokka-red/80'   },
  warning: { icon: '⚠️', btnCls: 'bg-orange-500   text-white hover:bg-orange-400'    },
  info:    { icon: 'ℹ️', btnCls: 'bg-rokka-cyan   text-black hover:bg-rokka-cyan/80' },
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  onConfirm,
  variant     = 'danger',
}: Props) {
  const [running, setRunning] = useState(false)
  const { icon, btnCls } = VARIANT[variant]

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  async function handleConfirm() {
    setRunning(true)
    try { await onConfirm() } finally { setRunning(false) }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/[0.93] flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#111] border border-[#2a2a2a] rounded-[14px] w-full max-w-[370px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0a0a0a] flex items-center justify-between px-4 py-3.5">
              <p className="text-sm font-bold text-white">
                <span className="mr-2">{icon}</span>
                {title}
              </p>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-4 pt-3 pb-4 space-y-4">
              {message && (
                <p className="text-sm text-white/50">{message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={running}
                  className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white/80 transition-colors disabled:opacity-40"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={running}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${btnCls}`}
                >
                  {running ? '…' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
