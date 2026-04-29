import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Configuración del bar almacenada en bars.config (JSONB) + tv_pin column */
export interface BarConfig {
  /** Duración promedio de canción en segundos */
  avg_song_duration: number
  /** Número máximo de mesas */
  max_tables: number
  /** Puja mínima en créditos */
  min_bid: number
  /** Activar filtro de groserías */
  profanity_filter: boolean
  /** Permitir dedicatorias en canciones */
  allow_dedications: boolean
  /** % de votos skip para saltar automáticamente (0–100) */
  auto_skip_threshold: number
  /** Máximo de canciones por mesa en la cola */
  max_canciones_por_mesa: number
  /** PIN de acceso a pantalla TV */
  tv_pin: string
  /** Hora de cierre del bar (HH:MM, 24h). 1h antes no se aceptan más canciones. */
  closing_time?: string
  /** Mensajes fijos recientes del admin (últimos 6, persisted in JSONB config) */
  pinned_history?: string[]
  /** Mostrar anuncios de terceros en App y TV */
  third_party_ads?: boolean
  /** Campos heredados del schema original */
  volumen_default?: number
  chat_habilitado?: boolean
  pedidos_habilitado?: boolean
  limite_pujas?: number
}

export interface BarProfile {
  id: string
  name: string
  emoji: string
  logo_url: string | null
  slug: string
  config: BarConfig
  tv_pin: string | null
  created_at: string
  updated_at: string
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Retorna la fila completa del bar incluyendo config y tv_pin. */
export async function getBarConfig(barId: string): Promise<BarProfile> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('bars')
    .select('*')
    .eq('id', barId)
    .single()
  if (error) throw new Error(error.message)
  return data as BarProfile
}

/**
 * Merge parcial de la configuración del bar.
 * Si se incluye `tv_pin`, se actualiza también la columna dedicada.
 * Retorna el config final.
 */
export async function updateBarConfig(
  barId: string,
  config: Partial<BarConfig>,
): Promise<BarConfig> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('update_bar_config', {
    p_bar_id: barId,
    p_config: config,
  })
  if (error) throw new Error(error.message)
  return data as BarConfig
}

/** Actualizar nombre, emoji o logo del bar. */
export async function updateBarProfile(
  barId: string,
  data: Partial<{ name: string; emoji: string; logoUrl: string }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const update: Record<string, string> = {}
  if (data.name)    update.name     = data.name
  if (data.emoji)   update.emoji    = data.emoji
  if (data.logoUrl) update.logo_url = data.logoUrl

  const { error } = await supabase
    .from('bars')
    .update(update)
    .eq('id', barId)
  if (error) throw new Error(error.message)
}
