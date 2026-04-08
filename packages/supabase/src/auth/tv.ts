import { getSupabaseBrowserClient } from '../client'

const STORAGE_KEY = 'rokka_tv_session'

export interface TVSessionData {
  barId: string
  barSlug: string
}

/**
 * Autentica la pantalla TV con el slug del bar y el PIN de 6 dígitos
 * que el admin configura en el panel.
 * Retorna el bar_id si el PIN es correcto.
 */
export async function authenticateTV(barSlug: string, pin: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('verify_tv_pin', {
    p_bar_slug: barSlug,
    p_pin: pin,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('PIN incorrecto o bar no encontrado')
  return data as string
}

/** Guardar la sesión TV en localStorage. */
export function storeTVSession(barId: string, barSlug: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ barId, barSlug } satisfies TVSessionData))
}

/** Leer la sesión TV guardada en localStorage. */
export function getStoredTVSession(): TVSessionData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TVSessionData
  } catch {
    return null
  }
}

/** Borrar la sesión TV del localStorage. */
export function clearTVSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
