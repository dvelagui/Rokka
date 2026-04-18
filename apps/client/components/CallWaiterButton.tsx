'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { callWaiter } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'
import { useToast } from '@/providers/ToastProvider'

const COOLDOWN_MS = 5_000

export function CallWaiterButton() {
  const { table }          = useTableContext()
  const { showWarning }    = useToast()
  const [calling, setCalling] = useState(false)
  const [called,  setCalled]  = useState(false)

  const handleCall = async () => {
    if (!table || calling || called) return
    setCalling(true)
    try {
      await callWaiter(table.barId, table.tableId, table.label)
      setCalled(true)
      showWarning('🔔 Mesero llamado. En breve llega.')
      setTimeout(() => setCalled(false), COOLDOWN_MS)
    } catch (err) {
      console.error('callWaiter error:', err)
    } finally {
      setCalling(false)
    }
  }

  return (
    <motion.button
      onClick={handleCall}
      disabled={calling || called || !table}
      whileTap={{ scale: 0.93 }}
      className={`flex items-center gap-1 text-[9px] font-medium px-2.5 py-1.5 rounded-full
                  transition-all disabled:opacity-50 ${
        called
          ? 'bg-rokka-green/10 border border-rokka-green/40 text-rokka-green'
          : 'bg-card border border-border text-[#aaaaaa]'
      }`}
    >
      <span className="text-xs leading-none">🔔</span>
      {called ? 'Llamando...' : 'Llamar Mesero'}
    </motion.button>
  )
}
