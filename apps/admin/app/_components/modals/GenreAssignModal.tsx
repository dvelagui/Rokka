'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GenresRow } from '@rokka/shared'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  genres: GenresRow[]
  songTitle?: string
  onSelect: (genre: GenresRow) => void
}

// ── GenreAssignModal ──────────────────────────────────────────────────────────

export default function GenreAssignModal({ isOpen, onClose, genres, songTitle, onSelect }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="genre-assign-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/[0.93] flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#111] border border-[#2a2a2a] rounded-[14px] w-full max-w-[370px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0a0a0a] flex items-start justify-between px-4 py-3.5">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Asignar género
                </p>
                {songTitle && (
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{songTitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white text-xl leading-none transition-colors shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>

            {/* Genre list */}
            {genres.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">Sin géneros creados</p>
            ) : (
              <div className="overflow-y-auto max-h-64 py-1">
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { onSelect(g); onClose() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: g.color }}
                    />
                    <span className="text-base leading-none">{g.emoji}</span>
                    <span className="text-sm text-white/80">{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
