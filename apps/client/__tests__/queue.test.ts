import { describe, it, expect } from 'vitest'

// ── Queue validation logic (mirrors use-add-song.ts) ──────────────────────

interface QueueItem {
  id:               string
  table_id:         string
  title:            string
  youtube_video_id?: string
  status:           'queued' | 'playing' | 'played' | 'skipped'
  bid_amount:       number
  position:         number
}

function isInQueue(queue: QueueItem[], title: string, videoId?: string): boolean {
  return queue.some((item) => {
    if (videoId && item.youtube_video_id) return item.youtube_video_id === videoId
    return item.title.toLowerCase().trim() === title.toLowerCase().trim()
  })
}

function canAddSong(
  queue:     QueueItem[],
  tableId:   string,
  title:     string,
  videoId:   string | undefined,
  maxSongs:  number,
  isBanned:  boolean,
): { ok: true } | { ok: false; reason: string } {
  if (isBanned) return { ok: false, reason: 'banned' }
  const myCount = queue.filter((i) => i.table_id === tableId && i.status === 'queued').length
  if (myCount >= maxSongs) return { ok: false, reason: 'limit' }
  if (isInQueue(queue, title, videoId)) return { ok: false, reason: 'duplicate' }
  return { ok: true }
}

// ── Queue sort (mirrors QueueList.tsx) ────────────────────────────────────

function sortQueue(queue: QueueItem[]): QueueItem[] {
  const queued = queue.filter((i) => i.status === 'queued')
  return [...queued].sort((a, b) => {
    const aBid = a.bid_amount
    const bBid = b.bid_amount
    if (aBid > 0 && bBid === 0) return -1
    if (aBid === 0 && bBid > 0) return 1
    if (aBid > 0 && bBid > 0) return bBid - aBid
    return a.position - b.position
  })
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const MY_TABLE  = 'tbl-mine'
const OTHER_TABLE = 'tbl-other'
const MAX       = 4

function makeItem(overrides: Partial<QueueItem> & { id: string }): QueueItem {
  return {
    table_id:   MY_TABLE,
    title:      'Song A',
    status:     'queued',
    bid_amount: 0,
    position:   1,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('isInQueue', () => {
  const queue: QueueItem[] = [
    makeItem({ id: '1', youtube_video_id: 'vid-abc', title: 'Gasolina' }),
  ]

  it('detects duplicate by videoId', () => {
    expect(isInQueue(queue, 'Other Title', 'vid-abc')).toBe(true)
  })

  it('detects duplicate by title (case-insensitive)', () => {
    expect(isInQueue(queue, 'gasolina')).toBe(true)
  })

  it('returns false for a different song', () => {
    expect(isInQueue(queue, 'Despacito', 'vid-xyz')).toBe(false)
  })
})

describe('canAddSong – validation', () => {
  it('blocks when table is banned', () => {
    const result = canAddSong([], MY_TABLE, 'Song', undefined, MAX, true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('banned')
  })

  it('blocks when at queue limit', () => {
    const fullQueue: QueueItem[] = Array.from({ length: MAX }, (_, i) =>
      makeItem({ id: String(i), position: i + 1 }),
    )
    const result = canAddSong(fullQueue, MY_TABLE, 'New Song', undefined, MAX, false)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('limit')
  })

  it('does not count other tables toward limit', () => {
    const queue: QueueItem[] = Array.from({ length: MAX }, (_, i) =>
      makeItem({ id: String(i), table_id: OTHER_TABLE, position: i + 1 }),
    )
    const result = canAddSong(queue, MY_TABLE, 'New Song', undefined, MAX, false)
    expect(result.ok).toBe(true)
  })

  it('blocks duplicate song', () => {
    const queue: QueueItem[] = [makeItem({ id: '1', title: 'Gasolina' })]
    const result = canAddSong(queue, MY_TABLE, 'Gasolina', undefined, MAX, false)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('duplicate')
  })

  it('allows valid new song', () => {
    const result = canAddSong([], MY_TABLE, 'Despacito', 'vid-abc', MAX, false)
    expect(result.ok).toBe(true)
  })

  it('does not count played/skipped songs toward limit', () => {
    const queue: QueueItem[] = Array.from({ length: MAX }, (_, i) =>
      makeItem({ id: String(i), status: 'played', position: i + 1 }),
    )
    const result = canAddSong(queue, MY_TABLE, 'New Song', undefined, MAX, false)
    expect(result.ok).toBe(true)
  })
})

describe('sortQueue – bid ordering', () => {
  const items: QueueItem[] = [
    makeItem({ id: '1', position: 1, bid_amount: 0 }),
    makeItem({ id: '2', position: 2, bid_amount: 2_000 }),
    makeItem({ id: '3', position: 3, bid_amount: 5_000 }),
    makeItem({ id: '4', position: 4, bid_amount: 0 }),
  ]

  it('places highest-bid items first', () => {
    const sorted = sortQueue(items)
    expect(sorted[0].id).toBe('3')   // 5k
    expect(sorted[1].id).toBe('2')   // 2k
  })

  it('places non-bid items after bids, sorted by position', () => {
    const sorted = sortQueue(items)
    expect(sorted[2].id).toBe('1')   // position 1
    expect(sorted[3].id).toBe('4')   // position 4
  })

  it('excludes non-queued songs', () => {
    const withPlaying: QueueItem[] = [
      ...items,
      makeItem({ id: 'playing', status: 'playing', position: 0, bid_amount: 999 }),
    ]
    const sorted = sortQueue(withPlaying)
    expect(sorted.find((i) => i.id === 'playing')).toBeUndefined()
  })
})
