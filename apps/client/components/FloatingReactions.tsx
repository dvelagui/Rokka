'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtime } from '@rokka/supabase'
import { reactionsBus } from '@/lib/reactions-bus'

interface Particle {
  id:    string
  emoji: string
  x:     number   // 0-100 percent
}

export function FloatingReactions() {
  const [particles, setParticles] = useState<Particle[]>([])
  const { broadcast }             = useRealtime()

  const addParticle = useCallback((emoji: string, x: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setParticles((prev) => [...prev, { id, emoji, x }])
  }, [])

  const removeParticle = useCallback((id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Remote reactions (from other tables via realtime broadcast)
  useEffect(() => {
    if (!broadcast.latestReaction) return
    const { emoji, x } = broadcast.latestReaction
    addParticle(emoji, Math.min(Math.max(x, 5), 90))
  }, [broadcast.latestReaction, addParticle])

  // Local reactions (self — broadcast has self:false, so we add them here)
  useEffect(() => {
    return reactionsBus.subscribe(addParticle)
  }, [addParticle])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: 0,    opacity: 1, scale: 1   }}
            animate={{ y: -140, opacity: 0, scale: 1.5 }}
            transition={{ duration: 2.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            onAnimationComplete={() => removeParticle(p.id)}
            className="absolute text-3xl select-none leading-none"
            style={{ left: `${p.x}%`, bottom: '20%' }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
