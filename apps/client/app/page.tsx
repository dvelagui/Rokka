'use client'

import { useState } from 'react'
import { AnimatePresence }       from 'framer-motion'
import { useTableContext }       from '@/providers/TableProvider'
import { Header }                from '@/components/Header'
import { PinnedMessage }         from '@/components/PinnedMessage'
import { StatusBar }             from '@/components/StatusBar'
import { TabBar, type Tab }      from '@/components/TabBar'
import { QueueTab }              from '@/components/tabs/QueueTab'
import { ChatTab }               from '@/components/tabs/ChatTab'
import { SearchTab }             from '@/components/tabs/SearchTab'
import { GenresTab }             from '@/components/tabs/GenresTab'
import { TopBarTab }             from '@/components/tabs/TopBarTab'
import { FloatingReactions }     from '@/components/FloatingReactions'
import { MenuSheet }             from '@/components/menu/MenuSheet'
import { QRScanner }             from '@/components/scanner/QRScanner'

// Chat tab fills the entire content area (handles its own inner scroll)
const FILLS_SPACE: Partial<Record<Tab, true>> = { chat: true }

const TAB_CONTENT: Record<Tab, React.ComponentType> = {
  queue:  QueueTab,
  genre:  GenresTab,
  top:    TopBarTab,
  chat:   ChatTab,
  search: SearchTab,
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isLoading } = useTableContext()
  const [activeTab, setActiveTab]   = useState<Tab>('queue')
  const [menuOpen, setMenuOpen]     = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

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
      <Header onMenuClick={() => setMenuOpen(true)} onRechargeClick={() => setScannerOpen(true)} />
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

      {/* Menu sheet */}
      <AnimatePresence>
        {menuOpen && (
          <MenuSheet key="menu-sheet" onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>

      {/* QR Scanner */}
      <AnimatePresence>
        {scannerOpen && (
          <QRScanner key="qr-scanner" onClose={() => setScannerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
