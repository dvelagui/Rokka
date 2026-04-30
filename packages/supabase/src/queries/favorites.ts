import { getSupabaseBrowserClient } from '../client'

export interface FavoriteSong {
  id: string
  title: string
  artist: string
  youtube_video_id: string | null
  times_played: number
  added_at: string
}

export async function getFavorites(barId: string): Promise<FavoriteSong[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('bar_id', barId)
    .order('times_played', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as FavoriteSong[]
}

export async function addFavorite(
  barId: string,
  song: { title: string; artist: string; youtubeVideoId?: string | null },
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('favorites').insert({
    bar_id:           barId,
    title:            song.title,
    artist:           song.artist,
    youtube_video_id: song.youtubeVideoId ?? null,
  })
  // 23505 = unique constraint violation (already favorited)
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function removeFavorite(barId: string, title: string, artist: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('bar_id', barId)
    .eq('title', title)
    .eq('artist', artist)
  if (error) throw new Error(error.message)
}

export async function toggleFavorite(
  barId: string,
  song: { title: string; artist: string; youtubeVideoId?: string | null },
  currentlyFavorited: boolean,
): Promise<boolean> {
  if (currentlyFavorited) {
    await removeFavorite(barId, song.title, song.artist)
    return false
  }
  await addFavorite(barId, song)
  return true
}
