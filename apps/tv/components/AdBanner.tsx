'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAdRotation } from '@rokka/supabase'

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface Props {
  barId: string | null
}

// ── AdBanner ──────────────────────────────────────────────────────────────────
// Anuncio rotativo del lado izquierdo de la pantalla. Tamaños en px fijos
// (no vw) porque el ancho del contenedor está acotado por clamp() y no por
// el viewport completo — usar vw aquí producía texto más grande que la
// columna y se veía cortado.

export function AdBanner({ barId }: Props) {
  const { currentAd, isShowingAd, countdown } = useAdRotation(barId, {
    mode: 'time',
    initialDelaySec: 5,
    intervalSec: 30,
  })

  return (
    <AnimatePresence>
      {isShowingAd && currentAd && (
        <motion.div
          key="ad"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="rounded-xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(currentAd.color, 0.28)} 0%, rgba(0,0,0,0.78) 85%)`,
            border: `1px solid ${hexToRgba(currentAd.color, 0.5)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {currentAd.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="w-full block"
              style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
            />
          )}

          <div className="flex items-center gap-2 p-3">
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{currentAd.emoji}</span>
            <div className="flex-1 min-w-0">
              {!currentAd.is_own && (
                <span
                  style={{
                    fontSize: '9px',
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
                  fontSize: '15px',
                  fontWeight: 700,
                  color: currentAd.color,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                {currentAd.title}
              </p>
              {currentAd.subtitle && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {currentAd.subtitle}
                </p>
              )}
            </div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', flexShrink: 0 }}>
              {countdown}s
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
