import { getSupabaseBrowserClient } from '../client'

const STORAGE_KEY = 'rokka_table_session'

export interface TableSessionData {
  barId: string
  tableId: string
  tableNumber: number
  label: string
  credits: number
}

export interface StoredTableSession {
  token: string
}

/**
 * Admin: genera (o renueva) el token QR de una mesa.
 * Llama al RPC refresh_table_session — requiere authenticated.
 */
export async function createTableSession(
  barId: string,
  tableId: string,
): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('refresh_table_session', {
    p_bar_id: barId,
    p_table_id: tableId,
  })
  if (error) throw new Error(error.message)
  return data as string
}

/**
 * Cliente: valida el token que viene en la URL del QR.
 * Llama al RPC get_table_by_token (SECURITY DEFINER, accesible por anon).
 * Retorna los datos de la mesa o null si el token es inválido.
 */
export async function validateTableSession(
  token: string,
): Promise<TableSessionData | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_table_by_token', {
    p_token: token,
  })
  if (error || !data || (data as unknown[]).length === 0) return null

  const row = (data as Record<string, unknown>[])[0]
  if (!row.is_active || row.is_banned) return null

  return {
    barId: row.bar_id as string,
    tableId: row.table_id as string,
    tableNumber: row.table_number as number,
    label: row.label as string,
    credits: row.credits as number,
  }
}

/** Guardar el token de sesión de mesa en localStorage. */
export function storeTableSession(token: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token } satisfies StoredTableSession))
}

/** Leer el token de sesión de mesa guardado en localStorage. */
export function getStoredTableSession(): StoredTableSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTableSession
  } catch {
    return null
  }
}

/** Borrar la sesión de mesa del localStorage. */
export function clearTableSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
