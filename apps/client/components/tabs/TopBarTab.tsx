'use client'

import { useEffect, useState }   from 'react'
import { AnimatePresence }        from 'framer-motion'
import { getTopSongs }            from '@rokka/supabase'
import type { TopSong }           from '@rokka/supabase'
import { formatCredits }          from '@rokka/shared'
import { HIGH_BID_THRESHOLD }     from '@rokka/shared'
import { useAddSong }             from '@/lib/use-add-song'
import { AddSongModal }           from '@/components/queue/AddSongModal'
import { WarningToast }           from '@/components/queue/WarningToast'
import { useTableContext }         from '@/providers/TableProvider'

// ── Medal helpers ─────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'] as const

const PODIUM_BORDER: Record<number, string> = {
  0: '#FFD700',  // gold
  1: '#C0C0C0',  // silver
  2: '#CD7F32',  // bronze
}

// ── TopBarTab ─────────────────────────────────────────────────────────────────

export function TopBarTab() {
  const { table }        = useTableContext()
  const addSong          = useAddSong()

  const [songs, setSongs]   = useState<TopSong[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!table?.barId) return
    getTopSongs(table.barId, 15)
      .then((data) => { setSongs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [table?.barId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-8 h-8 rounded-full border-2 border-rokka-gold/40 border-t-rokka-gold animate-spin" />
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl opacity-20">⭐</span>
        <p className="text-white/25 text-sm">Aún no hay historial de canciones</p>
      </div>
    )
  }

  return (
    <>
      <WarningToast message={addSong.warning} onDismiss={addSong.dismissWarning} />

      <div className="px-3 pt-3 pb-6 space-y-2">
        <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-3">
          Las más pedidas esta semana
        </p>

        {songs.map((song, index) => {
          const inQueue    = addSong.isInQueue(song.title)
          const borderColor = PODIUM_BORDER[index]
          const hasHighBid = song.max_bid >= HIGH_BID_THRESHOLD

          return (
            <div
              key={`${song.title}-${index}`}
              className="flex items-center gap-3 bg-card rounded-xl px-3 py-3 border border-border border-l-2"
              style={borderColor ? { borderLeftColor: borderColor } : undefined}
            >
              {/* Medal or number */}
              <div className="w-8 shrink-0 flex items-center justify-center">
                {index < 3 ? (
                  <span className="text-xl leading-none">{MEDALS[index]}</span>
                ) : (
                  <span className="text-white/25 text-xs font-bold tabular-nums">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Song info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-white text-xs font-semibold line-clamp-1">{song.title}</p>
                <p className="text-white/40 text-[10px] line-clamp-1">{song.artist}</p>

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-rokka-cyan text-[10px]">
                    {song.times_played} pedido{song.times_played !== 1 ? 's' : ''}
                  </span>
                  {hasHighBid && (
                    <span className="text-rokka-purple text-[10px]">
                      top {formatCredits(song.max_bid)}
                    </span>
                  )}
                </div>
              </div>

              {/* Add button */}
              {inQueue ? (
                <span className="text-white/30 text-[10px] shrink-0">ya en lista</span>
              ) : (
                <button
                  onClick={() =>
                    addSong.initAdd({ title: song.title, artist: song.artist })
                  }
                  className="w-[30px] h-[30px] shrink-0 rounded-full bg-rokka-cyan/15
                             border border-rokka-cyan/40 text-rokka-cyan font-bold text-lg
                             flex items-center justify-center active:scale-90 transition-transform"
                >
                  +
                </button>
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {addSong.pending && (
          <AddSongModal
            key="add-modal"
            song={addSong.pending}
            isAdding={addSong.isAdding}
            onConfirm={addSong.confirmAdd}
            onCancel={addSong.cancelAdd}
          />
        )}
      </AnimatePresence>
    </>
  )
}
