import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoteTotals {
  skip: number
  keep: number
  total: number
}

export interface CastVoteResult extends VoteTotals {
  wasSkipped: boolean
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Conteo de votos skip/keep para una canción. */
export async function getVotes(queueId: string): Promise<VoteTotals> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('queue_id', queueId)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as { vote_type: 'skip' | 'keep' }[]
  const skip = rows.filter((v) => v.vote_type === 'skip').length
  const keep = rows.filter((v) => v.vote_type === 'keep').length

  return { skip, keep, total: skip + keep }
}

/**
 * Emitir/cambiar voto de una mesa. Comprueba el umbral de skip automático.
 * Si skip > 50% de mesas activas, salta la canción y devuelve creditos.
 */
export async function castVote(
  queueId: string,
  tableId: string,
  barId: string,
  voteType: 'skip' | 'keep',
): Promise<CastVoteResult> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('cast_vote_and_check', {
    p_queue_id:  queueId,
    p_table_id:  tableId,
    p_bar_id:    barId,
    p_vote_type: voteType,
  })

  if (error) throw new Error(error.message)

  const result = data as { skip: number; keep: number; total: number; was_skipped: boolean }
  return {
    skip:       result.skip,
    keep:       result.keep,
    total:      result.total,
    wasSkipped: result.was_skipped,
  }
}

/** Voto actual de una mesa para una canción, o null si no ha votado. */
export async function getMyVote(
  queueId: string,
  tableId: string,
): Promise<'skip' | 'keep' | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('queue_id', queueId)
    .eq('table_id', tableId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as { vote_type: 'skip' | 'keep' } | null)?.vote_type ?? null
}
