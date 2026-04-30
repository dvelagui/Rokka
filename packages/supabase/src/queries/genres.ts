import { getSupabaseBrowserClient } from '../client'
import type { GenresRow, GenreSongsRow } from '@rokka/shared'

export type { GenresRow }

export interface GenreWithSongs extends GenresRow {
  songs: GenreSongsRow[]
}

export async function getGenreWithSongs(barId: string): Promise<GenreWithSongs[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('genres')
    .select('*, genre_songs(*)')
    .eq('bar_id', barId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((g) => ({
    id:     g.id,
    bar_id: g.bar_id,
    name:   g.name,
    emoji:  g.emoji,
    color:  g.color,
    songs:  (g.genre_songs ?? []) as GenreSongsRow[],
  }))
}

export async function getGenres(barId: string): Promise<GenresRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .eq('bar_id', barId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as GenresRow[]
}

export async function addSongToGenre(
  genreId: string,
  song: { title: string; artist: string; youtubeVideoId?: string | null },
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('genre_songs').insert({
    genre_id:         genreId,
    title:            song.title,
    artist:           song.artist,
    youtube_video_id: song.youtubeVideoId ?? null,
  })
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function removeSongFromGenre(
  genreId: string,
  title: string,
  artist: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('genre_songs')
    .delete()
    .eq('genre_id', genreId)
    .eq('title', title)
    .eq('artist', artist)
  if (error) throw new Error(error.message)
}

export async function createGenre(
  barId: string,
  name: string,
  emoji: string,
  color: string,
): Promise<GenresRow> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('genres')
    .insert({ bar_id: barId, name, emoji, color })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as GenresRow
}

export async function deleteGenre(genreId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('genres').delete().eq('id', genreId)
  if (error) throw new Error(error.message)
}
