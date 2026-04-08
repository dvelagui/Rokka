import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string
  bar_id: string
  actor: string
  action: string
  detail: string
  created_at: string
  /** Hora local formateada "HH:MM" */
  hora: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Log paginado de actividad del bar. */
export async function getActivityLog(
  barId: string,
  limit = 50,
  offset = 0,
): Promise<ActivityLogEntry[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(error.message)

  return ((data ?? []) as Omit<ActivityLogEntry, 'hora'>[]).map((row) => ({
    ...row,
    hora: new Date(row.created_at).toLocaleTimeString('es', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }))
}

/** Helper: insertar entrada en el log de actividad. */
export async function addLogEntry(
  barId: string,
  actor: string,
  action: string,
  detail: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('activity_log').insert({
    bar_id: barId,
    actor,
    action,
    detail,
  })
  if (error) throw new Error(error.message)
}
