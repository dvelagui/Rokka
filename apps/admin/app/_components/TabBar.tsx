'use client'

import { useRef } from 'react'

export const TABS = [
  { id: 'cola',      label: 'Cola' },
  { id: 'historial', label: 'Historial' },
  { id: 'buscar',    label: 'Buscar' },
  { id: 'chat',      label: 'Chat' },
  { id: 'mesas',     label: 'Mesas' },
  { id: 'menu',      label: 'Menú' },
  { id: 'meseros',   label: 'Meseros' },
  { id: 'anuncios',  label: 'Anuncios' },
  { id: 'config',    label: 'Config' },
  { id: 'stats',     label: 'Stats' },
  { id: 'log',       label: 'Log' },
  { id: 'ayuda',     label: 'Ayuda' },
] as const

export type TabId = (typeof TABS)[number]['id']

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function TabBar({ activeTab, onTabChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={scrollRef}
      className="sticky top-[52px] z-30 bg-black border-b border-[#1a1a1a] flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`
            shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap
            border-b-2 transition-colors
            ${activeTab === id
              ? 'text-rokka-cyan border-rokka-cyan'
              : 'text-white/40 border-transparent hover:text-white/70 hover:border-white/20'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
