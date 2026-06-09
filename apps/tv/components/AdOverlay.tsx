'use client'

import { motion } from 'framer-motion'
import type { AdRow } from '@rokka/supabase'

interface Props {
  ad: AdRow
  countdown: number
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function AdOverlay({ ad, countdown }: Props) {
  const progressPct = Math.max(0, Math.min(100, (countdown / ad.duration_seconds) * 100))

  return (
    <motion.div
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 30, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '40%',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius:
          'clamp(4px, 0.5vw, 8px) 0 0 clamp(4px, 0.5vw, 8px)',
        border: `1px solid ${hexToRgba(ad.color, 0.55)}`,
        borderRight: 'none',
        background: `linear-gradient(135deg, ${hexToRgba(ad.color, 0.26)} 0%, rgba(0,0,0,0.98) 80%)`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Progress bar — shrinks linearly as countdown ticks */}
      <div
        style={{
          width: `${progressPct}%`,
          height: 'clamp(2px, 0.3vh, 4px)',
          background: ad.color,
          transition: 'width 1s linear',
          flexShrink: 0,
        }}
      />

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(8px, 1.2vh, 16px) clamp(10px, 1.4vw, 18px)',
          gap: 'clamp(2px, 0.3vh, 5px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* "Publicidad" label for third-party ads */}
        {!ad.is_own && (
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

        {/* Emoji */}
        <span
          style={{
            fontSize: 'clamp(22px, 3.2vh, 44px)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {ad.emoji}
        </span>

        {/* Title — colored to match the ad */}
        <p
          style={{
            fontSize: 'clamp(11px, 1.4vw, 19px)',
            fontWeight: 700,
            color: ad.color,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {ad.title}
        </p>

        {/* Subtitle */}
        {ad.subtitle && (
          <p
            style={{
              fontSize: 'clamp(9px, 1.1vw, 14px)',
              color: 'rgba(255,255,255,0.55)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {ad.subtitle}
          </p>
        )}

        {/* Company name for third-party ads */}
        {!ad.is_own && ad.company_name && (
          <p
            style={{
              fontSize: 'clamp(7px, 0.85vw, 11px)',
              color: 'rgba(255,255,255,0.30)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px',
            }}
          >
            {ad.company_name}
          </p>
        )}

        {/* Countdown — bottom right */}
        <span
          style={{
            position: 'absolute',
            right: 'clamp(8px, 1vw, 14px)',
            bottom: 'clamp(6px, 0.8vh, 11px)',
            fontSize: 'clamp(7px, 0.8vw, 10px)',
            color: 'rgba(255,255,255,0.30)',
            fontFamily: 'monospace',
          }}
        >
          Cerrando en {countdown}s
        </span>
      </div>
    </motion.div>
  )
}
