'use client'

import { useState } from 'react'
import { useTableContext } from '@/providers/TableProvider'
import { Header }        from '@/components/Header'
import { PinnedMessage } from '@/components/PinnedMessage'
import { StatusBar }     from '@/components/StatusBar'
import { TabBar, type Tab } from '@/components/TabBar'

// ── Placeholders for each tab section (replaced in Phase 2) ──────────────────

function QueueSection()  { return <SectionPlaceholder emoji="🎵" label="Cola de canciones" /> }
function GenreSection()  { return <SectionPlaceholder emoji="🎸" label="Explorar por géneros" /> }
function TopSection()    { return <SectionPlaceholder emoji="⭐" label="Top canciones del bar" /> }
function ChatSection()   { return <SectionPlaceholder emoji="💬" label="Chat en vivo" /> }
function SearchSection() { return <SectionPlaceholder emoji="🔍" label="Buscar canciones" /> }

function SectionPlaceholder({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
      <span className="text-5xl">{emoji}</span>
      <p className="text-white/30 text-sm">{label}</p>
      <p className="text-white/15 text-xs">Próximamente — Fase 2</p>
    </div>
  )
}

const TAB_CONTENT: Record<Tab, React.ComponentType> = {
  queue:  QueueSection,
  genre:  GenreSection,
  top:    TopSection,
  chat:   ChatSection,
  search: SearchSection,
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

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header />
      <PinnedMessage />
      <StatusBar />

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overscroll-none">
        <ActiveSection />
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
