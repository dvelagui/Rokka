import { describe, it, expect } from 'vitest'
import { MAX_CHAT_LENGTH, PROFANITY_LIST } from '@rokka/shared'

// ── Chat message validation logic ──────────────────────────────────────────

function validateMessage(message: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = message.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'empty' }
  if (trimmed.length > MAX_CHAT_LENGTH) return { ok: false, reason: 'too_long' }
  return { ok: true }
}

/**
 * Simple profanity check (mirrors the SQL RPC logic client-side).
 * Returns true if the message contains a banned word.
 */
function containsProfanity(message: string): boolean {
  const lower = message.toLowerCase()
  return PROFANITY_LIST.some((word) => lower.includes(word))
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('validateMessage', () => {
  it('accepts a normal message', () => {
    expect(validateMessage('Hola a todos 🎵').ok).toBe(true)
  })

  it('rejects an empty string', () => {
    const result = validateMessage('')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty')
  })

  it('rejects a whitespace-only string', () => {
    const result = validateMessage('   ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty')
  })

  it(`rejects messages longer than ${MAX_CHAT_LENGTH} characters`, () => {
    const longMsg = 'a'.repeat(MAX_CHAT_LENGTH + 1)
    const result = validateMessage(longMsg)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('too_long')
  })

  it(`accepts messages exactly at the ${MAX_CHAT_LENGTH}-char limit`, () => {
    const exactMsg = 'a'.repeat(MAX_CHAT_LENGTH)
    expect(validateMessage(exactMsg).ok).toBe(true)
  })
})

describe('containsProfanity', () => {
  it('detects a banned word', () => {
    expect(containsProfanity('qué mierda de canción')).toBe(true)
  })

  it('detects mixed case banned word', () => {
    expect(containsProfanity('MIERDA')).toBe(true)
  })

  it('returns false for a clean message', () => {
    expect(containsProfanity('Me encanta esta canción')).toBe(false)
  })

  it('detects English profanity', () => {
    expect(containsProfanity('what the fuck')).toBe(true)
  })
})
