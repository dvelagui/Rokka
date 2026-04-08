'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '../client'
import type { ChatMessage, ConnectionStatus } from './types'

const INITIAL_MESSAGES_LIMIT = 50

export interface ChatRealtimeState {
  messages: ChatMessage[]
  pinnedMessages: ChatMessage[]
  isLoading: boolean
  status: ConnectionStatus
}

export function useChatRealtime(barId: string | null): ChatRealtimeState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const fetchInitial = useCallback(async () => {
    if (!barId) return
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('bar_id', barId)
      .order('created_at', { ascending: true })
      .limit(INITIAL_MESSAGES_LIMIT)
    if (!error && data) {
      setMessages(data as ChatMessage[])
    }
  }, [barId])

  useEffect(() => {
    if (!barId) {
      setIsLoading(false)
      setStatus('disconnected')
      return
    }

    setIsLoading(true)
    fetchInitial().finally(() => setIsLoading(false))

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`chat-rt:${barId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => [...prev, newMsg])
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
            prev.map((m) => (m.id === updated.id ? updated : m)),
          )
        },
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('connected')
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('reconnecting')
        else if (s === 'CLOSED') setStatus('disconnected')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [barId, fetchInitial])

  const pinnedMessages = messages.filter((m) => m.is_pinned)

  return { messages, pinnedMessages, isLoading, status }
}
