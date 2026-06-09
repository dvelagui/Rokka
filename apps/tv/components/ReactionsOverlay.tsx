'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactionPayload } from '@rokka/supabase'

interface ReactionItem extends ReactionPayload {
  key: number
}

interface Props {
  /** Pass broadcast.latestReaction from useTVRealtime(); a new reference triggers a new emoji */
  latestReaction: ReactionPayload | null
}

export function ReactionsOverlay({ latestReaction }: Props) {
  const [items, setItems] = useState<ReactionItem[]>([])
  const keyRef = useRef(0)

  // New reaction reference → spawn a floating emoji
  useEffect(() => {
    if (!latestReaction) return
    setItems((prev) => [
      ...prev,
      {
        ...latestReaction,
        // Clamp x to 10–80 so emojis never clip at the edges
        x: Math.min(Math.max(latestReaction.x, 10), 80),
        key: ++keyRef.current,
      },
    ])
  }, [latestReaction])

  function remove(key: number) {
    setItems((prev) => prev.filter((r) => r.key !== key))
  }

  return (
    // Position absolute over the entire video; no pointer events so it
    // doesn't block mouse/touch interaction with anything underneath.
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      <AnimatePresence>
        {items.map((item) => (
          <FloatingEmoji
            key={item.key}
            item={item}
            onDone={() => remove(item.key)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Single floating emoji ─────────────────────────────────────────────────────

interface EmojiProps {
  item: ReactionItem
  onDone: () => void
}

function FloatingEmoji({ item, onDone }: EmojiProps) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        bottom: '22%',
        fontSize: 'clamp(22px, 3vw, 42px)',
        lineHeight: 1,
        // Prevent text cursor and selection artefacts
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      initial={{ y: 0, scale: 1, opacity: 1 }}
      animate={{ y: -130, scale: 1.3, opacity: 0 }}
      exit={{}}
      transition={{ duration: 2.8, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      {item.emoji}
    </motion.div>
  )
}
