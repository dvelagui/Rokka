'use client'

import { useEffect, useState } from 'react'
import type { BarPublic } from '../providers/TVProvider'

interface Props {
  bar: BarPublic | null
}

// ── Burn-in prevention ────────────────────────────────────────────────────────
// Shifts static elements 1–2px every 5 minutes. Imperceptible to viewers but
// prevents permanent image retention on OLED panels.

function useBurnInShift() {
  const [t, setT] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const id = setInterval(
      () =>
        setT({
          x: Math.round((Math.random() - 0.5) * 4),
          y: Math.round((Math.random() - 0.5) * 4),
        }),
      5 * 60_000,
    )
    return () => clearInterval(id)
  }, [])
  return `translate(${t.x}px, ${t.y}px)`
}

// ─────────────────────────────────────────────────────────────────────────────

export function VideoHeaderOverlay({ bar }: Props) {
  const burnIn = useBurnInShift()

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-start justify-between pointer-events-none z-20"
      style={{ padding: 'clamp(10px, 1.5vw, 20px) clamp(12px, 1.8vw, 24px)' }}
    >
      {/* ── Left: bar logo — burn-in protection applied ──────────────────── */}
      <div style={{ transform: burnIn, transition: 'transform 2s ease-in-out' }}>
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
    </div>
  )
}
