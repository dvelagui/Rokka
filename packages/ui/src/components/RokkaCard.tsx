'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RokkaCardProps {
  children: ReactNode
  className?: string
  glow?: 'cyan' | 'purple' | 'fire' | 'none'
}

const glowColors = {
  cyan: '0 0 20px rgba(0, 229, 255, 0.3)',
  purple: '0 0 20px rgba(213, 0, 249, 0.3)',
  fire: '0 0 20px rgba(255, 69, 0, 0.3)',
  none: 'none',
}

export function RokkaCard({ children, className = '', glow = 'none' }: RokkaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ boxShadow: glowColors[glow] }}
      className={`rounded-xl border border-[#1a1a1a] bg-[#111] p-4 ${className}`}
    >
      {children}
    </motion.div>
  )
}
