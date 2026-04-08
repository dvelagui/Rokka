'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '../client'
import { getMessages, sendMessage, type ChatMessageWithLabel, type SendMessageResult } from '../queries/chat'
import type { ChatMessage } from '../realtime/types'

// ── Reacciones permitidas ─────────────────────────────────────────────────────

export const ALLOWED_REACTIONS = ['🔥', '❤️', '😂', '🎵', '👏', '🙌', '🤘', '💃'] as const
export type Reaction = (typeof ALLOWED_REACTIONS)[number]

// ── Rate limit de reacciones: max 3 por mesa cada 5 seg ──────────────────────
const REACTION_LIMIT = 3
const REACTION_WINDOW_MS = 5_000

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReactionBroadcastPayload {
  emoji: string
  tableId: string
  x: number
}

export interface UseChatReturn {
  messages: ChatMessageWithLabel[]
  pinnedMessage: ChatMessageWithLabel | null
  isLoading: boolean
  error: string | null

  /** Envía mensaje de mesa; retorna resultado con flag de profanity si aplica */
  sendMessage: (message: string) => Promise<SendMessageResult>

  /** Envía reacción efímera por broadcast (no se guarda en DB) */
  sendReaction: (emoji: Reaction) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChat(
  barId: string | null,
  tableId: string | null,
  token: string | null,
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageWithLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Broadcast channel ref for reactions
  const bcChannelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null)

  // Rate limit tracking for reactions
  const reactionTimestamps = useRef<number[]>([])

  // ── Initial fetch ──────────────────────────────────────────────────────────

  const fetchInitial = useCallback(async () => {
    if (!barId) return
    const data = await getMessages(barId, 50)
    setMessages(data)
  }, [barId])

  // ── Realtime subscription + broadcast channel ──────────────────────────────

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchInitial()
      .catch((e) => setError((e as Error).message))
      .finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    // Postgres changes for chat messages
    const chatChannel = supabase
      .channel(`useChat:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const raw = payload.new as ChatMessage
          const withLabel: ChatMessageWithLabel = {
            ...raw,
            table_label:
              raw.message_type === 'admin'
                ? 'DJ'
                : raw.message_type === 'system'
                  ? null
                  : null, // table_label unknown in realtime payload; shown as null until refetch
          }
          setMessages((prev) => [...prev, withLabel])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, ...updated }
                : m,
            ),
          )
        },
      )
      .subscribe()

    // Broadcast channel for reactions
    const bcChannel = supabase
      .channel(`bar:${barId}:broadcast`, { config: { broadcast: { self: false } } })
      .subscribe()
    bcChannelRef.current = bcChannel

    return () => {
      void supabase.removeChannel(chatChannel)
      void supabase.removeChannel(bcChannel)
      bcChannelRef.current = null
    }
  }, [barId, fetchInitial])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (message: string): Promise<SendMessageResult> => {
      if (!barId || !token) {
        return { success: false, error: 'Sin sesión activa' }
      }
      const result = await sendMessage(barId, token, message)
      if (!result.success && 'error' in result) {
        setError(result.error)
      }
      return result
    },
    [barId, token],
  )

  const handleSendReaction = useCallback(
    (emoji: Reaction) => {
      if (!barId || !tableId) return

      // Validar emoji permitido
      if (!ALLOWED_REACTIONS.includes(emoji)) return

      // Rate limit
      const now = Date.now()
      reactionTimestamps.current = reactionTimestamps.current.filter(
        (t) => now - t < REACTION_WINDOW_MS,
      )
      if (reactionTimestamps.current.length >= REACTION_LIMIT) return
      reactionTimestamps.current.push(now)

      // Enviar via broadcast (no se guarda en DB)
      const payload: ReactionBroadcastPayload = {
        emoji,
        tableId,
        x: Math.round(Math.random() * 90 + 5), // 5–95%
      }
      bcChannelRef.current?.send({
        type: 'broadcast',
        event: 'reaction',
        payload,
      })
    },
    [barId, tableId],
  )

  // ── Derived state ──────────────────────────────────────────────────────────

  const pinnedMessage =
    [...messages].reverse().find((m) => m.is_pinned && m.message_type === 'admin') ?? null

  return {
    messages,
    pinnedMessage,
    isLoading,
    error,
    sendMessage: handleSendMessage,
    sendReaction: handleSendReaction,
  }
}
