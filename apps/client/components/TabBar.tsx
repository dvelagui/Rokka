'use client'

import { motion } from 'framer-motion'
import { useRealtime } from '@rokka/supabase'

export type Tab = 'queue' | 'genre' | 'top' | 'chat' | 'search'

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'queue',  emoji: '🎵', label: 'Cola'   },
  { id: 'genre',  emoji: '🎸', label: 'Géneros' },
  { id: 'top',    emoji: '⭐', label: 'Top Bar' },
  { id: 'chat',   emoji: '💬', label: 'Chat'   },
  { id: 'search', emoji: '🔍', label: 'Buscar' },
]

interface TabBarProps {
  activeTab:   Tab
  onTabChange: (tab: Tab) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { chat } = useRealtime()

  // Unread chat count (messages since last time chat was active)
  const unreadChat = activeTab !== 'chat' ? chat.messages.filter((m) => m.message_type === 'msg').length : 0

  return (
    <nav className="sticky bottom-0 z-40 bg-black border-t border-border">
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const badge = tab.id === 'chat' && unreadChat > 0 ? unreadChat : null

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative
                         transition-colors active:bg-card"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-2 right-2 h-0.5 bg-rokka-cyan rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Badge */}
              {badge && (
                <span className="absolute top-1.5 right-[calc(50%-10px)] min-w-[16px] h-4 px-1
                                 bg-rokka-red rounded-full text-white text-[9px] font-bold
                                 flex items-center justify-center leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}

              <span className="text-lg leading-none">{tab.emoji}</span>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-rokka-cyan' : 'text-white/40'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* iOS safe area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
