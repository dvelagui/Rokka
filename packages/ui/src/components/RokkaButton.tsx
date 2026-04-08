'use client'

import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface RokkaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'cyan' | 'purple' | 'fire' | 'ghost'
}

const variantStyles = {
  cyan: 'bg-[#00E5FF] text-black hover:brightness-110',
  purple: 'bg-[#D500F9] text-white hover:brightness-110',
  fire: 'bg-[#FF4500] text-white hover:brightness-110',
  ghost: 'border border-[#1a1a1a] text-white hover:border-[#00E5FF] hover:text-[#00E5FF]',
}

export function RokkaButton({
  children,
  variant = 'cyan',
  className = '',
  ...props
}: RokkaButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={`rounded-lg px-4 py-2 font-semibold transition-all ${variantStyles[variant]} ${className}`}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  )
}
