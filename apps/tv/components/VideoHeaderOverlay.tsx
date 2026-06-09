'use client'

import type { BarPublic } from '../providers/TVProvider'

interface Props {
  bar: BarPublic | null
  keepVotes: number
  skipVotes: number
}

export function VideoHeaderOverlay({ bar, keepVotes, skipVotes }: Props) {
  const total = keepVotes + skipVotes || 1
  const keepPct = (keepVotes / total) * 100
  const skipPct = (skipVotes / total) * 100

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-start justify-between pointer-events-none z-20"
      style={{ padding: 'clamp(10px, 1.5vw, 20px) clamp(12px, 1.8vw, 24px)' }}
    >
      {/* ── Left: bar logo ──────────────────────────────────────────────── */}
      <div>
        {bar?.logo_url ? (
          <img
            src={bar.logo_url}
            alt={bar.name ?? 'Bar'}
            style={{
              height: 'clamp(30px, 4.5vh, 56px)',
              width: 'auto',
              maxWidth: 'clamp(60px, 10vw, 140px)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.9))',
            }}
          />
        ) : (
          <div
            style={{
              height: 'clamp(30px, 4.5vh, 56px)',
              width: 'clamp(30px, 4.5vh, 56px)',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(16px, 2.5vh, 30px)',
            }}
          >
            {bar?.emoji ?? '🎵'}
          </div>
        )}
      </div>

      {/* ── Center: live voting card ────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'clamp(8px, 1vw, 14px)',
          padding: 'clamp(6px, 0.8vh, 10px) clamp(12px, 1.5vw, 20px)',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: 'clamp(3px, 0.4vh, 6px)',
          minWidth: 'clamp(130px, 16vw, 230px)',
        }}
      >
        {/* Label */}
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

        {/* Dual bar: cyan (keep) | purple (skip) */}
        <div
          style={{
            width: '100%',
            height: 'clamp(4px, 0.55vh, 7px)',
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

        {/* Counts */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(8px, 1.1vw, 16px)',
            fontSize: 'clamp(9px, 1.1vw, 14px)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: '#00e5ff' }}>👍 {keepVotes}</span>
          <span style={{ color: '#d500f9' }}>⏭ {skipVotes}</span>
        </div>
      </div>

      {/* ── Right: ROKKA branding ───────────────────────────────────────── */}
      <span
        style={{
          color: '#00e5ff',
          fontWeight: 900,
          fontSize: 'clamp(12px, 1.5vw, 19px)',
          letterSpacing: '4px',
          textShadow: '0 0 20px rgba(0,229,255,0.55), 0 2px 8px rgba(0,0,0,0.7)',
        }}
      >
        ROKKA
      </span>
    </div>
  )
}
