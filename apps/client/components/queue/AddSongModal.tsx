'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { SongToAdd } from '@/lib/use-add-song'

const MAX_DEDICATION = 100

interface AddSongModalProps {
  song:      SongToAdd
  isAdding:  boolean
  onConfirm: (dedication?: string) => Promise<void>
  onCancel:  () => void
}

export function AddSongModal({ song, isAdding, onConfirm, onCancel }: AddSongModalProps) {
  const [dedication, setDedication] = useState('')

  const handleSubmit = async () => {
    await onConfirm(dedication.trim() || undefined)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full max-w-md bg-card border border-border rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm">🎵 Agregar a la cola</p>
          <button
            onClick={onCancel}
            className="text-white/30 hover:text-white/60 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Song info */}
        <div className="bg-card2 rounded-xl px-3 py-2.5 flex items-center gap-3">
          {song.thumbnailUrl && (
            <img
              src={song.thumbnailUrl}
              alt={song.title}
              className="w-12 h-9 object-cover rounded-lg shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold line-clamp-1">{song.title}</p>
            <p className="text-white/40 text-xs">{song.artist}</p>
          </div>
        </div>

        {/* Dedication (optional) */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-[10px] font-medium uppercase tracking-wider">
            Dedicatoria <span className="normal-case font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <textarea
              value={dedication}
              onChange={(e) => setDedication(e.target.value.slice(0, MAX_DEDICATION))}
              placeholder="Para alguien especial..."
              rows={2}
              className="w-full bg-card2 border border-border rounded-xl px-3 py-2.5 text-xs text-white
                         placeholder-white/20 outline-none focus:border-rokka-cyan/40 transition-colors
                         resize-none"
            />
            {dedication.length > 70 && (
              <span
                className={`absolute bottom-2 right-2.5 text-[9px] tabular-nums
                            ${dedication.length >= MAX_DEDICATION ? 'text-rokka-red' : 'text-white/25'}`}
              >
                {MAX_DEDICATION - dedication.length}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-card2 border border-border
                       text-white/60 text-sm font-medium active:scale-95 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isAdding}
            className="flex-1 py-2.5 rounded-xl bg-rokka-cyan/15 border border-rokka-cyan/40
                       text-rokka-cyan text-sm font-bold active:scale-95 transition-transform
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin" />
            ) : (
              '+ Agregar'
            )}
          </button>
        </div>

        {/* iOS safe area */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.div>
    </div>
  )
}
