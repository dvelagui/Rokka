'use client'

import { useState }              from 'react'
import { AnimatePresence }        from 'framer-motion'
import { useRealtime }            from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { NowPlaying }             from '@/components/queue/NowPlaying'
import { VotingSection }          from '@/components/queue/VotingSection'
import { QueueList }              from '@/components/queue/QueueList'
import { BidModal }               from '@/components/modals/BidModal'
import { useTableContext }         from '@/providers/TableProvider'

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
      <AnimatePresence>
        {bidSong && (
          <BidModal
            key="bid-modal"
            song={bidSong}
            onClose={() => setBidSong(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
