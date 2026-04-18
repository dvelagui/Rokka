import { describe, it, expect } from 'vitest'

// ── Voting / skip threshold logic ──────────────────────────────────────────

/**
 * Determines if a song should be auto-skipped based on skip votes.
 * threshold: percentage of "skip" votes required (0–100).
 */
function shouldAutoSkip(skipVotes: number, totalVotes: number, threshold: number): boolean {
  if (totalVotes === 0) return false
  return (skipVotes / totalVotes) * 100 >= threshold
}

/**
 * Calculates vote percentage for display.
 */
function votePercentage(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('shouldAutoSkip', () => {
  it('returns false with 0 total votes', () => {
    expect(shouldAutoSkip(0, 0, 50)).toBe(false)
  })

  it('skips when exactly at threshold', () => {
    expect(shouldAutoSkip(5, 10, 50)).toBe(true)    // 50% === 50%
  })

  it('skips when above threshold', () => {
    expect(shouldAutoSkip(7, 10, 50)).toBe(true)    // 70% > 50%
  })

  it('does not skip when below threshold', () => {
    expect(shouldAutoSkip(4, 10, 50)).toBe(false)   // 40% < 50%
  })

  it('handles 100% threshold (unanimous required)', () => {
    expect(shouldAutoSkip(9, 10, 100)).toBe(false)
    expect(shouldAutoSkip(10, 10, 100)).toBe(true)
  })

  it('handles 0% threshold (all songs skip, 0% >= 0%)', () => {
    expect(shouldAutoSkip(1, 100, 0)).toBe(true)
    // 0 skip votes = 0%, which is still >= 0% threshold
    expect(shouldAutoSkip(0, 100, 0)).toBe(true)
  })
})

describe('votePercentage', () => {
  it('returns 0 when total is 0', () => {
    expect(votePercentage(0, 0)).toBe(0)
  })

  it('calculates exact percentage', () => {
    expect(votePercentage(3, 10)).toBe(30)
  })

  it('rounds to nearest integer', () => {
    expect(votePercentage(1, 3)).toBe(33)   // 33.33... → 33
    expect(votePercentage(2, 3)).toBe(67)   // 66.66... → 67
  })

  it('returns 100 for full votes', () => {
    expect(votePercentage(5, 5)).toBe(100)
  })
})
