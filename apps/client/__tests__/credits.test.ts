import { describe, it, expect } from 'vitest'
import { formatCredits } from '@rokka/shared'

// ── Credit business logic ──────────────────────────────────────────────────

function canAfford(balance: number, amount: number): boolean {
  return balance >= amount && amount > 0
}

function deductCredits(balance: number, amount: number): number {
  if (!canAfford(balance, amount)) throw new Error('Insufficient credits')
  return balance - amount
}

function refundCredits(balance: number, amount: number): number {
  if (amount < 0) throw new Error('Refund amount must be positive')
  return balance + amount
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('canAfford', () => {
  it('returns true when balance covers amount', () => {
    expect(canAfford(5_000, 1_000)).toBe(true)
  })

  it('returns true when balance exactly equals amount', () => {
    expect(canAfford(1_000, 1_000)).toBe(true)
  })

  it('returns false when balance is insufficient', () => {
    expect(canAfford(500, 1_000)).toBe(false)
  })

  it('returns false for zero amount', () => {
    expect(canAfford(5_000, 0)).toBe(false)
  })

  it('returns false for negative amount', () => {
    expect(canAfford(5_000, -100)).toBe(false)
  })
})

describe('deductCredits', () => {
  it('subtracts the amount from balance', () => {
    expect(deductCredits(5_000, 1_000)).toBe(4_000)
  })

  it('allows draining to zero', () => {
    expect(deductCredits(1_000, 1_000)).toBe(0)
  })

  it('throws when balance is insufficient', () => {
    expect(() => deductCredits(500, 1_000)).toThrow('Insufficient credits')
  })
})

describe('refundCredits', () => {
  it('adds the refund amount to balance', () => {
    expect(refundCredits(4_000, 1_000)).toBe(5_000)
  })

  it('refunds to a balance that was 0', () => {
    expect(refundCredits(0, 2_000)).toBe(2_000)
  })

  it('throws on negative refund amount', () => {
    expect(() => refundCredits(5_000, -100)).toThrow()
  })
})

describe('formatCredits', () => {
  it('formats small amounts without suffix', () => {
    expect(formatCredits(500)).toBe('500')
  })

  it('formats thousands with k suffix', () => {
    expect(formatCredits(5_000)).toBe('$5k')
    expect(formatCredits(15_000)).toBe('$15k')
  })

  it('formats decimal thousands', () => {
    expect(formatCredits(1_500)).toBe('$1.5k')
  })

  it('formats millions with M suffix', () => {
    expect(formatCredits(1_000_000)).toBe('$1M')
    expect(formatCredits(1_200_000)).toBe('$1.2M')
  })
})
