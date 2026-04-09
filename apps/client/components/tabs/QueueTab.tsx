'use client'

import { useState } from 'react'
import { useRealtime } from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { NowPlaying }     from '@/components/queue/NowPlaying'
import { VotingSection }  from '@/components/queue/VotingSection'
import { QueueList }      from '@/components/queue/QueueList'
import { useTableContext } from '@/providers/TableProvider'

// ── Bid modal (placeholder until Paso 6) ─────────────────────────────────────

function BidModalPlaceholder({
  song,
  onClose,
}: {
  song:    QueueItemWithVotes
  onClose: () => void
}) {
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
  const { table }             = useTableContext()

  const currentSong = queue.currentSong

  return (
    <>
      <div className="pb-4">
        {/* Now Playing */}
        <NowPlaying />

        {/* Voting — only when a song is actively playing and we have a session */}
        {currentSong && table && (
          <VotingSection
            currentQueueId={currentSong.id}
            barId={table.barId}
            tableId={table.tableId}
          />
        )}

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
