'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtime } from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { formatCredits, estimateWait } from '@rokka/shared'
import { useTableContext } from '@/providers/TableProvider'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireLevel(index: number): 0 | 1 | 2 {
  if (index === 0) return 0  // 🔥 position 1
  if (index === 1) return 1  // 🟠 position 2
  return 2                   // neutral
}

const FIRE_EMOJI  = ['🔥', '🟠', null] as const
const BORDER_LEFT = [
  'border-l-2 border-l-rokka-fire',
  'border-l-2 border-l-fire2',
  'border-l border-l-border',
] as const

function PositionBadge({
  index,
  hasBid,
}: {
  index: number
  hasBid: boolean
}) {
  const level = fireLevel(index)
  const base = 'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0'

  if (level === 0)       return <div className={`${base} bg-rokka-fire text-white`}>{index + 1}</div>
  if (level === 1)       return <div className={`${base} bg-fire2 text-white`}>{index + 1}</div>
  if (hasBid)            return <div className={`${base} bg-rokka-purple/20 text-rokka-purple`}>{index + 1}</div>
  return                        <div className={`${base} bg-border/60 text-white/30`}>{index + 1}</div>
}

// ── Item ──────────────────────────────────────────────────────────────────────

interface QueueItemProps {
  item:     QueueItemWithVotes
  index:    number
  isMyMesa:  boolean
  avgSecs:  number
  onBid:    (item: QueueItemWithVotes) => void
}

function QueueItem({ item, index, isMyMesa, avgSecs, onBid }: QueueItemProps) {
  const level    = fireLevel(index)
  const hasBid   = item.bid_amount > 0
  const isFirst  = level === 0
  const waitText = estimateWait(index + 1, avgSecs)

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 35 } }}
      className={`bg-card rounded-xl p-3 flex gap-3 items-start
                  ${BORDER_LEFT[level]}
                  ${isFirst ? 'animate-fire-pulse' : ''}`}
    >
      {/* Position badge */}
      <PositionBadge index={index} hasBid={hasBid} />

      {/* Main info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight line-clamp-1">
              {FIRE_EMOJI[level] && (
                <span className="mr-1">{FIRE_EMOJI[level]}</span>
              )}
              {item.title}
            </p>
            <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1">{item.artist}</p>
          </div>

          {/* Bid badge */}
          {hasBid && (
            <div className="shrink-0 flex items-center gap-1 bg-rokka-purple/15 border border-rokka-purple/30
                            rounded-full px-2 py-0.5">
              <span className="text-[9px]">⬆</span>
              <span className="text-rokka-purple text-[10px] font-bold">
                {formatCredits(item.bid_amount)}
              </span>
            </div>
          )}
        </div>

        {/* Mesa + wait */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.table_label && (
            <span className="text-white/30 text-[10px]">{item.table_label}</span>
          )}
          <span className="text-white/20 text-[10px]">·</span>
          <span className="text-white/25 text-[10px]">{waitText}</span>
        </div>

        {/* Dedicatoria */}
        {item.dedication && (
          <div className="flex items-center gap-1 bg-rokka-cyan/5 rounded px-1.5 py-0.5">
            <span className="text-[9px]">💌</span>
            <p className="text-rokka-cyan/60 text-[9px] italic line-clamp-1">
              {item.dedication}
            </p>
          </div>
        )}

        {/* My-mesa hints */}
        {isMyMesa && (
          <p className="text-rokka-cyan text-[10px] font-bold">
            ⏱ Tu canción suena en {waitText}
          </p>
        )}

        {isMyMesa && hasBid && (
          <p className="text-muted text-[10px]">
            💡 Si la saltan por votación, recuperas {formatCredits(item.bid_amount)}
          </p>
        )}
      </div>

      {/* Bid button */}
      <button
        onClick={() => onBid(item)}
        className="shrink-0 flex items-center gap-1 text-rokka-purple text-[10px] font-semibold
                   bg-rokka-purple/10 border border-rokka-purple/25 rounded-lg px-2 py-1.5
                   active:scale-95 transition-transform mt-0.5"
      >
        <span>⬆</span>
        <span>Subir</span>
      </button>
    </motion.div>
  )
}

// ── QueueList ─────────────────────────────────────────────────────────────────

interface QueueListProps {
  onBid: (item: QueueItemWithVotes) => void
}

export function QueueList({ onBid }: QueueListProps) {
  const { table, bar } = useTableContext()
  const { queue }      = useRealtime()
  const avgSecs        = bar?.config.avg_song_duration ?? 210

  // Sort: bid > 0 first (DESC), then position ASC — exclude playing song
  const sorted = useMemo(() => {
    const queued = queue.queue.filter((item) => item.status === 'queued')
    return [...queued].sort((a, b) => {
      const aBid = a.bid_amount
      const bBid = b.bid_amount
      if (aBid > 0 && bBid === 0) return -1
      if (aBid === 0 && bBid > 0) return 1
      if (aBid > 0 && bBid > 0) return bBid - aBid
      return a.position - b.position
    })
  }, [queue.queue])

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <span className="text-3xl opacity-20">🎵</span>
        <p className="text-white/20 text-sm">La cola está vacía</p>
        <p className="text-white/15 text-xs">Sé el primero en pedir una canción</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {sorted.map((item, index) => (
          <QueueItem
            key={item.id}
            item={item}
            index={index}
            isMyMesa={item.table_id === table?.tableId}
            avgSecs={avgSecs}
            onBid={onBid}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
