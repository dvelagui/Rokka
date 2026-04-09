'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { callWaiter } from '@rokka/supabase'
import { useRealtime } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'

export function StatusBar() {
  const { table, bar }    = useTableContext()
  const { queue }         = useRealtime()
  const [calling, setCalling] = useState(false)
  const [called,  setCalled]  = useState(false)

  // Songs this table has in the queue (status = 'queued')
  const myCount = queue.queue.filter(
    (item) => item.table_id === table?.tableId && item.status === 'queued',
  ).length

  const maxCount = bar?.config.max_canciones_por_mesa ?? 4

  const handleCallWaiter = async () => {
    if (!table || calling || called) return
    setCalling(true)
    try {
      await callWaiter(table.barId, table.tableId, table.label)
      setCalled(true)
      // Reset after 30s so user can call again
      setTimeout(() => setCalled(false), 30_000)
    } catch (err) {
      console.error('callWaiter error:', err)
    } finally {
      setCalling(false)
    }
  }

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

      {/* Call waiter */}
      <motion.button
        onClick={handleCallWaiter}
        disabled={calling || called || !table}
        whileTap={{ scale: 0.93 }}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
          called
            ? 'bg-rokka-green/10 border border-rokka-green/30 text-rokka-green'
            : 'bg-card border border-border text-white/60 active:border-white/20'
        } disabled:opacity-50`}
      >
        <span className="text-sm leading-none">{called ? '✅' : '🔔'}</span>
        {called ? 'Mesero en camino' : 'Llamar Mesero'}
      </motion.button>
    </div>
  )
}
