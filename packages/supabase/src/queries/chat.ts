import { getSupabaseBrowserClient } from '../client'
import type { ChatMessage } from '../realtime/types'

// ── Extended type with table label ────────────────────────────────────────────

export interface ChatMessageWithLabel extends ChatMessage {
  /** "Mesa 5", "DJ" para mensajes admin, null para mensajes de sistema */
  table_label: string | null
}

// ── Result types ──────────────────────────────────────────────────────────────

export type SendMessageResult =
  | { success: true;  data: ChatMessage }
  | { success: false; profanity: true; banned?: true }
  | { success: false; error: string }

// ── Queries ───────────────────────────────────────────────────────────────────

/** Últimos N mensajes del bar con label de mesa. */
export async function getMessages(
  barId: string,
  limit = 50,
): Promise<ChatMessageWithLabel[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, tables(label)')
    .eq('bar_id', barId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data ?? []) as (ChatMessage & { tables: { label: string } | null })[]).map(
    (row) => ({
      ...row,
      table_label:
        row.message_type === 'admin'
          ? 'DJ'
          : row.message_type === 'system'
            ? null
            : (row.tables?.label ?? null),
      tables: undefined, // strip joined relation from returned object
    }),
  )
}

/** Enviar mensaje de mesa con filtro de groserías y autoban. */
export async function sendMessage(
  barId: string,
  token: string,
  message: string,
): Promise<SendMessageResult> {
  if (message.trim().length === 0) {
    return { success: false, error: 'Mensaje vacío' }
  }
  if (message.length > 200) {
    return { success: false, error: 'Mensaje demasiado largo (máx 200 caracteres)' }
  }

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('send_message_safe', {
    p_bar_id:  barId,
    p_token:   token,
    p_message: message.trim(),
  })

  if (error) return { success: false, error: error.message }

  const result = data as {
    success: boolean
    profanity?: boolean
    banned?: boolean
    error?: string
    data?: ChatMessage
  }

  if (!result.success) {
    if (result.profanity) {
      return { success: false, profanity: true, ...(result.banned ? { banned: true } : {}) }
    }
    return { success: false, error: result.error ?? 'Error desconocido' }
  }

  return { success: true, data: result.data as ChatMessage }
}

/** Enviar mensaje de admin (DJ). */
export async function sendAdminMessage(
  barId: string,
  message: string,
  isPinned = false,
): Promise<ChatMessage> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('send_admin_chat_message', {
    p_bar_id:    barId,
    p_message:   message,
    p_is_pinned: isPinned,
  })
  if (error) throw new Error(error.message)
  return data as ChatMessage
}

/** Mensaje de admin fijado actualmente (null si no hay). */
export async function getPinnedMessage(barId: string): Promise<ChatMessageWithLabel | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('bar_id', barId)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return { ...(data as ChatMessage), table_label: 'DJ' }
}
