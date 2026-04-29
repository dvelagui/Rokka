'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getPlayedSongs,
  getBlockedSongs,
  getFavorites,
  toggleFavorite,
  getGenres,
  addSongToGenre,
} from '@rokka/supabase'
import type { PlayedSong } from '@rokka/supabase'
import type { GenresRow } from '@rokka/shared'
import { useAdminContext } from '../../../providers/AdminProvider'
import GenrePicker from '../GenrePicker'

// ── Helpers ───────────────────────────────────────────────────────────────────

function songKey(s: { title: string; artist: string }): string {
  return `${s.title}:::${s.artist}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── HistoryTab ────────────────────────────────────────────────────────────────

export default function HistoryTab() {
  const { bar, admin } = useAdminContext()

  const [songs,      setSongs]      = useState<PlayedSong[]>([])
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set())
  const [favs,       setFavs]       = useState<Set<string>>(new Set())
  const [isLoading,  setIsLoading]  = useState(true)

  const [genres,      setGenres]      = useState<GenresRow[]>([])
  const [genresReady, setGenresReady] = useState(false)
  const [genreMap,    setGenreMap]    = useState<Map<string, GenresRow>>(new Map())
  const [pickerFor,   setPickerFor]   = useState<PlayedSong | null>(null)

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bar?.id) return
    setIsLoading(true)
    Promise.all([
      getPlayedSongs(bar.id),
      getBlockedSongs(bar.id),
      getFavorites(bar.id),
    ])
      .then(([played, blocked, favList]) => {
        setSongs(played)
        setBlockedSet(new Set(blocked.map((b) => songKey(b))))
        setFavs(new Set(favList.map((f) => songKey(f))))
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [bar?.id])

  // ── Favorites ───────────────────────────────────────────────────────────────

  const handleToggleFav = useCallback(async (song: PlayedSong) => {
    if (!bar?.id) return
    const key         = songKey(song)
    const isFav       = favs.has(key)
    const next        = await toggleFavorite(
      bar.id,
      { title: song.title, artist: song.artist, youtubeVideoId: song.youtube_video_id },
      isFav,
    )
    setFavs((prev) => {
      const n = new Set(prev)
      next ? n.add(key) : n.delete(key)
      return n
    })
  }, [bar?.id, favs])

  // ── Genre picker ─────────────────────────────────────────────────────────────

  async function openGenrePicker(song: PlayedSong) {
    setPickerFor(song)
    if (!genresReady && bar?.id) {
      const list = await getGenres(bar.id)
      setGenres(list)
      setGenresReady(true)
    }
  }

  async function handleAssignGenre(genre: GenresRow) {
    if (!pickerFor) return
    await addSongToGenre(genre.id, {
      title:         pickerFor.title,
      artist:        pickerFor.artist,
      youtubeVideoId: pickerFor.youtube_video_id,
    })
    setGenreMap((prev) => new Map(prev).set(songKey(pickerFor), genre))
    setPickerFor(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="text-center py-12 text-white/20 text-sm">Cargando historial…</div>
  }

  if (songs.length === 0) {
    return <div className="text-center py-12 text-white/20 text-sm">Sin canciones en historial</div>
  }

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
          {songs.length} canciones reproducidas
        </p>
        {songs.map((song) => {
          const key     = songKey(song)
          const vetada  = blockedSet.has(key)
          const isFav   = favs.has(key)
          const genre   = genreMap.get(key)
          const hasBid  = song.bid_amount > 0

          const borderColor = vetada
            ? 'border-l-rokka-red'
            : hasBid
              ? 'border-l-rokka-purple/60'
              : 'border-l-[#2a2a2a]'

          return (
            <div
              key={song.id}
              style={{ opacity: vetada ? 0.65 : 1 }}
              className={`
                bg-card border border-[#1e1e1e] border-l-[3px] ${borderColor}
                rounded-xl px-3 py-2.5 space-y-1.5
              `}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-white text-sm leading-tight truncate max-w-[180px]">
                      {song.title}
                    </span>
                    {vetada && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rokka-red/20 text-rokka-red shrink-0">
                        Vetada
                      </span>
                    )}
                    {genre && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: genre.color + '33', color: genre.color }}
                      >
                        {genre.emoji} {genre.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-white/40 mt-0.5">
                    <span>{song.artist}</span>
                    {song.table_label && <span>· Mesa {song.table_label}</span>}
                    {hasBid && (
                      <span className="text-rokka-purple/80 font-semibold">
                        💰 {song.bid_amount} cr
                      </span>
                    )}
                    <span>· {fmtTime(song.added_at)}</span>
                  </div>
                  {song.dedication && (
                    <p className="text-[11px] text-white/30 italic mt-0.5 truncate">
                      "{song.dedication}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleFav(song)}
                  title={isFav ? 'Quitar favorito' : 'Agregar favorito'}
                  className={`
                    text-xs px-2 py-1 rounded-md transition-colors hover:bg-white/5
                    ${isFav ? 'text-rokka-gold' : 'text-white/40 hover:text-white/80'}
                  `}
                >
                  {isFav ? '★' : '☆'}
                </button>

                <button
                  onClick={() => openGenrePicker(song)}
                  title="Asignar género"
                  className="text-xs px-2 py-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                >
                  🏷
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {pickerFor && (
        <GenrePicker
          genres={genres}
          onSelect={handleAssignGenre}
          onClose={() => setPickerFor(null)}
        />
      )}
    </>
  )
}
