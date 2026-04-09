'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoting, getSupabaseBrowserClient } from '@rokka/supabase'
import { useRealtime } from '@rokka/supabase'
import { formatCredits } from '@rokka/shared'

// ── Types ──────────────────────────────────────────────────────────────────────

interface VotingSectionProps {
  currentQueueId: string
  barId:          string
  tableId:        string
}

interface RefundToast {
  id:     string
  amount: number
}

// ── Refund toast ───────────────────────────────────────────────────────────────

function RefundToast({ amount, onDismiss }: { amount: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, scale: 0.95 }}
      animate={{ y: 0,   opacity: 1, scale: 1 }}
      exit={{   y: -60, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div
        className="flex items-center gap-2.5 bg-rokka-green/15 border border-rokka-green/40
                   rounded-2xl px-4 py-3 shadow-lg pointer-events-auto max-w-sm w-full"
        onClick={onDismiss}
      >
        <span className="text-xl shrink-0">💰</span>
        <p className="text-rokka-green text-sm font-semibold leading-snug">
          ¡Canción saltada por votación!{' '}
          <span className="font-black">Se te devolvieron {formatCredits(amount)}.</span>
        </p>
      </div>
    </motion.div>
  )
}

// ── VotingSection ──────────────────────────────────────────────────────────────

export function VotingSection({ currentQueueId, barId, tableId }: VotingSectionProps) {
  const voting           = useVoting(currentQueueId, barId, tableId)
  const { queue }        = useRealtime()

  const [skipping, setSkipping]          = useState(false)
  const [refundToast, setRefundToast]    = useState<RefundToast | null>(null)
  const [activeTables, setActiveTables]  = useState(0)
  const [casting, setCasting]            = useState(false)
  const prevQueueIdRef                   = useRef(currentQueueId)

  // ── Active tables count ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('tables')
      .select('id', { count: 'exact', head: true })
      .eq('bar_id', barId)
      .eq('is_active', true)
      .eq('is_banned', false)
      .then(({ count }) => { if (count != null) setActiveTables(count) })
  }, [barId])

  // ── Detect skip via realtime lastEvent ───────────────────────────────────
  useEffect(() => {
    if (queue.lastEvent?.type === 'song_skipped') {
      setSkipping(true)
      const t = setTimeout(() => setSkipping(false), 3500)
      return () => clearTimeout(t)
    }
  }, [queue.lastEvent])

  // ── Reset skipping when song changes ────────────────────────────────────
  useEffect(() => {
    if (prevQueueIdRef.current !== currentQueueId) {
      setSkipping(false)
      prevQueueIdRef.current = currentQueueId
    }
  }, [currentQueueId])

  // ── Refund subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`voting-refund:${tableId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'credits_transactions',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const tx = payload.new as { id: string; type: string; amount: number }
          if (tx.type === 'refund') {
            setRefundToast({ id: tx.id, amount: tx.amount })
          }
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [tableId])

  // ── Cast vote handler ────────────────────────────────────────────────────
  const handleVote = useCallback(
    async (type: 'skip' | 'keep') => {
      if (casting) return
      setCasting(true)
      try {
        const result = await voting.castVote(type)
        if (result?.wasSkipped) {
          setSkipping(true)
          setTimeout(() => setSkipping(false), 3500)
        }
      } finally {
        setCasting(false)
      }
    },
    [casting, voting],
  )

  const dismissRefund = useCallback(() => setRefundToast(null), [])

  const { keepPercent, skipPercent, myVote, total } = voting

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Refund toast — portal-like fixed */}
      <AnimatePresence>
        {refundToast && (
          <RefundToast
            key={refundToast.id}
            amount={refundToast.amount}
            onDismiss={dismissRefund}
          />
        )}
      </AnimatePresence>

      <div className="mx-3 mt-2 bg-card border border-border rounded-xl overflow-hidden">

        {/* ── Skip executing banner ── */}
        <AnimatePresence>
          {skipping && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{   height: 0,      opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="bg-rokka-red/10 border-b border-rokka-red/20 px-4 py-2 flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <p className="text-rokka-red font-bold text-xs">
                  Mayoría votó skip — saltando...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-3 space-y-3">
          {/* ── Header row ── */}
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-[10px] font-semibold tracking-widest uppercase">
              Votación
              {activeTables > 0 && (
                <span className="text-white/30 font-normal ml-1">
                  · {total}/{activeTables}
                </span>
              )}
            </p>
            <p className="text-white/35 text-[10px]">
              <span className="text-rokka-cyan">{keepPercent}% mantener</span>
              <span className="mx-1">·</span>
              <span className="text-rokka-purple">{skipPercent}% skip</span>
            </p>
          </div>

          {/* ── Dual progress bar ── */}
          <div className="h-1 w-full rounded-full overflow-hidden bg-border flex gap-px">
            <motion.div
              className="h-full bg-rokka-cyan rounded-l-full"
              animate={{ width: `${keepPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            <motion.div
              className="h-full bg-rokka-purple rounded-r-full"
              animate={{ width: `${skipPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* ── Vote buttons ── */}
          <div className="grid grid-cols-2 gap-2">
            {/* Keep */}
            <motion.button
              onClick={() => handleVote('keep')}
              disabled={casting}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center justify-center gap-2 py-3 rounded-xl
                          text-sm font-bold transition-all duration-200
                          ${myVote === 'keep'
                            ? 'bg-rokka-cyan/20 border border-rokka-cyan/50 text-rokka-cyan'
                            : 'bg-card2 border border-border text-white/60 hover:border-white/20'
                          }
                          ${casting ? 'opacity-60 cursor-not-allowed' : ''}
                          ${myVote === 'skip' ? 'opacity-40' : ''}
                        `}
            >
              <span className="text-base">👍</span>
              Mantener
              {myVote === 'keep' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-rokka-cyan"
                />
              )}
            </motion.button>

            {/* Skip */}
            <motion.button
              onClick={() => handleVote('skip')}
              disabled={casting}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center justify-center gap-2 py-3 rounded-xl
                          text-sm font-bold transition-all duration-200
                          ${myVote === 'skip'
                            ? 'bg-rokka-purple/20 border border-rokka-purple/50 text-rokka-purple'
                            : 'bg-card2 border border-border text-white/60 hover:border-white/20'
                          }
                          ${casting ? 'opacity-60 cursor-not-allowed' : ''}
                          ${myVote === 'keep' ? 'opacity-40' : ''}
                        `}
            >
              <span className="text-base">⏭</span>
              Skip
              {myVote === 'skip' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-rokka-purple"
                />
              )}
            </motion.button>
          </div>

          {/* ── Refund policy note ── */}
          <p className="text-muted text-[9px] text-center leading-relaxed">
            💡 Si tu canción es saltada por votación y pujaste, te devolvemos tus créditos
          </p>
        </div>
      </div>
    </>
  )
}
