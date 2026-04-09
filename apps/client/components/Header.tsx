'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTableContext } from '@/providers/TableProvider'

interface HeaderProps {
  onMenuClick?:   () => void
  onRechargeClick?: () => void
}

export function Header({ onMenuClick, onRechargeClick }: HeaderProps) {
  const { table, bar, credits } = useTableContext()

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-border">
      {/* Row 1: bar identity + brand */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{bar?.emoji ?? '🎵'}</span>
          <span className="text-white/50 text-xs font-medium truncate max-w-[120px]">
            {bar?.name ?? 'ROKKA Bar'}
          </span>
        </div>
        <span className="text-rokka-cyan font-black text-base tracking-widest select-none">
          ROKKA
        </span>
      </div>

      {/* Row 2: table label + credits + actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {/* Table label */}
        <span className="text-white font-bold text-sm">
          {table?.label ?? '—'}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Credits chip */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2.5 py-1">
          <span className="text-rokka-gold text-xs leading-none">⭐</span>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={credits}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              exit={{   y:  6, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-white font-bold text-sm tabular-nums leading-none"
            >
              {credits.toLocaleString('es-CO')}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Menú */}
        <button
          onClick={onMenuClick}
          className="text-white/70 text-xs font-medium px-3 py-1.5 bg-card border border-border rounded-full
                     active:scale-95 transition-transform"
        >
          Menú
        </button>

        {/* Recargar */}
        <button
          onClick={onRechargeClick}
          className="text-rokka-cyan text-xs font-semibold px-3 py-1.5 bg-rokka-cyan/10
                     border border-rokka-cyan/30 rounded-full
                     active:scale-95 transition-transform"
        >
          + Créditos
        </button>
      </div>
    </header>
  )
}
