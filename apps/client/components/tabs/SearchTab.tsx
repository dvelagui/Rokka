'use client'

import { useState }          from 'react'
import { AnimatePresence }   from 'framer-motion'
import { useYouTubeSearch }  from '@rokka/supabase'
import { useAddSong }        from '@/lib/use-add-song'
import { DedicationModal }   from '@/components/modals/DedicationModal'
import { WarningToast }      from '@/components/queue/WarningToast'

export function SearchTab() {
  const [query, setQuery]   = useState('')
  const yt                  = useYouTubeSearch(10)
  const addSong             = useAddSong()

  const handleChange = (value: string) => {
    setQuery(value)
    yt.search(value)
  }

  return (
    <>
      <WarningToast message={addSong.warning} onDismiss={addSong.dismissWarning} />

      <div className="flex flex-col gap-3 px-3 pt-3 pb-6">
        {/* Search input */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-base pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Buscar en YouTube..."
            className="w-full bg-card border border-border rounded-full pl-10 pr-10 py-2.5
                       text-sm text-white placeholder-white/25 outline-none
                       focus:border-rokka-cyan/40 transition-colors"
          />
          {yt.isSearching && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <span className="w-4 h-4 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin block" />
            </span>
          )}
        </div>

        {/* Empty state */}
        {!query && !yt.isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl opacity-20">🎵</span>
            <p className="text-white/25 text-sm">Escribe para buscar en YouTube</p>
          </div>
        )}

        {/* No results */}
        {query.length >= 3 && !yt.isSearching && yt.results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl opacity-20">😶</span>
            <p className="text-white/25 text-sm">Sin resultados para &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Results */}
        {yt.results.length > 0 && (
          <ul className="space-y-2">
            {yt.results.map((result) => {
              const inQueue = addSong.isInQueue(result.title, result.videoId)
              return (
                <li
                  key={result.videoId}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5"
                >
                  {/* Thumbnail */}
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-[52px] h-[38px] object-cover rounded-lg shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold line-clamp-1">{result.title}</p>
                    <p className="text-white/40 text-[10px] line-clamp-1">{result.artist}</p>
                  </div>

                  {/* Add button */}
                  {inQueue ? (
                    <span className="shrink-0 text-white/30 text-[10px] opacity-60">ya en lista</span>
                  ) : (
                    <button
                      onClick={() =>
                        addSong.initAdd({
                          title:          result.title,
                          artist:         result.artist,
                          youtubeVideoId: result.videoId,
                          thumbnailUrl:   result.thumbnail,
                        })
                      }
                      className="w-[30px] h-[30px] shrink-0 rounded-full bg-rokka-cyan/15
                                 border border-rokka-cyan/40 text-rokka-cyan font-bold text-lg
                                 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Dedication modal */}
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
