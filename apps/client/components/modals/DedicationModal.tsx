'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SongToAdd } from '@/lib/use-add-song'

const MAX_DEDICATION = 80

export interface DedicationModalProps {
  song:      SongToAdd
  isAdding:  boolean
  onConfirm: (dedication?: string) => Promise<void>
  onCancel:  () => void
}

export function DedicationModal({ song, isAdding, onConfirm, onCancel }: DedicationModalProps) {
  const [dedication, setDedication] = useState('')

  const handleSubmit = async () => {
    await onConfirm(dedication.trim() || undefined)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{   opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.93] px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{   scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-[320px] bg-card border border-border rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <p className="text-white font-extrabold text-sm text-center">Agregar a la Cola</p>

        {/* Song card */}
        <div className="bg-card2 rounded-xl px-3 py-2.5 flex items-center gap-3">
          {song.thumbnailUrl && (
            <img
              src={song.thumbnailUrl}
              alt={song.title}
              className="w-12 h-9 object-cover rounded-lg shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold line-clamp-1">{song.title}</p>
            <p className="text-white/40 text-[10px] line-clamp-1">{song.artist}</p>
          </div>
        </div>

        {/* Dedication field */}
        <div className="space-y-1.5">
          <p className="text-rokka-cyan text-[11px] font-bold">💌 Dedicatoria (opcional)</p>
          <div className="relative">
            <textarea
              value={dedication}
              onChange={(e) => setDedication(e.target.value.slice(0, MAX_DEDICATION))}
              placeholder="Ej: Para la mesa más animada 🔥"
              rows={2}
              className="w-full bg-card2 border border-border rounded-xl px-3 py-2.5 text-xs
                         text-white placeholder-white/20 outline-none
                         focus:border-rokka-cyan/40 transition-colors resize-none"
            />
            <span
              className={`absolute bottom-2 right-2.5 text-[9px] tabular-nums
                          ${dedication.length >= MAX_DEDICATION ? 'text-rokka-red' : 'text-muted'}`}
            >
              {dedication.length}/{MAX_DEDICATION}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={isAdding}
            className="w-full py-3 rounded-xl bg-rokka-cyan/15 border border-rokka-cyan/40
                       text-rokka-cyan font-bold text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed
                       active:scale-95 transition-transform
                       flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <span className="w-4 h-4 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin" />
            ) : (
              'Agregar a la Cola'
            )}
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-card2 border border-border
                       text-white/50 text-sm font-medium
                       active:scale-95 transition-transform"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
