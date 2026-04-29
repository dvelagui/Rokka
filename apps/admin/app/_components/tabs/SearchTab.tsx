'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  useRealtime,
  useYouTubeSearch,
  getFavorites,
  toggleFavorite,
  getGenreWithSongs,
  createGenre,
  adminAddToQueue,
} from '@rokka/supabase'
import type { FavoriteSong, GenreWithSongs } from '@rokka/supabase'
import type { GenreSongsRow } from '@rokka/shared'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Types ─────────────────────────────────────────────────────────────────────

type SubTab = 'youtube' | 'generos' | 'guardadas' | 'favoritas'

interface AddableSong {
  title: string
  artist: string
  youtubeVideoId?: string | null
  thumbnailUrl?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'youtube',   label: '🔍 YouTube'  },
  { id: 'generos',   label: '🎸 Géneros'  },
  { id: 'guardadas', label: '⭐ Guardadas' },
  { id: 'favoritas', label: '★ Favoritas' },
]

const GENRE_COLORS = [
  '#00e5ff', '#d500f9', '#ff4500', '#ff1744',
  '#00e676', '#ffd700', '#ff6d00', '#7c4dff',
  '#00bcd4', '#e91e63',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function songKey(s: { title: string; artist: string }) {
  return `${s.title}:::${s.artist}`
}

// ── SearchTab ─────────────────────────────────────────────────────────────────

export default function SearchTab() {
  const { bar }                 = useAdminContext()
  const { queue: queueState }   = useRealtime()
  const [subTab, setSubTab]     = useState<SubTab>('youtube')
  const [adding, setAdding]     = useState<Set<string>>(new Set())

  // Songs currently in queue (to disable duplicate adds)
  const queuedSet = useMemo(() => {
    const s = new Set<string>()
    for (const item of queueState.queue) {
      if (item.status === 'queued' || item.status === 'playing') s.add(songKey(item))
    }
    return s
  }, [queueState.queue])

  const handleAdd = useCallback(async (song: AddableSong) => {
    if (!bar?.id) return
    const key = songKey(song)
    if (adding.has(key) || queuedSet.has(key)) return
    setAdding((prev) => new Set([...prev, key]))
    try {
      await adminAddToQueue(bar.id, song)
    } catch (err) {
      console.error('[SearchTab] add failed:', err)
    } finally {
      setAdding((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [bar?.id, adding, queuedSet])

  return (
    <div className="space-y-3">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-card border border-[#1e1e1e] rounded-xl p-1">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`
              flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors
              ${subTab === t.id
                ? 'bg-rokka-cyan text-black'
                : 'text-white/40 hover:text-white/70'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'youtube'   && <YouTubeSection   queuedSet={queuedSet} adding={adding} onAdd={handleAdd} />}
      {subTab === 'generos'   && <GenresSection    barId={bar?.id ?? ''} queuedSet={queuedSet} adding={adding} onAdd={handleAdd} />}
      {subTab === 'guardadas' && <GuardadasSection barId={bar?.id ?? ''} queuedSet={queuedSet} adding={adding} onAdd={handleAdd} />}
      {subTab === 'favoritas' && <FavoritasSection barId={bar?.id ?? ''} queuedSet={queuedSet} adding={adding} onAdd={handleAdd} />}
    </div>
  )
}

// ── AddButton ─────────────────────────────────────────────────────────────────

function AddButton({
  song,
  queuedSet,
  adding,
  onAdd,
}: {
  song: AddableSong
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  const key       = songKey(song)
  const inQueue   = queuedSet.has(key)
  const isAdding  = adding.has(key)

  if (inQueue) {
    return (
      <span className="text-[10px] text-white/25 px-2 py-1 rounded-lg border border-white/10 shrink-0">
        en cola
      </span>
    )
  }

  return (
    <button
      onClick={() => onAdd(song)}
      disabled={isAdding}
      className="w-7 h-7 rounded-full bg-rokka-cyan/10 border border-rokka-cyan/40 text-rokka-cyan text-base font-bold flex items-center justify-center hover:bg-rokka-cyan/20 transition-colors disabled:opacity-40 shrink-0"
    >
      {isAdding ? '…' : '+'}
    </button>
  )
}

// ── SongRow ───────────────────────────────────────────────────────────────────

function SongRow({
  title,
  artist,
  youtubeVideoId,
  thumbnailUrl,
  meta,
  queuedSet,
  adding,
  onAdd,
}: {
  title: string
  artist: string
  youtubeVideoId?: string | null
  thumbnailUrl?: string | null
  meta?: React.ReactNode
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-[#1a1a1a] last:border-0">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-10 h-10 rounded-md object-cover shrink-0 bg-[#1a1a1a]"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate leading-tight">{title}</p>
        <p className="text-xs text-white/40 truncate">{artist}</p>
        {meta && <div className="mt-0.5">{meta}</div>}
      </div>
      <AddButton
        song={{ title, artist, youtubeVideoId, thumbnailUrl }}
        queuedSet={queuedSet}
        adding={adding}
        onAdd={onAdd}
      />
    </div>
  )
}

// ── YouTube Section ───────────────────────────────────────────────────────────

function YouTubeSection({
  queuedSet,
  adding,
  onAdd,
}: {
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  const { results, isSearching, error, search, clear } = useYouTubeSearch(12)
  const [query, setQuery] = useState('')

  function handleInput(v: string) {
    setQuery(v)
    if (v) search(v)
    else clear()
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Buscar en YouTube…"
          className="w-full bg-card border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); clear() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            ✕
          </button>
        )}
      </div>

      {isSearching && (
        <p className="text-center text-white/30 text-xs py-4">Buscando…</p>
      )}
      {error && (
        <p className="text-center text-rokka-red/70 text-xs py-4">{error}</p>
      )}
      {!isSearching && results.length === 0 && query.length >= 3 && !error && (
        <p className="text-center text-white/20 text-xs py-4">Sin resultados para "{query}"</p>
      )}
      {!query && (
        <p className="text-center text-white/15 text-xs py-6">Escribe al menos 3 caracteres para buscar</p>
      )}

      {results.length > 0 && (
        <div className="bg-card border border-[#1e1e1e] rounded-xl px-3">
          {results.map((r) => (
            <SongRow
              key={r.videoId}
              title={r.title}
              artist={r.artist}
              youtubeVideoId={r.videoId}
              thumbnailUrl={r.thumbnail}
              queuedSet={queuedSet}
              adding={adding}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Genres Section ────────────────────────────────────────────────────────────

function GenresSection({
  barId,
  queuedSet,
  adding,
  onAdd,
}: {
  barId: string
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  const [genres,       setGenres]       = useState<GenreWithSongs[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newEmoji,     setNewEmoji]     = useState('🎵')
  const [newColor,     setNewColor]     = useState(GENRE_COLORS[0])
  const [creating,     setCreating]     = useState(false)

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    getGenreWithSongs(barId)
      .then(setGenres)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  async function handleCreateGenre() {
    if (!barId || !newName.trim()) return
    setCreating(true)
    try {
      const g = await createGenre(barId, newName.trim(), newEmoji, newColor)
      setGenres((prev) => [...prev, { ...g, songs: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewEmoji('🎵')
      setNewColor(GENRE_COLORS[0])
      setShowCreate(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  if (isLoading) {
    return <p className="text-center text-white/20 text-xs py-8">Cargando géneros…</p>
  }

  return (
    <div className="space-y-3">
      {/* Create genre */}
      {showCreate ? (
        <div className="bg-card border border-[#2a2a2a] rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nuevo género</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="🎵"
              maxLength={2}
              className="w-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-center text-base focus:outline-none focus:border-rokka-cyan/50"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del género"
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white/60' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateGenre}
              disabled={creating || !newName.trim()}
              className="flex-1 py-1.5 rounded-lg bg-rokka-cyan text-black text-xs font-bold disabled:opacity-40 transition-opacity"
            >
              {creating ? 'Creando…' : 'Crear'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/50 text-xs hover:text-white/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-2 rounded-xl border border-dashed border-white/20 text-white/40 text-xs hover:border-rokka-cyan/40 hover:text-rokka-cyan/60 transition-colors"
        >
          + Crear género
        </button>
      )}

      {genres.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-6">Sin géneros creados</p>
      ) : (
        <div className="space-y-2">
          {genres.map((g) => (
            <div key={g.id} className="bg-card border border-[#1e1e1e] rounded-xl overflow-hidden">
              {/* Genre header */}
              <button
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <span
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: g.color }}
                />
                <span className="text-lg leading-none">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{g.name}</p>
                  <p className="text-[10px] text-white/30">
                    {g.songs.length} {g.songs.length === 1 ? 'canción' : 'canciones'}
                  </p>
                </div>
                <span className="text-white/30 text-xs">
                  {expanded === g.id ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded song list */}
              {expanded === g.id && (
                <div className="border-t border-[#1a1a1a] px-3">
                  {g.songs.length === 0 ? (
                    <p className="text-xs text-white/25 py-3 text-center">Sin canciones en este género</p>
                  ) : (
                    g.songs.map((s) => (
                      <SongRow
                        key={s.id}
                        title={s.title}
                        artist={s.artist}
                        youtubeVideoId={s.youtube_video_id}
                        queuedSet={queuedSet}
                        adding={adding}
                        onAdd={onAdd}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Guardadas Section ─────────────────────────────────────────────────────────

function GuardadasSection({
  barId,
  queuedSet,
  adding,
  onAdd,
}: {
  barId: string
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  const [genres,    setGenres]    = useState<GenreWithSongs[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter,    setFilter]    = useState('')

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    getGenreWithSongs(barId)
      .then(setGenres)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  // Flatten all songs with their genre
  const allSongs = useMemo((): Array<GenreSongsRow & { genre: GenreWithSongs }> => {
    return genres.flatMap((g) => g.songs.map((s) => ({ ...s, genre: g })))
  }, [genres])

  const filtered = useMemo(() => {
    if (!filter.trim()) return allSongs
    const q = filter.toLowerCase()
    return allSongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
    )
  }, [allSongs, filter])

  if (isLoading) {
    return <p className="text-center text-white/20 text-xs py-8">Cargando canciones guardadas…</p>
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar en guardadas…"
          className="w-full bg-card border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            ✕
          </button>
        )}
      </div>

      {allSongs.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-8">
          Aún no hay canciones guardadas en géneros
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-6">Sin resultados para "{filter}"</p>
      ) : (
        <div className="bg-card border border-[#1e1e1e] rounded-xl px-3">
          {filtered.map((s) => (
            <SongRow
              key={s.id}
              title={s.title}
              artist={s.artist}
              youtubeVideoId={s.youtube_video_id}
              meta={
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: s.genre.color + '33', color: s.genre.color }}
                >
                  {s.genre.emoji} {s.genre.name}
                </span>
              }
              queuedSet={queuedSet}
              adding={adding}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}

      {!filter && allSongs.length > 0 && (
        <p className="text-center text-white/20 text-[10px]">
          {allSongs.length} canciones en {genres.filter((g) => g.songs.length > 0).length} géneros
        </p>
      )}
    </div>
  )
}

// ── Favoritas Section ─────────────────────────────────────────────────────────

function FavoritasSection({
  barId,
  queuedSet,
  adding,
  onAdd,
}: {
  barId: string
  queuedSet: Set<string>
  adding: Set<string>
  onAdd: (s: AddableSong) => void
}) {
  const [favs,      setFavs]      = useState<FavoriteSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removing,  setRemoving]  = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    getFavorites(barId)
      .then(setFavs)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  async function handleRemoveFav(fav: FavoriteSong) {
    const key = songKey(fav)
    setRemoving((prev) => new Set([...prev, key]))
    try {
      await toggleFavorite(barId, { title: fav.title, artist: fav.artist }, true)
      setFavs((prev) => prev.filter((f) => f.id !== fav.id))
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving((prev) => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  if (isLoading) {
    return <p className="text-center text-white/20 text-xs py-8">Cargando favoritas…</p>
  }

  if (favs.length === 0) {
    return <p className="text-center text-white/20 text-xs py-8">Sin canciones favoritas</p>
  }

  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl px-3">
      {favs.map((fav) => {
        const key      = songKey(fav)
        const inQueue  = queuedSet.has(key)
        const isRemoving = removing.has(key)

        return (
          <div key={fav.id} className="flex items-center gap-2.5 py-2 border-b border-[#1a1a1a] last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{fav.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/40 truncate">{fav.artist}</span>
                {fav.times_played > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rokka-gold/15 text-rokka-gold shrink-0">
                    ×{fav.times_played}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleRemoveFav(fav)}
              disabled={isRemoving}
              title="Quitar de favoritos"
              className="text-rokka-gold text-base hover:text-white/40 transition-colors disabled:opacity-30 shrink-0"
            >
              ★
            </button>

            {inQueue ? (
              <span className="text-[10px] text-white/25 px-2 py-1 rounded-lg border border-white/10 shrink-0">
                en cola
              </span>
            ) : (
              <button
                onClick={() => onAdd({ title: fav.title, artist: fav.artist, youtubeVideoId: fav.youtube_video_id })}
                disabled={adding.has(key)}
                className="w-7 h-7 rounded-full bg-rokka-cyan/10 border border-rokka-cyan/40 text-rokka-cyan text-base font-bold flex items-center justify-center hover:bg-rokka-cyan/20 transition-colors disabled:opacity-40 shrink-0"
              >
                {adding.has(key) ? '…' : '+'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
