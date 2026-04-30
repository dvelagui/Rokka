'use client'

import { useState, useEffect } from 'react'
import {
  getTopSongs,
  getGlobalTopSongs,
  getGlobalBarRanking,
  getStatsByPeriod,
  getDailyRevenue,
} from '@rokka/supabase'
import type { TopSong, GlobalBarRanking, BarStatsSummary, DailyRevenue } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

// Monthly ROKKA subscription cost (placeholder — update to match actual plan)
const SUBSCRIPTION_MONTHLY = 199_000

// Spanish day abbreviations: 0=Sunday, 1=Monday, …
const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

type SubTab = 'bar' | 'global' | 'financiero'

// ── Helpers ───────────────────────────────────────────────────────────────────

function medal(i: number) {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return <span className="text-[11px] text-white/40 w-5 text-center inline-block">{i + 1}</span>
}

function fmtPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function fmtNum(n: number) {
  return n.toLocaleString('es-CL')
}

// ── StatsTab ──────────────────────────────────────────────────────────────────

export default function StatsTab() {
  const { bar } = useAdminContext()
  const [subTab, setSubTab] = useState<SubTab>('bar')

  return (
    <div>
      {/* Sub-tab selector */}
      <div className="flex gap-1 mb-4">
        {(['bar', 'global', 'financiero'] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`
              flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
              ${subTab === t ? 'bg-rokka-cyan text-black' : 'bg-card text-white/40 hover:text-white/70'}
            `}
          >
            {t === 'bar' ? '🏠 Bar' : t === 'global' ? '🌎 Global' : '💰 Financiero'}
          </button>
        ))}
      </div>

      {subTab === 'bar'        && <BarSection    barId={bar?.id ?? ''} />}
      {subTab === 'global'     && <GlobalSection />}
      {subTab === 'financiero' && <FinancieroSection barId={bar?.id ?? ''} />}
    </div>
  )
}

// ── BarSection ────────────────────────────────────────────────────────────────

function BarSection({ barId }: { barId: string }) {
  const [songs,     setSongs]     = useState<TopSong[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    getTopSongs(barId, 10)
      .then(setSongs)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  if (isLoading) return <LoadingMsg text="Cargando canciones…" />
  if (songs.length === 0) return <EmptyMsg text="Sin datos aún. Las canciones aparecerán cuando haya actividad." />

  const maxPlayed = Math.max(...songs.map((s) => s.times_played), 1)

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-white/30 mb-3">Top canciones más reproducidas en tu bar</p>
      {songs.map((song, i) => (
        <div
          key={`${song.title}-${i}`}
          className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-2"
        >
          {/* Header row */}
          <div className="flex items-start gap-2">
            <span className="text-base leading-none shrink-0 mt-0.5 w-6 text-center">{medal(i)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{song.title}</p>
              <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-rokka-cyan">{song.times_played}×</p>
              <p className="text-[10px] text-white/30">Max {fmtPrice(song.max_bid)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-rokka-cyan rounded-full"
              style={{ width: `${(song.times_played / maxPlayed) * 100}%` }}
            />
          </div>

          {/* Stats row */}
          <p className="text-[10px] text-white/25">
            Promedio {fmtPrice(Math.round(song.avg_bid))}
            {' · '}
            Pujas totales {fmtPrice(Math.round(song.avg_bid * song.times_played))}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── GlobalSection ─────────────────────────────────────────────────────────────

function GlobalSection() {
  const [topSongs,  setTopSongs]  = useState<TopSong[]>([])
  const [ranking,   setRanking]   = useState<GlobalBarRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([getGlobalTopSongs(10), getGlobalBarRanking(10)])
      .then(([songs, rank]) => { setTopSongs(songs); setRanking(rank) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <LoadingMsg text="Cargando datos globales…" />

  const maxPlayed = Math.max(...topSongs.map((s) => s.times_played), 1)
  const maxBids   = Math.max(...ranking.map((r) => r.total_bids), 1)

  return (
    <div className="space-y-4">
      {/* Intro card */}
      <div className="bg-card border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-sm font-bold text-white">🌎 Competencia Global ROKKA</p>
        <p className="text-[11px] text-white/40 mt-0.5">Ve cómo te comparas con los otros bares</p>
      </div>

      {/* Global top songs */}
      {topSongs.length > 0 && (
        <div>
          <SectionLabel>Canciones más pedidas en todos los bares</SectionLabel>
          <div className="space-y-2">
            {topSongs.map((song, i) => (
              <div
                key={`${song.title}-${i}`}
                className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none shrink-0 mt-0.5 w-6 text-center">{medal(i)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{song.title}</p>
                    <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{song.times_played}×</p>
                    <p className="text-[10px] text-white/30">Max {fmtPrice(song.max_bid)}</p>
                  </div>
                </div>
                {/* Gradient bar */}
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(song.times_played / maxPlayed) * 100}%`,
                      background: 'linear-gradient(to right, #7C4DFF, #00E5FF)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar ranking */}
      {ranking.length > 0 && (
        <div>
          <SectionLabel>Ranking de bares por actividad</SectionLabel>
          <div className="space-y-2">
            {ranking.map((bar, i) => (
              <div
                key={bar.bar_id}
                className={`bg-card rounded-xl p-3 space-y-2 border ${
                  i === 0 ? 'border-yellow-500/40' : 'border-[#1e1e1e]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none shrink-0 w-6 text-center">{medal(i)}</span>
                    <div>
                      <p className="text-[13px] font-bold text-white">
                        {bar.bar_emoji} {bar.bar_name}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {fmtNum(bar.table_count)} mesas · {fmtNum(bar.total_songs)} canciones
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-rokka-cyan">{fmtNum(bar.total_bids)}</p>
                    <p className="text-[9px] text-white/30">pujas</p>
                  </div>
                </div>
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rokka-purple"
                    style={{ width: `${(bar.total_bids / maxBids) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topSongs.length === 0 && ranking.length === 0 && (
        <EmptyMsg text="Sin datos globales disponibles." />
      )}
    </div>
  )
}

// ── FinancieroSection ─────────────────────────────────────────────────────────

function FinancieroSection({ barId }: { barId: string }) {
  const [monthStats,    setMonthStats]    = useState<BarStatsSummary | null>(null)
  const [dailyRevenue,  setDailyRevenue]  = useState<DailyRevenue[]>([])
  const [isLoading,     setIsLoading]     = useState(true)

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    Promise.all([
      getStatsByPeriod(barId, 'month'),
      getDailyRevenue(barId, 14),
    ])
      .then(([stats, daily]) => { setMonthStats(stats); setDailyRevenue(daily) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  if (isLoading) return <LoadingMsg text="Cargando datos financieros…" />

  const ingresos = monthStats?.credits_sold ?? 0
  const ganancia = ingresos - SUBSCRIPTION_MONTHLY
  const roi      = SUBSCRIPTION_MONTHLY > 0 ? (ganancia / SUBSCRIPTION_MONTHLY) * 100 : 0

  const maxAmt = Math.max(...dailyRevenue.map((d) => d.amount), 1)
  const total14 = dailyRevenue.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="space-y-3">
      {/* KPI 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="Ingresos Mes"  value={fmtPrice(ingresos)}              color="text-rokka-cyan"    />
        <KpiCard label="Suscripción"   value={fmtPrice(SUBSCRIPTION_MONTHLY)}  color="text-orange-400"   />
        <KpiCard label="Ganancia"      value={fmtPrice(Math.max(0, ganancia))} color="text-rokka-green"  />
        <KpiCard
          label="ROI"
          value={SUBSCRIPTION_MONTHLY > 0 ? `${roi.toFixed(0)}%` : '—'}
          color={roi >= 0 ? 'text-rokka-cyan' : 'text-rokka-red'}
        />
      </div>

      {/* 14-day bar chart */}
      <div className="bg-card border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">
          Ingresos — últimos 14 días
        </p>

        {/* Bars */}
        <div className="flex items-end gap-[3px]" style={{ height: '80px' }}>
          {dailyRevenue.map((d, i) => {
            const isToday     = i === dailyRevenue.length - 1
            const isLastWeek  = i >= dailyRevenue.length - 7
            const heightPct   = d.amount > 0 ? Math.max((d.amount / maxAmt) * 100, 5) : 2
            const opacity     = isToday ? 1 : isLastWeek ? 0.6 : 0.28

            return (
              <div key={d.date} className="flex-1 flex items-end h-full">
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height:          `${heightPct}%`,
                    backgroundColor: '#00E5FF',
                    opacity,
                  }}
                  title={`${d.date}: ${fmtPrice(d.amount)}`}
                />
              </div>
            )
          })}
        </div>

        {/* Day labels */}
        <div className="flex gap-[3px] mt-1.5">
          {dailyRevenue.map((d) => {
            const dayIdx = new Date(`${d.date}T00:00:00`).getDay()
            return (
              <div key={d.date} className="flex-1 text-center">
                <span className="text-[8px] text-white/30">{DAY_LABELS[dayIdx]}</span>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#1e1e1e]">
          <p className="text-[10px] text-white/25">Total 14 días</p>
          <p className="text-sm font-bold text-white">{fmtPrice(total14)}</p>
        </div>
      </div>

      {/* Monthly songs info */}
      {monthStats && (
        <div className="bg-card border border-[#1e1e1e] rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-white/30">Canciones reproducidas</p>
            <p className="text-lg font-bold text-white mt-0.5">{fmtNum(monthStats.songs_played)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30">Total en pujas</p>
            <p className="text-lg font-bold text-rokka-purple mt-0.5">{fmtPrice(monthStats.total_bids)}</p>
          </div>
          {monthStats.top_song && (
            <div className="col-span-2 border-t border-[#1e1e1e] pt-3">
              <p className="text-[10px] text-white/30">Canción del mes</p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">⭐ {monthStats.top_song.title}</p>
              <p className="text-[10px] text-white/40 truncate">{monthStats.top_song.artist} · {monthStats.top_song.times}×</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-1">
      <p className="text-[10px] text-white/30">{label}</p>
      <p className={`text-lg font-bold ${color} leading-none`}>{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{children}</p>
  )
}

function LoadingMsg({ text }: { text: string }) {
  return <p className="text-center text-white/20 text-xs py-8">{text}</p>
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="text-center text-white/20 text-xs py-8">{text}</p>
}
