'use client'

import { useRealtime } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'
import { CallWaiterButton } from '@/components/CallWaiterButton'

export function StatusBar() {
  const { table, bar } = useTableContext()
  const { queue }      = useRealtime()

  const myCount  = queue.queue.filter(
    (item) => item.table_id === table?.tableId && item.status === 'queued',
  ).length
  const maxCount = bar?.config.max_canciones_por_mesa ?? 4

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-card2 border-b border-border">
      {/* Queue slot counter */}
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-xs">Cola:</span>
        <div className="flex gap-1">
          {Array.from({ length: maxCount }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-1.5 rounded-full transition-colors ${
                i < myCount ? 'bg-rokka-cyan' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-white/50 text-xs tabular-nums">
          {myCount}/{maxCount}
        </span>
      </div>

      <CallWaiterButton />
    </div>
  )
}
