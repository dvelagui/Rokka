import { getSupabaseBrowserClient } from '../client'
import { addLogEntry } from './log'

export interface PlayedSong {
  id: string
  title: string
  artist: string
  youtube_video_id: string | null
  table_label: string | null
  bid_amount: number
  status: 'played' | 'skipped'
  added_at: string
  dedication: string | null
}

export interface BlockedSong {
  id: string
  title: string
  artist: string
  blocked_by: string
  reason: string | null
  created_at: string
}

export async function getPlayedSongs(barId: string, limit = 50): Promise<PlayedSong[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('queue')
    .select('id,title,artist,youtube_video_id,bid_amount,status,added_at,dedication,tables(label)')
    .eq('bar_id', barId)
    .in('status', ['played', 'skipped'])
    .order('added_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id:               row.id,
    title:            row.title,
    artist:           row.artist,
    youtube_video_id: row.youtube_video_id,
    bid_amount:       row.bid_amount,
    status:           row.status as 'played' | 'skipped',
    added_at:         row.added_at,
    dedication:       row.dedication,
    table_label:      (row.tables as { label?: string } | null)?.label ?? null,
  }))
}

export async function getBlockedSongs(barId: string): Promise<BlockedSong[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('blocked_songs')
    .select('id,title,artist,blocked_by,reason,created_at')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as BlockedSong[]
}

export async function adminAddToQueue(
  barId: string,
  song: {
    title: string
    artist: string
    youtubeVideoId?: string | null
    thumbnailUrl?: string | null
  },
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { data: pos } = await supabase
    .from('queue')
    .select('position')
    .eq('bar_id', barId)
    .in('status', ['queued', 'playing'])
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('queue').insert({
    bar_id:           barId,
    title:            song.title,
    artist:           song.artist,
    youtube_video_id: song.youtubeVideoId ?? null,
    thumbnail_url:    song.thumbnailUrl ?? null,
    table_id:         null,
    bid_amount:       0,
    position:         (pos?.position ?? 0) + 1,
    status:           'queued',
  })
  if (error) throw new Error(error.message)
}

export async function vetarCancion(params: {
  queueId: string
  barId: string
  title: string
  artist: string
  blockedBy: string
}): Promise<void> {
  const supabase = getSupabaseBrowserClient()

  // Move to history (status = 'skipped') instead of deleting
  const { error: updateError } = await supabase
    .from('queue')
    .update({ status: 'skipped' })
    .eq('id', params.queueId)
    .eq('bar_id', params.barId)
  if (updateError) throw new Error(updateError.message)

  // Block so users can't request it again
  const { error: blockError } = await supabase.from('blocked_songs').insert({
    bar_id:     params.barId,
    title:      params.title,
    artist:     params.artist,
    blocked_by: params.blockedBy,
    reason:     'vetada por admin',
  })
  if (blockError && blockError.code !== '23505') throw new Error(blockError.message)

  await addLogEntry(
    params.barId,
    params.blockedBy,
    'song_vetoed',
    `Vetada: "${params.title}" de ${params.artist}`,
  )
}
