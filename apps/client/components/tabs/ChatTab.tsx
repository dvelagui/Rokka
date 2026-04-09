'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat, ALLOWED_REACTIONS, useRealtime } from '@rokka/supabase'
import type { ChatMessageWithLabel } from '@rokka/supabase'
import { formatHour } from '@rokka/shared'
import { useTableContext } from '@/providers/TableProvider'
import { reactionsBus } from '@/lib/reactions-bus'

const MAX_LEN = 200

// ── Chat header ───────────────────────────────────────────────────────────────

function ChatHeader() {
  const { queue } = useRealtime()
  const song      = queue.currentSong

  return (
    <div className="px-3 py-2 bg-card2 border-b border-border flex items-center gap-2 shrink-0">
      <span className="w-2 h-2 rounded-full bg-rokka-red animate-pulse shrink-0" />
      <p className="text-rokka-cyan text-[10px] font-bold truncate">
        EN VIVO
        {song && (
          <>
            <span className="text-white/30 font-normal mx-1">·</span>
            <span className="text-white/70 font-semibold">{song.title}</span>
            <span className="text-white/30 font-normal mx-1">—</span>
            <span className="text-white/50 font-normal">{song.artist}</span>
          </>
        )}
      </p>
    </div>
  )
}

// ── Reaction bar ──────────────────────────────────────────────────────────────

interface ReactionBarProps {
  onReact:  (emoji: string) => void
  disabled: boolean
}

function ReactionBar({ onReact, disabled }: ReactionBarProps) {
  return (
    <div className="shrink-0 px-3 py-2 border-b border-border bg-card">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {ALLOWED_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            disabled={disabled}
            className={`w-9 h-9 shrink-0 flex items-center justify-center text-xl
                        bg-card2 border border-border rounded-[9px]
                        active:scale-90 transition-transform
                        disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Single message bubble ─────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
}: {
  msg:   ChatMessageWithLabel
  isOwn: boolean
}) {
  const time = formatHour(msg.created_at)

  // Reaction: just a big emoji, centered, no bubble
  if (msg.message_type === 'reaction') {
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-2xl select-none" title={msg.table_label ?? ''}>
          {msg.message}
        </span>
      </div>
    )
  }

  // System message
  if (msg.message_type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-white/30 text-[10px] px-2 py-0.5 bg-card rounded-full">
          ⚠️ Sistema · {msg.message}
        </span>
      </div>
    )
  }

  // Admin/DJ message
  if (msg.message_type === 'admin') {
    return (
      <div className="flex flex-col items-start gap-0.5 py-0.5">
        <span className="text-rokka-cyan/60 text-[9px] ml-2">🎛 DJ / Admin · {time}</span>
        <div className="bg-rokka-cyan/10 border border-rokka-cyan/20 rounded-2xl rounded-tl-sm
                        px-3 py-2 max-w-[82%]">
          <p className="text-rokka-cyan text-xs leading-snug">{msg.message}</p>
        </div>
      </div>
    )
  }

  // Regular user message
  const label = msg.table_label ?? 'Mesa'

  if (isOwn) {
    return (
      <div className="flex flex-col items-end gap-0.5 py-0.5">
        <span className="text-white/30 text-[9px] mr-2">{label} · {time}</span>
        <div className="bg-rokka-purple/20 border border-rokka-purple/30 rounded-2xl rounded-tr-sm
                        px-3 py-2 max-w-[82%]">
          <p className="text-white text-xs leading-snug">{msg.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-0.5 py-0.5">
      <span className="text-white/30 text-[9px] ml-2">{label} · {time}</span>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm
                      px-3 py-2 max-w-[82%]">
        <p className="text-white text-xs leading-snug">{msg.message}</p>
      </div>
    </div>
  )
}

// ── Message feed ──────────────────────────────────────────────────────────────

function MessageFeed({
  messages,
  tableId,
}: {
  messages: ChatMessageWithLabel[]
  tableId:  string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <span className="text-3xl opacity-20">💬</span>
        <p className="text-white/20 text-sm">Sé el primero en escribir</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-none px-3 py-2 space-y-0.5">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MessageBubble msg={msg} isOwn={msg.table_id === tableId} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}

// ── Chat input ────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend:   (text: string) => Promise<void>
  disabled: boolean
  banned:   boolean
  sending:  boolean
}

function ChatInput({ onSend, disabled, banned, sending }: ChatInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || sending || disabled) return
      await onSend(trimmed)
      setText('')
      inputRef.current?.focus()
    },
    [text, sending, disabled, onSend],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const remaining = MAX_LEN - text.length

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 px-3 py-2 border-t border-border bg-card flex items-center gap-2"
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKeyDown}
          disabled={disabled || banned}
          placeholder={banned ? 'Mesa baneada — no puedes enviar mensajes' : 'Escribe algo al bar...'}
          className="w-full bg-card2 border border-border rounded-full px-4 py-2 text-xs
                     text-white placeholder-white/25 outline-none
                     focus:border-rokka-purple/40 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
        {text.length > 170 && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] tabular-nums
                        ${remaining <= 10 ? 'text-rokka-red' : 'text-white/30'}`}
          >
            {remaining}
          </span>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={!text.trim() || sending || disabled || banned}
        whileTap={{ scale: 0.9 }}
        className="w-9 h-9 rounded-full bg-rokka-purple flex items-center justify-center
                   text-white text-base shrink-0
                   disabled:opacity-40 disabled:cursor-not-allowed
                   active:bg-rokka-purple/80 transition-colors"
      >
        {sending ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          '➤'
        )}
      </motion.button>
    </form>
  )
}

// ── Profanity / error toast ───────────────────────────────────────────────────

function ProfanityWarning({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{   y: 20, opacity: 0 }}
      className="shrink-0 mx-3 mb-1 bg-rokka-red/10 border border-rokka-red/30
                 rounded-xl px-3 py-2 text-rokka-red text-xs flex items-start gap-2"
    >
      <span className="shrink-0">🚫</span>
      <span className="leading-snug">
        Lenguaje inapropiado detectado. Si reincidir, la mesa será baneada automáticamente.
      </span>
    </motion.div>
  )
}

// ── ChatTab ───────────────────────────────────────────────────────────────────

export function ChatTab() {
  const { table, isBanned }    = useTableContext()
  const chat                   = useChat(
    table?.barId  ?? null,
    table?.tableId ?? null,
    table?.token   ?? null,
  )

  const [sending,       setSending]       = useState(false)
  const [showProfanity, setShowProfanity] = useState(false)

  const handleSend = useCallback(
    async (text: string) => {
      setSending(true)
      try {
        const result = await chat.sendMessage(text)
        if (!result.success && 'profanity' in result) {
          setShowProfanity(true)
        }
      } finally {
        setSending(false)
      }
    },
    [chat],
  )

  const handleReact = useCallback(
    (emoji: string) => {
      chat.sendReaction(emoji as (typeof ALLOWED_REACTIONS)[number])
      // Local particle (self: false means we won't receive our own broadcast)
      reactionsBus.emit(emoji, Math.round(Math.random() * 70 + 15))
    },
    [chat],
  )

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />

      <ReactionBar onReact={handleReact} disabled={isBanned} />

      <MessageFeed
        messages={chat.messages}
        tableId={table?.tableId ?? ''}
      />

      <AnimatePresence>
        {showProfanity && (
          <ProfanityWarning
            key="profanity"
            onDismiss={() => setShowProfanity(false)}
          />
        )}
      </AnimatePresence>

      <ChatInput
        onSend={handleSend}
        disabled={!table || chat.isLoading}
        banned={isBanned}
        sending={sending}
      />
    </div>
  )
}
