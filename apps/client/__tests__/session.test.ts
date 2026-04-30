import { describe, it, expect, beforeEach } from 'vitest'

// ── Pure logic extracted from auth/table.ts ────────────────────────────────
// We test the discriminated-union mapping, not the Supabase RPC itself.

type TableRow = {
  is_banned:  boolean
  is_active:  boolean
  bar_id:     string
  table_id:   string
  table_number: number
  label:      string
  credits:    number
}

type TableCheckResult =
  | { status: 'valid';    data: { barId: string; tableId: string; tableNumber: number; label: string; credits: number } }
  | { status: 'banned' | 'inactive' | 'not_found' }

function mapRowToResult(rows: TableRow[]): TableCheckResult {
  if (rows.length === 0) return { status: 'not_found' }
  const row = rows[0]
  if (row.is_banned)  return { status: 'banned' }
  if (!row.is_active) return { status: 'inactive' }
  return {
    status: 'valid',
    data: {
      barId:       row.bar_id,
      tableId:     row.table_id,
      tableNumber: row.table_number,
      label:       row.label,
      credits:     row.credits,
    },
  }
}

// ── localStorage session helpers ───────────────────────────────────────────

const STORAGE_KEY = 'rokka_table_session'

function storeTableSession(token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }))
}

function getStoredTableSession(): { token: string } | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function clearTableSession() {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Tests ──────────────────────────────────────────────────────────────────

const VALID_ROW: TableRow = {
  is_banned:    false,
  is_active:    true,
  bar_id:       'bar-001',
  table_id:     'tbl-001',
  table_number: 3,
  label:        'Mesa 3',
  credits:      5_000,
}

describe('checkTableByToken mapping', () => {
  it('returns not_found when row array is empty', () => {
    const result = mapRowToResult([])
    expect(result.status).toBe('not_found')
  })

  it('returns banned when is_banned = true', () => {
    const result = mapRowToResult([{ ...VALID_ROW, is_banned: true }])
    expect(result.status).toBe('banned')
  })

  it('prioritises banned over inactive', () => {
    const result = mapRowToResult([{ ...VALID_ROW, is_banned: true, is_active: false }])
    expect(result.status).toBe('banned')
  })

  it('returns inactive when is_active = false and not banned', () => {
    const result = mapRowToResult([{ ...VALID_ROW, is_active: false }])
    expect(result.status).toBe('inactive')
  })

  it('returns valid with correct data when active and not banned', () => {
    const result = mapRowToResult([VALID_ROW])
    expect(result.status).toBe('valid')
    if (result.status === 'valid') {
      expect(result.data.barId).toBe('bar-001')
      expect(result.data.label).toBe('Mesa 3')
      expect(result.data.credits).toBe(5_000)
    }
  })
})

describe('table session localStorage', () => {
  beforeEach(() => localStorage.clear())

  it('stores and retrieves a token', () => {
    storeTableSession('tok-abc')
    expect(getStoredTableSession()).toEqual({ token: 'tok-abc' })
  })

  it('returns null when nothing stored', () => {
    expect(getStoredTableSession()).toBeNull()
  })

  it('clears the stored token', () => {
    storeTableSession('tok-xyz')
    clearTableSession()
    expect(getStoredTableSession()).toBeNull()
  })

  it('overwrites the previous token on re-store', () => {
    storeTableSession('tok-first')
    storeTableSession('tok-second')
    expect(getStoredTableSession()?.token).toBe('tok-second')
  })
})
