/**
 * Module-level pub/sub for local (self) reactions.
 * FloatingReactions subscribes; ChatTab emits when the user taps a reaction.
 * No React context needed — reactions are fire-and-forget.
 */

type ReactionListener = (emoji: string, x: number) => void

const listeners = new Set<ReactionListener>()

export const reactionsBus = {
  emit(emoji: string, x: number) {
    listeners.forEach((l) => l(emoji, x))
  },
  subscribe(listener: ReactionListener): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}
