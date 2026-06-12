'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAdRotation } from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'

const FIRE1 = '#FF4500'
const FIRE2 = '#FF6D00'
const PURPLE = '#d500f9'

interface Props {
  barId: string
  queue: QueueItemWithVotes[]
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Queue card ────────────────────────────────────────────────────────────────

function QueueCard({ item, position }: { item: QueueItemWithVotes; position: number }) {
  const hasBid = item.bid_amount > 0
  const isFirst = position === 1
  const isSecond = position === 2

  let borderColor = 'rgba(255,255,255,0.12)'
  let bgColor = 'rgba(0,0,0,0.35)'
  let boxShadow = 'none'
  let cardAnimation = ''
  let posColor = 'rgba(255,255,255,0.35)'
  let emojiAnimation = ''

  if (isFirst && hasBid) {
    borderColor = FIRE1
    bgColor = 'rgba(255,69,0,0.22)'
    boxShadow = '0 0 18px rgba(255,69,0,0.24)'
    cardAnimation = 'itemfire 1.2s ease-in-out infinite alternate'
    posColor = FIRE1
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (isSecond && hasBid) {
    borderColor = FIRE2
    bgColor = 'rgba(255,109,0,0.18)'
    posColor = FIRE2
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (hasBid) {
    borderColor = PURPLE
    bgColor = 'rgba(213,0,249,0.16)'
    posColor = PURPLE
  }

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: bgColor,
        boxShadow,
        animation: cardAnimation,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 'clamp(4px, 0.5vw, 8px)',
        padding: 'clamp(5px, 0.7vh, 9px) clamp(8px, 1vw, 12px)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 'clamp(1px, 0.2vh, 3px)',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* Position number + fire emoji */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 'clamp(8px, 0.9vw, 12px)',
            fontWeight: 800,
            color: posColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {position}
        </span>
        {isFirst && hasBid && (
          <span style={{ fontSize: 'clamp(10px, 1.1vw, 15px)', animation: emojiAnimation, display: 'inline-block' }}>
            🔥
          </span>
        )}
        {isSecond && hasBid && (
          <span style={{ fontSize: 'clamp(10px, 1.1vw, 15px)', animation: emojiAnimation, display: 'inline-block' }}>
            🟠
          </span>
        )}
      </div>

      {/* Title */}
      <p
        style={{
          fontSize: 'clamp(10px, 1.1vw, 15px)',
          fontWeight: 700,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }}
      >
        {item.title}
      </p>

      {/* Artist */}
      <p
        style={{
          fontSize: 'clamp(9px, 0.95vw, 12px)',
          color: 'rgba(255,255,255,0.55)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {item.artist}
      </p>

      {/* Mesa + bid */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' as const }}>
        {item.table_label && (
          <span style={{ fontSize: 'clamp(8px, 0.8vw, 10px)', color: 'rgba(255,255,255,0.40)' }}>
            Mesa {item.table_label}
          </span>
        )}
        {hasBid && (
          <span
            style={{
              fontSize: 'clamp(8px, 0.8vw, 10px)',
              fontWeight: 700,
              color: isFirst ? FIRE1 : isSecond ? FIRE2 : PURPLE,
            }}
          >
            💰 {item.bid_amount}
          </span>
        )}
      </div>
    </div>
  )
}

// ── QueueColumn ───────────────────────────────────────────────────────────────

export function QueueColumn({ barId, queue }: Props) {
  const upcoming = queue.filter((q) => q.status === 'queued').slice(0, 5)
  const { currentAd, isShowingAd, countdown } = useAdRotation(barId, {
    mode: 'time',
    initialDelaySec: 5,
    intervalSec: 30,
  })

  return (
    <div className="h-full flex flex-col gap-1.5 overflow-hidden">
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-1 shrink-0">
        Próximas
      </p>
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        {upcoming.length === 0 ? (
          <p className="text-white/20 text-xs italic px-1">Sin canciones en cola</p>
        ) : (
          upcoming.map((item, i) => <QueueCard key={item.id} item={item} position={i + 1} />)
        )}
      </div>

      {/* Ad banner — slides up from the bottom of the queue column */}
      <AnimatePresence>
        {isShowingAd && currentAd && (
          <motion.div
            key="ad"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="shrink-0 flex items-center gap-2 rounded-xl"
            style={{
              padding: 'clamp(6px, 0.8vh, 10px) clamp(8px, 1vw, 12px)',
              background: `linear-gradient(135deg, ${hexToRgba(currentAd.color, 0.28)} 0%, rgba(0,0,0,0.75) 85%)`,
              border: `1px solid ${hexToRgba(currentAd.color, 0.5)}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: 'clamp(18px, 2.2vh, 28px)', lineHeight: 1 }}>{currentAd.emoji}</span>
            <div className="flex-1 min-w-0">
              {!currentAd.is_own && (
                <span
                  style={{
                    fontSize: '7px',
                    color: 'rgba(255,255,255,0.40)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1.5px',
                    fontWeight: 600,
                  }}
                >
                  Publicidad
                </span>
              )}
              <p
                style={{
                  fontSize: 'clamp(10px, 1.1vw, 14px)',
                  fontWeight: 700,
                  color: currentAd.color,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {currentAd.title}
              </p>
              {currentAd.subtitle && (
                <p
                  style={{
                    fontSize: 'clamp(8px, 0.9vw, 11px)',
                    color: 'rgba(255,255,255,0.55)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {currentAd.subtitle}
                </p>
              )}
            </div>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', flexShrink: 0 }}>
              {countdown}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
