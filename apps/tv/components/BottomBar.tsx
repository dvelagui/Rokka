'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getVideoDetails, useAdRotation } from '@rokka/supabase'
import type { QueueItemWithVotes, ChatMessage } from '@rokka/supabase'
import { AdOverlay } from './AdOverlay'

const FIRE1 = '#FF4500'
const FIRE2 = '#FF6D00'
const PURPLE = '#d500f9'
const CYAN = '#00e5ff'

interface Props {
  barId: string
  currentSong: QueueItemWithVotes | null
  queue: QueueItemWithVotes[]
  pinnedMessage: ChatMessage | null
  isPlaying: boolean
  onReset: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Queue card ────────────────────────────────────────────────────────────────

interface CardProps {
  item: QueueItemWithVotes
  position: number
  isTransparent: boolean
}

function QueueCard({ item, position, isTransparent }: CardProps) {
  const hasBid = item.bid_amount > 0
  const isFirst = position === 1
  const isSecond = position === 2

  let borderColor = 'rgba(255,255,255,0.09)'
  let bgColor = 'rgba(255,255,255,0.04)'
  let boxShadow = 'none'
  let cardAnimation = ''
  let posColor = 'rgba(255,255,255,0.25)'
  let emojiAnimation = ''

  if (isFirst && hasBid) {
    borderColor = FIRE1
    bgColor = 'rgba(255,69,0,0.14)'
    boxShadow = '0 0 18px rgba(255,69,0,0.24)'
    cardAnimation = 'itemfire 1.2s ease-in-out infinite alternate'
    posColor = FIRE1
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (isSecond && hasBid) {
    borderColor = FIRE2
    bgColor = 'rgba(255,109,0,0.10)'
    posColor = FIRE2
    emojiAnimation = 'bounce 0.6s ease-in-out infinite alternate'
  } else if (hasBid) {
    borderColor = PURPLE
    bgColor = 'rgba(213,0,249,0.08)'
    posColor = PURPLE
  }

  return (
    <div
      style={{
        opacity: isTransparent ? 0.25 : 1,
        transition: 'opacity 0.4s ease',
        borderLeft: `3px solid ${borderColor}`,
        background: bgColor,
        boxShadow,
        animation: cardAnimation,
        borderRadius: 'clamp(4px, 0.5vw, 8px)',
        padding: 'clamp(5px, 0.7vh, 10px) clamp(6px, 0.8vw, 12px)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 'clamp(1px, 0.2vh, 3px)',
        minWidth: 0,
        minHeight: 'clamp(60px, 8vh, 100px)',
        overflow: 'hidden',
      }}
    >
      {/* Position number + fire emoji */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 'clamp(8px, 0.9vw, 13px)',
            fontWeight: 800,
            color: posColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {position}
        </span>
        {isFirst && hasBid && (
          <span
            style={{
              fontSize: 'clamp(10px, 1.2vw, 16px)',
              animation: emojiAnimation,
              display: 'inline-block',
            }}
          >
            🔥
          </span>
        )}
        {isSecond && hasBid && (
          <span
            style={{
              fontSize: 'clamp(10px, 1.2vw, 16px)',
              animation: emojiAnimation,
              display: 'inline-block',
            }}
          >
            🟠
          </span>
        )}
      </div>

      {/* Title */}
      <p
        style={{
          fontSize: 'clamp(10px, 1.2vw, 16px)',
          fontWeight: 700,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {item.title}
      </p>

      {/* Artist */}
      <p
        style={{
          fontSize: 'clamp(9px, 1vw, 13px)',
          color: 'rgba(255,255,255,0.45)',
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
          <span
            style={{
              fontSize: 'clamp(8px, 0.85vw, 11px)',
              color: 'rgba(255,255,255,0.30)',
            }}
          >
            Mesa {item.table_label}
          </span>
        )}
        {hasBid && (
          <span
            style={{
              fontSize: 'clamp(8px, 0.85vw, 11px)',
              fontWeight: 700,
              color: isFirst ? FIRE1 : isSecond ? FIRE2 : PURPLE,
            }}
          >
            💰 {item.bid_amount}
          </span>
        )}
      </div>

      {/* Dedication */}
      {item.dedication && (
        <p
          style={{
            fontSize: 'clamp(7px, 0.8vw, 10px)',
            color: 'rgba(255,255,255,0.30)',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          💌 {item.dedication}
        </p>
      )}
    </div>
  )
}

// ── Empty queue slot ──────────────────────────────────────────────────────────

function EmptySlot({ position, isTransparent }: { position: number; isTransparent: boolean }) {
  return (
    <div
      style={{
        opacity: isTransparent ? 0.12 : 0.28,
        transition: 'opacity 0.4s ease',
        borderLeft: '3px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 'clamp(4px, 0.5vw, 8px)',
        padding: 'clamp(5px, 0.7vh, 10px) clamp(6px, 0.8vw, 12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'clamp(60px, 8vh, 100px)',
      }}
    >
      <span
        style={{
          fontSize: 'clamp(8px, 0.9vw, 13px)',
          color: 'rgba(255,255,255,0.12)',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {position}
      </span>
    </div>
  )
}

// ── BottomBar ─────────────────────────────────────────────────────────────────

export function BottomBar({ barId, currentSong, queue, pinnedMessage, isPlaying, onReset }: Props) {
  const { currentAd, isShowingAd, countdown } = useAdRotation(barId, {
    mode: 'time',
    initialDelaySec: 5,
    intervalSec: 30,
  })

  const upcomingQueue = queue.filter((q) => q.status === 'queued').slice(0, 5)
  const topHasBid = (upcomingQueue[0]?.bid_amount ?? 0) > 0

  // ── Progress tracking ────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0)
  const [totalDuration, setTotalDuration] = useState(210)

  const songId = currentSong?.id ?? null
  const videoId = currentSong?.youtube_video_id ?? null

  useEffect(() => {
    if (!songId) {
      setElapsed(0)
      return
    }
    setElapsed(0)
    if (videoId) {
      getVideoDetails(videoId)
        .then((d) => setTotalDuration(d.duration))
        .catch(() => setTotalDuration(210))
    } else {
      setTotalDuration(210)
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1_000)
    return () => clearInterval(id)
  }, [songId, videoId])

  const progressPct = Math.min((elapsed / totalDuration) * 100, 100)

  return (
    <div
      className="shrink-0 w-full flex flex-col"
      style={{
        background: 'rgba(0,0,0,0.97)',
        borderTop: `2px solid ${topHasBid ? FIRE1 : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 0.5s ease',
      }}
    >
      {/* ── Pinned admin message ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            key="pinned"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex items-center gap-2"
              style={{ padding: 'clamp(4px, 0.5vh, 7px) clamp(12px, 1.5vw, 20px)' }}
            >
              <span style={{ fontSize: 'clamp(10px, 1.1vw, 14px)', flexShrink: 0 }}>📌</span>
              <p
                style={{
                  fontSize: 'clamp(10px, 1.1vw, 14px)',
                  color: 'rgba(255,255,255,0.72)',
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {pinnedMessage.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Current song + progress bar ──────────────────────────────────────── */}
      {currentSong ? (
        <div
          style={{
            padding: 'clamp(6px, 0.8vh, 11px) clamp(12px, 1.5vw, 20px)',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 'clamp(3px, 0.4vh, 6px)',
          }}
        >
          {/* Compact one-line song info */}
          <div className="flex items-center overflow-hidden" style={{ gap: 'clamp(4px, 0.5vw, 8px)' }}>
            <span
              className="shrink-0"
              style={{
                display: 'inline-block',
                width: 'clamp(6px, 0.7vw, 9px)',
                height: 'clamp(6px, 0.7vw, 9px)',
                borderRadius: '50%',
                background: isPlaying ? CYAN : FIRE1,
                boxShadow: isPlaying ? `0 0 8px ${CYAN}` : `0 0 8px ${FIRE1}`,
                animation: isPlaying ? 'pulse 1.5s ease-in-out infinite' : 'none',
                transition: 'background 0.4s ease, box-shadow 0.4s ease',
              }}
            />
            <p
              style={{
                fontSize: 'clamp(11px, 1.3vw, 18px)',
                color: 'white',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {currentSong.title}
              <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 400 }}>
                {' — '}
                {currentSong.artist}
              </span>
              {currentSong.table_label && (
                <span style={{ color: CYAN, marginLeft: 'clamp(4px, 0.6vw, 10px)' }}>
                  {' '}Mesa {currentSong.table_label}
                </span>
              )}
              {currentSong.dedication && (
                <span
                  style={{
                    color: 'rgba(255,255,255,0.42)',
                    fontStyle: 'italic',
                    marginLeft: 'clamp(4px, 0.6vw, 10px)',
                  }}
                >
                  {' '}💌 &ldquo;{currentSong.dedication}&rdquo;
                </span>
              )}
            </p>
          </div>

          {/* Progress bar with timestamps */}
          <div className="flex items-center" style={{ gap: 'clamp(6px, 0.8vw, 12px)' }}>
            <span
              style={{
                fontSize: 'clamp(9px, 0.9vw, 12px)',
                color: 'rgba(255,255,255,0.38)',
                fontFamily: 'monospace',
                flexShrink: 0,
                letterSpacing: '0.5px',
              }}
            >
              {formatTime(elapsed)}
            </span>
            <div
              style={{
                flex: 1,
                height: 'clamp(3px, 0.4vh, 5px)',
                background: 'rgba(255,255,255,0.10)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: CYAN,
                  boxShadow: `0 0 6px ${CYAN}80`,
                  borderRadius: '999px',
                  transition: 'width 1s linear',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 'clamp(9px, 0.9vw, 12px)',
                color: 'rgba(255,255,255,0.38)',
                fontFamily: 'monospace',
                flexShrink: 0,
                letterSpacing: '0.5px',
              }}
            >
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: 'clamp(6px, 0.8vh, 11px) clamp(12px, 1.5vw, 20px)' }}>
          <p
            style={{
              fontSize: 'clamp(10px, 1.1vw, 14px)',
              color: 'rgba(255,255,255,0.18)',
              fontStyle: 'italic',
            }}
          >
            Escanea el QR de tu mesa para pedir canciones y chatear
          </p>
        </div>
      )}

      {/* ── Upcoming queue — 5-column grid + inline ad overlay ──────────────── */}
      <div
        style={{
          position: 'relative',
          padding: 'clamp(4px, 0.5vh, 7px) clamp(12px, 1.5vw, 20px) clamp(3px, 0.4vh, 5px)',
        }}
      >
        <div className="tv-queue-grid">
          {upcomingQueue.map((item, i) => (
            <QueueCard
              key={item.id}
              item={item}
              position={i + 1}
              isTransparent={isShowingAd && i >= 3}
            />
          ))}
          {Array.from({ length: Math.max(0, 5 - upcomingQueue.length) }).map((_, i) => (
            <EmptySlot
              key={`empty-${i}`}
              position={upcomingQueue.length + i + 1}
              isTransparent={isShowingAd && upcomingQueue.length + i >= 3}
            />
          ))}
        </div>

        {/* Ad slides in from the right, covering slots 4–5 */}
        <AnimatePresence>
          {isShowingAd && currentAd && <AdOverlay key="ad" ad={currentAd} countdown={countdown} />}
        </AnimatePresence>
      </div>

      {/* Dev reset — intentionally faint */}
      <div
        className="flex justify-end"
        style={{ padding: '0 clamp(12px, 1.5vw, 20px) clamp(2px, 0.3vh, 4px)' }}
      >
        <button
          onClick={onReset}
          style={{
            color: 'rgba(255,255,255,0.07)',
            fontSize: '9px',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '2px',
          }}
        >
          [dev] reset
        </button>
      </div>
    </div>
  )
}
