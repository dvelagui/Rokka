'use client'

import { motion } from 'framer-motion'
import { clearTableSession } from '@rokka/supabase'
import { useRouter } from 'next/navigation'

export function BannedBanner() {
  const router = useRouter()

  const handleExit = () => {
    clearTableSession()
    router.replace('/no-session')
  }

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed inset-x-0 top-0 z-[100] bg-rokka-red px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">🚫</span>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">Mesa bloqueada</p>
          <p className="text-white/70 text-[11px] leading-tight">
            El administrador ha bloqueado esta mesa.
          </p>
        </div>
      </div>
      <button
        onClick={handleExit}
        className="shrink-0 text-white/80 text-xs font-semibold bg-white/15 rounded-lg px-3 py-1.5
                   active:scale-95 transition-transform"
      >
        Salir
      </button>
    </motion.div>
  )
}
