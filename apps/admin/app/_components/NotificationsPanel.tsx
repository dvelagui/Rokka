'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { AdminNotification } from '@rokka/supabase'

const KIND_ICON: Record<string, string> = {
  table_call:   '📣',
  new_order:    '🛎️',
  high_bid:     '💰',
  auto_ban:     '🚫',
  song_skipped: '⏭️',
}

function fmt(date: Date): string {
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  notifications: AdminNotification[]
  onMarkAllRead: () => void
  onDismiss: (id: string) => void
  onClose: () => void
}

export default function NotificationsPanel({ notifications, onMarkAllRead, onDismiss, onClose }: Props) {
  useEffect(() => { onMarkAllRead() }, [onMarkAllRead])

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-[calc(100%+8px)] w-[270px] bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
          Notificaciones
        </span>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-white/30 text-sm">Sin notificaciones</p>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} n={n} onDismiss={onDismiss} />
          ))
        )}
      </div>
    </motion.div>
  )
}

function NotifItem({ n, onDismiss }: { n: AdminNotification; onDismiss: (id: string) => void }) {
  const isCall = n.kind === 'table_call'
  return (
    <div className={`
      px-4 py-3 border-b border-[#1a1a1a] last:border-0
      ${isCall ? 'bg-rokka-green/[0.08]' : ''}
      ${!n.read ? 'bg-white/[0.025]' : ''}
    `}>
      <div className="flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5 shrink-0">
          {KIND_ICON[n.kind] ?? '🔔'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-tight">{n.title}</p>
          <p className="text-xs text-white/60 mt-0.5 leading-snug">{n.message}</p>
          <p className="text-[10px] text-white/30 mt-1">{fmt(n.createdAt)}</p>
        </div>
        {!n.read && (
          <span className="w-1.5 h-1.5 rounded-full bg-rokka-cyan mt-1 shrink-0" />
        )}
      </div>

      {isCall && (
        <button
          onClick={() => onDismiss(n.id)}
          className="
            mt-2 w-full text-xs font-semibold py-1.5 rounded-lg
            bg-rokka-green/20 text-rokka-green
            hover:bg-rokka-green/30 active:scale-[0.98] transition-all
          "
        >
          Atender ✓
        </button>
      )}
    </div>
  )
}
