'use client'

import { useState }          from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { useQueueActions }    from '@rokka/supabase'
import { formatCredits }      from '@rokka/shared'
import { useTableContext }     from '@/providers/TableProvider'

const QUICK_AMOUNTS = [500, 1_000, 2_000, 5_000]

// ── Confetti burst ─────────────────────────────────────────────────────────────

const CONFETTI_PARTICLES = [
  { x: -44, y: -60, rotate: -20, delay: 0    },
  { x: -18, y: -72, rotate:   8, delay: 0.04 },
  { x:  18, y: -68, rotate:  -8, delay: 0.02 },
  { x:  44, y: -60, rotate:  20, delay: 0.06 },
] as const

function BidConfetti() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {CONFETTI_PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, x: 0, opacity: 1, scale: 0.8 }}
          animate={{ y: p.y, x: p.x, opacity: 0, scale: 1.6, rotate: p.rotate }}
          transition={{ duration: 0.65, delay: p.delay, ease: 'easeOut' }}
          className="absolute text-2xl select-none"
        >
          🔥
        </motion.span>
      ))}
    </div>
  )
}

export interface BidModalProps {
  song:    QueueItemWithVotes
  onClose: () => void
}

export function BidModal({ song, onClose }: BidModalProps) {
  const { table, bar, credits } = useTableContext()
  const { bidOnSong, isLoading } = useQueueActions()

  const minBid   = bar?.config?.min_bid ?? 500
  const [custom, setCustom]       = useState('')
  const [selected, setSelected]   = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const amount = selected ?? (custom ? parseInt(custom, 10) : NaN)
  const isValid = !isNaN(amount) && amount >= minBid && amount <= (credits ?? 0)

  const handleQuick = (value: number) => {
    setSelected(value)
    setCustom('')
  }

  const handleCustom = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    setCustom(digits)
    setSelected(null)
  }

  const handleBid = async () => {
    if (!isValid || !table) return
    try {
      await bidOnSong({
        queueId: song.id,
        barId:   table.barId,
        tableId: table.tableId,
        amount,
      })
      setShowConfetti(true)
      setTimeout(onClose, 800)
    } catch {
      // error surfaced by useQueueActions internally
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{   opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.93] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{   scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-[320px] bg-card border border-border rounded-2xl p-5 space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti burst on bid success */}
        <AnimatePresence>
          {showConfetti && <BidConfetti key="confetti" />}
        </AnimatePresence>
        {/* Header */}
        <div className="space-y-0.5 text-center">
          <p className="text-white font-extrabold text-sm">¿Cuánto quieres pujar?</p>
          <p className="text-white/40 text-[11px] line-clamp-1">
            {song.title} · Tienes {formatCredits(credits ?? 0)}
          </p>
        </div>

        {/* Refund info */}
        <div className="bg-rokka-cyan/10 border border-rokka-cyan/25 rounded-xl px-3 py-2">
          <p className="text-rokka-cyan text-[10px] leading-relaxed">
            Si la canción es saltada, tu puja se devuelve automáticamente.
          </p>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_AMOUNTS.map((value) => {
            const canAfford = (credits ?? 0) >= value
            const isActive  = selected === value
            return (
              <button
                key={value}
                disabled={!canAfford}
                onClick={() => handleQuick(value)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all active:scale-95
                  ${isActive
                    ? 'bg-rokka-purple/20 border-rokka-purple text-rokka-purple'
                    : canAfford
                      ? 'bg-card2 border-border text-white/70 hover:border-rokka-purple/40'
                      : 'bg-card2 border-border text-white/20 opacity-40 cursor-not-allowed'
                  }`}
              >
                {formatCredits(value)}
              </button>
            )
          })}
        </div>

        {/* Custom amount */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={custom}
            onChange={(e) => handleCustom(e.target.value)}
            placeholder={`Monto personalizado (mín. ${formatCredits(minBid)})`}
            className="w-full bg-card2 border border-border rounded-xl pl-6 pr-3 py-2.5
                       text-xs text-white placeholder-white/20 outline-none
                       focus:border-rokka-purple/40 transition-colors"
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleBid}
          disabled={!isValid || isLoading}
          className="w-full py-3 rounded-xl bg-rokka-purple/15 border border-rokka-purple/40
                     text-rokka-purple font-bold text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed
                     active:scale-95 transition-transform
                     flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 rounded-full border-2 border-rokka-purple/40 border-t-rokka-purple animate-spin" />
          ) : (
            `Pujar ${isValid ? formatCredits(amount) : ''}`
          )}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-card2 border border-border
                     text-white/40 text-xs font-medium
                     active:scale-95 transition-transform"
        >
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  )
}
