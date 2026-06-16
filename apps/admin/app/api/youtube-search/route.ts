import { NextResponse } from 'next/server'
import { searchWithCache } from '../../../lib/youtube-cache'

// ── GET /api/youtube-search?q=...&max=12 ──────────────────────────────────────
// Busca canciones en YouTube reutilizando el caché de Supabase (24h) para
// reducir el consumo de cuota de la YouTube Data API.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const maxResults = Number(searchParams.get('max') ?? '10')

  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchWithCache(query, maxResults)
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
