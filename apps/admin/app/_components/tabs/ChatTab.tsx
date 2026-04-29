'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  useRealtime,
  sendAdminMessage,
  updateBarConfig,
  addLogEntry,
} from '@rokka/supabase'
import type { ChatMessage } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_QUICK_MESSAGES = [
  '🎧 Noche de Reggaeton — ¡a perrear toda la noche!',
  '🎸 Rock Clásico esta noche 🤘',
  '🍹 Open Bar hasta las 11PM',
  '🏆 ¡Premio a la mesa con más pujas!',
  '🎉 ¡Bienvenidos al show de esta noche!',
  '📢 ¡Pide tu canción favorita ahora!',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// ── ChatTab ───────────────────────────────────────────────────────────────────

export default function ChatTab() {
  const { bar, barConfig, admin, refreshBar } = useAdminContext()
  const { chat, tables }                      = useRealtime()

  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  // Init quick message history from persisted barConfig
  useEffect(() => {
    const saved = barConfig?.pinned_history
    setHistory(saved?.length ? saved : DEFAULT_QUICK_MESSAGES)
  }, [barConfig?.pinned_history])

  // Build table label map from realtime tables state
  const tableLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tables?.tables ?? []) map.set(t.id, t.label)
    return map
  }, [tables?.tables])

  // Auto-scroll feed to bottom on new messages
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages.length])

  // ── Send pinned message ─────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (message: string) => {
      const trimmed = message.trim()
      if (!bar?.id || !trimmed || sending) return
      setSending(true)
      try {
        // 1. Broadcast to chat as admin (pinned)
        await sendAdminMessage(bar.id, trimmed, true)

        // 2. Update local history + persist
        const newHistory = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 6)
        setHistory(newHistory)
        await updateBarConfig(bar.id, { pinned_history: newHistory })

        // 3. Log
        await addLogEntry(bar.id, admin?.email ?? 'admin', 'pin_message', `Fijó: "${trimmed}"`)

        // 4. Sync AdminProvider context
        void refreshBar()

        setText('')
      } catch (err) {
        console.error('[ChatTab] send failed:', err)
      } finally {
        setSending(false)
      }
    },
    [bar?.id, history, sending, admin?.email, refreshBar],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void handleSend(text)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Quick messages */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
          📌 Mensajes Rápidos
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {history.slice(0, 6).map((msg, i) => (
            <button
              key={i}
              onClick={() => void handleSend(msg)}
              disabled={sending}
              title={msg}
              className="bg-card border border-[#1e1e1e] rounded-xl px-3 py-2 text-left text-xs text-white/55 hover:border-rokka-cyan/40 hover:text-white/85 hover:bg-rokka-cyan/5 transition-colors disabled:opacity-40 truncate"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* Messages feed */}
      <div className="bg-card border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="h-[44vh] overflow-y-auto px-3 py-3 space-y-2">
          {chat.isLoading ? (
            <p className="text-center text-white/20 text-xs py-8">Cargando chat…</p>
          ) : chat.messages.length === 0 ? (
            <p className="text-center text-white/20 text-xs py-8">Sin mensajes aún</p>
          ) : (
            chat.messages.map((m) => (
              <MessageBubble key={m.id} message={m} tableLabelMap={tableLabelMap} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje para fijar en pantalla…"
          maxLength={200}
          className="flex-1 bg-card border border-rokka-cyan/20 rounded-[22px] px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-rokka-cyan flex items-center justify-center text-black text-base font-bold disabled:opacity-30 hover:bg-rokka-cyan/80 transition-all shrink-0"
        >
          {sending ? '…' : '➤'}
        </button>
      </form>
      <p className="text-[9px] text-white/20 text-center -mt-1">
        El mensaje queda fijo en la app de todos los clientes y en la TV
      </p>
    </div>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  tableLabelMap,
}: {
  message: ChatMessage
  tableLabelMap: Map<string, string>
}) {
  const time    = fmtTime(message.created_at)
  const isAdmin = message.message_type === 'admin'

  // System messages: centered divider
  if (message.message_type === 'system') {
    return (
      <div className="flex items-center gap-2 my-1">
        <div className="flex-1 h-px bg-white/10" />
        <p className="text-[10px] text-white/25 shrink-0 px-1">{message.message}</p>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    )
  }

  // Reaction messages: centered emoji
  if (message.message_type === 'reaction') {
    return (
      <p className="text-center text-lg leading-none my-1" title={time}>
        {message.message}
      </p>
    )
  }

  const label = isAdmin
    ? '🎛 Admin'
    : message.table_id
      ? `Mesa ${tableLabelMap.get(message.table_id) ?? '?'}`
      : 'Mesa'

  return (
    <div className={`flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-semibold ${isAdmin ? 'text-rokka-cyan' : 'text-white/40'}`}>
          {label}
        </span>
        {message.is_pinned && (
          <span className="text-[9px] leading-none" title="Mensaje fijado">📌</span>
        )}
        <span className="text-[9px] text-white/20">{time}</span>
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[82%] px-3 py-1.5 text-sm leading-snug
          ${isAdmin
            ? 'bg-rokka-cyan/10 border border-rokka-cyan/25 text-white rounded-2xl rounded-tr-sm'
            : 'bg-[#1c1c1c] border border-[#272727] text-white/80 rounded-2xl rounded-tl-sm'
          }
        `}
      >
        {message.message}
      </div>
    </div>
  )
}
