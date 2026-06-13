'use client'

import { motion } from 'framer-motion'

interface SearchCTAProps {
  onClick: () => void
}

export function SearchCTA({ onClick }: SearchCTAProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="w-[90%] flex items-center gap-3 px-4 py-3.5 mx-auto mt-3 rounded-2xl
                 bg-rokka-cyan/10 border border-rokka-cyan/40
                 shadow-[0_0_20px_rgba(0,229,255,0.15)]
                 active:bg-rokka-cyan/15 transition-colors"
    >
      <span className="text-xl leading-none">🔍</span>
      <span className="flex-1 text-left text-rokka-cyan font-semibold text-sm">
        ¿Qué canción quieres escuchar?
      </span>
      <span className="text-rokka-cyan text-lg leading-none">→</span>
    </motion.button>
  )
}
