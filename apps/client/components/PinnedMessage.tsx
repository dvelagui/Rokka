'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPinnedMessage } from '@rokka/supabase'
import { useRealtime } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'

export function PinnedMessage() {
  const { table }  = useTableContext()
  const { chat }   = useRealtime()
  const [text, setText] = useState<string | null>(null)

  // Initial fetch of pinned message
  useEffect(() => {
    if (!table?.barId) return
    getPinnedMessage(table.barId)
      .then((msg) => setText(msg?.message ?? null))
      .catch(console.error)
  }, [table?.barId])

  // Keep in sync via realtime — use the dedicated pinnedMessages list
  useEffect(() => {
    const last = chat.pinnedMessages.at(-1)
    if (last) setText(last.message)
  }, [chat.pinnedMessages])

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{   height: 0,      opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-rokka-cyan/10 border-b border-rokka-cyan/20 px-4 py-2 flex items-start gap-2">
            <span className="text-sm leading-none mt-0.5">📌</span>
            <p className="text-rokka-cyan text-xs leading-relaxed flex-1">{text}</p>
            <button
              onClick={() => setText(null)}
              className="text-rokka-cyan/40 hover:text-rokka-cyan/70 transition-colors text-xs leading-none mt-0.5 shrink-0"
              aria-label="Cerrar mensaje"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
