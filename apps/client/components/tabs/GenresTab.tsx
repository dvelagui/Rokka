'use client'

import { useEffect, useState }  from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@rokka/supabase'
import { useAddSong }               from '@/lib/use-add-song'
import { DedicationModal }           from '@/components/modals/DedicationModal'
import { WarningToast }             from '@/components/queue/WarningToast'
import { useTableContext }           from '@/providers/TableProvider'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GenreSong {
  id:               string
  title:            string
  artist:           string
  youtube_video_id: string | null
}

interface Genre {
  id:    string
  name:  string
  emoji: string
  color: string
  genre_songs: GenreSong[]
}

// ── Genre grid button ─────────────────────────────────────────────────────────

function GenreCard({ genre, onClick }: { genre: Genre; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-5 px-3
                 active:scale-95 transition-transform text-center"
      style={{
        backgroundColor: genre.color + '14',
        borderColor:     genre.color + '42',
      }}
    >
      <span className="text-[26px] leading-none">{genre.emoji}</span>
      <p
        className="text-xs font-bold leading-tight"
        style={{ color: genre.color }}
      >
        {genre.name}
      </p>
      <p className="text-muted text-[9px]">
        {genre.genre_songs.length} canción{genre.genre_songs.length !== 1 ? 'es' : ''}
      </p>
    </button>
  )
}

// ── Song row inside a genre ───────────────────────────────────────────────────

function GenreSongRow({
  song,
  color,
  inQueue,
  onAdd,
}: {
  song:    GenreSong
  color:   string
  inQueue: boolean
  onAdd:   () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold line-clamp-1">{song.title}</p>
        <p className="text-white/40 text-[10px]">{song.artist}</p>
      </div>
      {inQueue ? (
        <span className="text-white/30 text-[10px]">ya en lista</span>
      ) : (
        <button
          onClick={onAdd}
          className="w-[30px] h-[30px] shrink-0 rounded-full border font-bold text-lg
                     flex items-center justify-center active:scale-90 transition-transform"
          style={{
            color:            color,
            borderColor:      color + '60',
            backgroundColor:  color + '15',
          }}
        >
          +
        </button>
      )}
    </div>
  )
}

// ── GenresTab ─────────────────────────────────────────────────────────────────

export function GenresTab() {
  const { table }         = useTableContext()
  const addSong           = useAddSong()

  const [genres, setGenres]     = useState<Genre[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeGenre, setActive] = useState<Genre | null>(null)

  useEffect(() => {
    if (!table?.barId) return
    const supabase = getSupabaseBrowserClient()

    supabase
      .from('genres')
      .select('id, name, emoji, color, genre_songs(id, title, artist, youtube_video_id)')
      .eq('bar_id', table.barId)
      .order('name')
      .then(({ data }) => {
        setGenres((data ?? []) as Genre[])
        setLoading(false)
      })
  }, [table?.barId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-8 h-8 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin" />
      </div>
    )
  }

  if (genres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl opacity-20">🎸</span>
        <p className="text-white/25 text-sm">No hay géneros configurados aún</p>
      </div>
    )
  }

  return (
    <>
      <WarningToast message={addSong.warning} onDismiss={addSong.dismissWarning} />

      <div className="px-3 pt-3 pb-6">
        <AnimatePresence mode="wait">
          {/* ── Genre grid ── */}
          {!activeGenre && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{   opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-muted text-[10px] text-center mb-3">
                Elige un género y selecciona tu canción
              </p>
              <div className="grid grid-cols-2 gap-2">
                {genres.map((g) => (
                  <GenreCard key={g.id} genre={g} onClick={() => setActive(g)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Song list ── */}
          {activeGenre && (
            <motion.div
              key={activeGenre.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{   opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {/* Back + genre header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActive(null)}
                  className="text-white/40 text-xs hover:text-white/70 transition-colors"
                >
                  ← Géneros
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{activeGenre.emoji}</span>
                  <p
                    className="text-sm font-bold"
                    style={{ color: activeGenre.color }}
                  >
                    {activeGenre.name}
                  </p>
                </div>
              </div>

              {/* Songs */}
              {activeGenre.genre_songs.length === 0 ? (
                <p className="text-white/25 text-xs text-center py-8">
                  Sin canciones en este género
                </p>
              ) : (
                <div className="space-y-2">
                  {activeGenre.genre_songs.map((song) => (
                    <GenreSongRow
                      key={song.id}
                      song={song}
                      color={activeGenre.color}
                      inQueue={addSong.isInQueue(song.title, song.youtube_video_id ?? undefined)}
                      onAdd={() =>
                        addSong.initAdd({
                          title:          song.title,
                          artist:         song.artist,
                          youtubeVideoId: song.youtube_video_id ?? undefined,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {addSong.pending && (
          <DedicationModal
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
