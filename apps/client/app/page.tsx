'use client'

import { useState } from 'react'
import { useTableContext }       from '@/providers/TableProvider'
import { Header }                from '@/components/Header'
import { PinnedMessage }         from '@/components/PinnedMessage'
import { StatusBar }             from '@/components/StatusBar'
import { TabBar, type Tab }      from '@/components/TabBar'
import { QueueTab }              from '@/components/tabs/QueueTab'
import { ChatTab }               from '@/components/tabs/ChatTab'
import { FloatingReactions }     from '@/components/FloatingReactions'

// ── Placeholders for tabs not yet implemented ─────────────────────────────────

function SectionPlaceholder({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
      <span className="text-5xl">{emoji}</span>
      <p className="text-white/30 text-sm">{label}</p>
      <p className="text-white/15 text-xs">Próximamente</p>
    </div>
  )
}

// Chat tab fills the entire content area (handles its own inner scroll)
const FILLS_SPACE: Partial<Record<Tab, true>> = { chat: true }

const TAB_CONTENT: Record<Tab, React.ComponentType> = {
  queue:  QueueTab,
  genre:  () => <SectionPlaceholder emoji="🎸" label="Explorar por géneros" />,
  top:    () => <SectionPlaceholder emoji="⭐" label="Top canciones del bar" />,
  chat:   ChatTab,
  search: () => <SectionPlaceholder emoji="🔍" label="Buscar canciones" />,
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isLoading } = useTableContext()
  const [activeTab, setActiveTab] = useState<Tab>('queue')

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-rokka-cyan border-t-transparent animate-spin mx-auto" />
          <p className="text-white/30 text-xs">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  const ActiveSection = TAB_CONTENT[activeTab]
  // Chat manages its own internal scroll — disable outer scroll when active
  const fillsSpace = FILLS_SPACE[activeTab] ?? false

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header />
      <PinnedMessage />
      <StatusBar />

      <main
        className={`flex-1 overscroll-none min-h-0 ${
          fillsSpace ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}
      >
        <ActiveSection />
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Floating reaction particles — fixed overlay, pointer-events none */}
      <FloatingReactions />
    </div>
  )
}
