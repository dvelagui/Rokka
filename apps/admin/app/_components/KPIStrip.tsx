'use client'

import { useRealtime } from '@rokka/supabase'

export default function KPIStrip() {
  const { queue, tables } = useRealtime()

  const totalTables  = tables?.tables.length ?? 0
  const activeTables = tables?.tables.filter((t) => t.is_active && !t.is_banned).length ?? 0
  const onlineCount  = tables?.tables.filter((t) => t.is_active && !!t.connected_at).length ?? 0
  const queueCount   = queue.queue.filter((i) => i.status === 'queued').length
  const bidsToday    = queue.queue.reduce((sum, i) => sum + (i.bid_amount ?? 0), 0)

  const kpis = [
    { icon: '🪑', label: 'Mesas activas', value: `${activeTables}/${totalTables}` },
    { icon: '👥', label: 'Online',         value: String(onlineCount) },
    { icon: '🎵', label: 'En cola',        value: String(queueCount) },
    { icon: '💰', label: 'Pujas hoy',      value: String(bidsToday) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#1a1a1a] bg-black">
      {kpis.map(({ icon, label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center py-2 border-r border-[#1a1a1a] last:border-0"
        >
          <span className="text-white/40 text-[10px] uppercase tracking-widest flex items-center gap-1">
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
          <span className="text-white font-bold text-xl leading-tight">{value}</span>
          <span className="sm:hidden text-white/30 text-[9px] mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  )
}
