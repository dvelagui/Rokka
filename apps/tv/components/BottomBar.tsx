'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getVideoDetails } from '@rokka/supabase'
import type { QueueItemWithVotes, ChatMessage } from '@rokka/supabase'

const FIRE1 = '#FF4500'
const CYAN = '#00e5ff'

interface Props {
  currentSong: QueueItemWithVotes | null
  queue: QueueItemWithVotes[]
  pinnedMessage: ChatMessage | null
  isPlaying: boolean
  keepVotes: number
  skipVotes: number
  onReset: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── BottomBar ─────────────────────────────────────────────────────────────────

export function BottomBar({
  currentSong,
  queue,
  pinnedMessage,
  isPlaying,
  keepVotes,
  skipVotes,
  onReset,
}: Props) {
  const upcomingQueue = queue.filter((q) => q.status === 'queued')
  const topHasBid = (upcomingQueue[0]?.bid_amount ?? 0) > 0
  const totalVotes = keepVotes + skipVotes || 1
  const keepPct = (keepVotes / totalVotes) * 100
  const skipPct = (skipVotes / totalVotes) * 100

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
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: `2px solid ${topHasBid ? FIRE1 : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 0.5s ease',
      }}
    >
      {/* ── Pinned admin message + live voting ───────────────────────────────── */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: 'clamp(4px, 0.5vh, 7px) clamp(12px, 1.5vw, 20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <AnimatePresence>
          {pinnedMessage && (
            <motion.div
              key="pinned"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 overflow-hidden"
              style={{ flex: 1, minWidth: 0 }}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live voting */}
        <div
          className="flex items-center gap-2 shrink-0"
          style={{ marginLeft: pinnedMessage ? 0 : 'auto' }}
        >
          <span
            style={{
              fontSize: '8px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase' as const,
              letterSpacing: '2px',
              fontWeight: 700,
            }}
          >
            Votación
          </span>
          <div
            style={{
              width: 'clamp(50px, 6vw, 90px)',
              height: 'clamp(4px, 0.5vh, 7px)',
              borderRadius: '999px',
              overflow: 'hidden',
              display: 'flex',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: `${keepPct}%`,
                background: '#00e5ff',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
            <div
              style={{
                width: `${skipPct}%`,
                background: '#d500f9',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'clamp(6px, 0.8vw, 12px)',
              fontSize: 'clamp(9px, 1.1vw, 14px)',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: '#00e5ff' }}>👍 {keepVotes}</span>
            <span style={{ color: '#d500f9' }}>⏭ {skipVotes}</span>
          </div>
        </div>
      </div>

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
