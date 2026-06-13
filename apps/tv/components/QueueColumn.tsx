'use client'

import type { QueueItemWithVotes } from '@rokka/supabase'

const FIRE1 = '#FF4500'
const FIRE2 = '#FF6D00'
const PURPLE = '#d500f9'

interface Props {
  queue: QueueItemWithVotes[]
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
  let emojiAnimation = ''

  if (isFirst && hasBid) {
    borderColor = FIRE1
    bgColor = 'rgba(255,69,0,0.22)'
    boxShadow = '0 0 18px rgba(255,69,0,0.24)'
    cardAnimation = 'itemfire 1.2s ease-in-out infinite alternate'
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (isSecond && hasBid) {
    borderColor = FIRE2
    bgColor = 'rgba(255,109,0,0.18)'
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (hasBid) {
    borderColor = PURPLE
    bgColor = 'rgba(213,0,249,0.16)'
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
      {/* Fire emoji */}
      {((isFirst && hasBid) || (isSecond && hasBid)) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
      )}

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

export function QueueColumn({ queue }: Props) {
  const upcoming = queue.filter((q) => q.status === 'queued').slice(0, 5)

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
    </div>
  )
}
