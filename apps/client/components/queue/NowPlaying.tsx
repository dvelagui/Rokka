'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtime } from '@rokka/supabase'
import { formatTime } from '@rokka/shared'
import { useTableContext } from '@/providers/TableProvider'

export function NowPlaying() {
  const { bar } = useTableContext()
  const { queue } = useRealtime()
  const { currentSong } = queue

  const avgDuration = bar?.config.avg_song_duration ?? 210

  // Local progress timer — resets when song changes
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setElapsed(0)
    if (!currentSong) return
    const interval = setInterval(() => {
      setElapsed((prev) => Math.min(prev + 1, avgDuration))
    }, 1000)
    return () => clearInterval(interval)
  }, [currentSong?.id, avgDuration])

  const progress = avgDuration > 0 ? (elapsed / avgDuration) * 100 : 0

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!currentSong) {
    return (
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden bg-card border border-border">
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="text-4xl opacity-30">🎵</span>
          <p className="text-white/30 text-sm">Sin canción en reproducción</p>
        </div>
      </div>
    )
  }

  const thumbUrl =
    currentSong.thumbnail_url ??
    (currentSong.youtube_video_id
      ? `https://img.youtube.com/vi/${currentSong.youtube_video_id}/hqdefault.jpg`
      : null)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentSong.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="mx-3 mt-3 rounded-2xl overflow-hidden relative"
      >
        {/* ── Background thumbnail ── */}
        <div className="relative h-44 bg-card">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={currentSong.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-10">🎵</span>
            </div>
          )}
          {/* Gradient overlay — light at top, full black at bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />

          {/* ── "Reproduciendo" pill ── */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm
                          rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rokka-cyan animate-pulse" />
            <span className="text-rokka-cyan text-[10px] font-semibold tracking-wide">
              REPRODUCIENDO
            </span>
          </div>
        </div>

        {/* ── Song info (sits below the gradient) ── */}
        <div className="bg-black px-4 pt-1 pb-4 space-y-2">
          {/* Title + artist */}
          <div>
            <p className="text-white font-extrabold text-base leading-tight line-clamp-1">
              {currentSong.title}
            </p>
            <p className="text-white/50 text-[11px] mt-0.5">{currentSong.artist}</p>
          </div>

          {/* Mesa que pidió */}
          {currentSong.table_label && (
            <p className="text-rokka-cyan text-[10px] font-medium">
              ▶ {currentSong.table_label}
            </p>
          )}

          {/* Dedicatoria */}
          {currentSong.dedication && (
            <div className="flex items-start gap-1.5 bg-rokka-cyan/10 rounded-lg px-2.5 py-1.5">
              <span className="text-xs leading-none mt-px">💌</span>
              <p className="text-rokka-cyan/80 text-[9px] italic leading-relaxed">
                {currentSong.dedication}
              </p>
            </div>
          )}

          {/* ── Progress bar ── */}
          <div className="space-y-1 pt-1">
            <div className="h-[3px] w-full bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-rokka-cyan rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-white/30 text-[9px] tabular-nums">
                {formatTime(elapsed)}
              </span>
              <span className="text-white/30 text-[9px] tabular-nums">
                {formatTime(avgDuration)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
