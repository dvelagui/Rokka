'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ChatMessage } from '@rokka/supabase'

interface Props {
  messages: ChatMessage[]
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function ChatOverlay({ messages }: Props) {
  // Last 6 messages, reactions shown as floating emoji (no bubble)
  const visible = messages.slice(-6)

  return (
    <div
      className="absolute left-0 pointer-events-none z-20"
      style={{
        bottom: '24%',
        padding: 'clamp(12px, 1.5vw, 24px)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 'clamp(4px, 0.6vh, 8px)',
        maxWidth: 'clamp(200px, 38vw, 520px)',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((msg) => (
          <motion.div
            key={msg.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {msg.message_type === 'reaction' ? (
              // Reactions: just the emoji, no bubble
              <span
                style={{
                  fontSize: 'clamp(20px, 2.8vw, 38px)',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                  lineHeight: 1,
                }}
              >
                {msg.message}
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
                {/* Sender + time */}
                <div
                  style={{
                    fontSize: 'clamp(7px, 0.85vw, 10px)',
                    color:
                      msg.message_type === 'admin'
                        ? '#00e5ff'
                        : 'rgba(255,255,255,0.35)',
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                    lineHeight: 1,
                  }}
                >
                  {msg.message_type === 'admin' ? '🎛 DJ' : 'Mesa'} · {formatTime(msg.created_at)}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    background:
                      msg.message_type === 'admin'
                        ? 'rgba(0,229,255,0.35)'
                        : 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border:
                      msg.message_type === 'admin'
                        ? '1px solid rgba(0,229,255,0.28)'
                        : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'clamp(6px, 0.8vw, 10px)',
                    padding: 'clamp(4px, 0.5vh, 7px) clamp(8px, 1vw, 14px)',
                    fontSize: 'clamp(11px, 1.3vw, 18px)',
                    color: msg.message_type === 'admin' ? '#fff' : 'rgba(255,255,255,0.88)',
                    fontWeight: msg.message_type === 'admin' ? 600 : 400,
                    lineHeight: 1.35,
                    wordBreak: 'break-word' as const,
                    maxWidth: '100%',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
