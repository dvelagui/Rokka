'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { GenresRow } from '@rokka/shared'

interface Props {
  genres: GenresRow[]
  onSelect: (genre: GenresRow) => void
  onClose: () => void
}

export default function GenrePicker({ genres, onSelect, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="genre-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="bg-[#111] border border-[#2a2a2a] rounded-t-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Asignar género
            </p>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white text-xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>

          {genres.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6 pb-8">
              Sin géneros creados
            </p>
          ) : (
            <div className="overflow-y-auto max-h-64 pb-4">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onSelect(g)}
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
    </AnimatePresence>
  )
}
