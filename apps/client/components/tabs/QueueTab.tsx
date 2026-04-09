'use client'

import { useState } from 'react'
import { useRealtime } from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { NowPlaying } from '@/components/queue/NowPlaying'
import { QueueList }  from '@/components/queue/QueueList'

// ── Skip/Keep vote banner (placeholder until Paso 3) ─────────────────────────

function VotingBanner() {
  const { queue } = useRealtime()
  const current   = queue.currentSong
  if (!current) return null

  const total       = current.skip_votes + current.keep_votes
  const skipPct     = total > 0 ? Math.round((current.skip_votes / total) * 100) : 0
  const keepPct     = 100 - skipPct

  return (
    <div className="mx-3 mt-2 bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <p className="text-white/50 text-[10px] font-medium tracking-wide">
            VOTACIÓN ACTIVA
          </p>
          {/* Progress bar: skip (red) vs keep (green) */}
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-border flex">
            <div
              className="h-full bg-rokka-red transition-all duration-500"
              style={{ width: `${skipPct}%` }}
            />
            <div
              className="h-full bg-rokka-green transition-all duration-500"
              style={{ width: `${keepPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-rokka-red">✗ Saltar {current.skip_votes}</span>
            <span className="text-rokka-green">♥ Quedar {current.keep_votes}</span>
          </div>
        </div>

        {/* Vote buttons — wired in Paso 3 */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            className="text-rokka-red text-xs font-bold bg-rokka-red/10 border border-rokka-red/30
                       rounded-lg px-3 py-1.5 active:scale-95 transition-transform"
          >
            ✗ Saltar
          </button>
          <button
            className="text-rokka-green text-xs font-bold bg-rokka-green/10 border border-rokka-green/30
                       rounded-lg px-3 py-1.5 active:scale-95 transition-transform"
          >
            ♥ Quedar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bid modal (placeholder until Paso 6) ─────────────────────────────────────

interface BidModalProps {
  song:     QueueItemWithVotes
  onClose:  () => void
}

function BidModalPlaceholder({ song, onClose }: BidModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-t-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-bold">⬆ Subir en la cola</p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <p className="text-white/60 text-sm line-clamp-1">{song.title}</p>
        <p className="text-white/30 text-xs text-center py-4">
          Sistema de pujas — disponible en la siguiente fase
        </p>
      </div>
    </div>
  )
}

// ── QueueTab ──────────────────────────────────────────────────────────────────

export function QueueTab() {
  const [bidSong, setBidSong] = useState<QueueItemWithVotes | null>(null)
  const { queue }             = useRealtime()

  return (
    <>
      <div className="pb-4">
        {/* Now Playing */}
        <NowPlaying />

        {/* Vote on current song */}
        <VotingBanner />

        {/* Queue list */}
        <div className="mt-4 px-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-xs font-semibold tracking-widest uppercase">
              Próximas canciones
            </p>
            <span className="text-white/25 text-xs tabular-nums">
              {queue.queue.filter((i) => i.status === 'queued').length} en cola
            </span>
          </div>

          <QueueList onBid={(song) => setBidSong(song)} />
        </div>
      </div>

      {/* Bid modal */}
      {bidSong && (
        <BidModalPlaceholder song={bidSong} onClose={() => setBidSong(null)} />
      )}
    </>
  )
}
