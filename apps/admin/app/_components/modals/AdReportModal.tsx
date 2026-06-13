'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdImpressionsReport, getAdImpressionsHistory } from '@rokka/supabase'
import type { AdImpressionReportRow, AdImpressionRow } from '@rokka/supabase'
import { formatDate, formatHour } from '@rokka/shared'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  barId: string
  onClose: () => void
}

// ── AdReportModal ─────────────────────────────────────────────────────────────

export default function AdReportModal({ barId, onClose }: Props) {
  const [report,   setReport]   = useState<AdImpressionReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!barId) return
    setIsLoading(true)
    getAdImpressionsReport(barId)
      .then(setReport)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId])

  return (
    <AnimatePresence>
      <motion.div
        key="ad-report-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/75 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-2xl w-full max-w-md max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Anuncios</p>
              <p className="text-white font-bold text-base mt-0.5">📊 Informe de impresiones</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-2">
            {isLoading ? (
              <p className="text-center text-white/20 text-xs py-8">Cargando informe…</p>
            ) : report.length === 0 ? (
              <p className="text-center text-white/20 text-xs py-8">Sin anuncios para mostrar.</p>
            ) : (
              report.map((row) => (
                <ReportRow
                  key={row.ad_id}
                  row={row}
                  expanded={expandedId === row.ad_id}
                  onToggle={() => setExpandedId((prev) => (prev === row.ad_id ? null : row.ad_id))}
                />
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── ReportRow ─────────────────────────────────────────────────────────────────

function ReportRow({
  row,
  expanded,
  onToggle,
}: {
  row: AdImpressionReportRow
  expanded: boolean
  onToggle: () => void
}) {
  const [history, setHistory]   = useState<AdImpressionRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!expanded || history.length > 0) return
    setIsLoading(true)
    getAdImpressionsHistory(row.ad_id, 20)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl p-3">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none shrink-0">{row.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-white text-[13px] truncate">{row.title}</p>
            <p className="text-[10px] text-white/30">
              {row.last_shown
                ? `Última vez: ${formatDate(row.last_shown)} ${formatHour(row.last_shown)}`
                : 'Aún no se ha mostrado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              row.is_active
                ? 'bg-rokka-green/10 border-rokka-green/30 text-rokka-green'
                : 'bg-white/5 border-white/15 text-white/30'
            }`}
          >
            {row.is_active ? 'Activo' : 'Off'}
          </span>
          <span className="text-rokka-cyan font-bold text-sm tabular-nums">{row.total_count}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#1e1e1e] space-y-1">
          {isLoading ? (
            <p className="text-[11px] text-white/20 text-center py-2">Cargando historial…</p>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-2">Sin historial todavía.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-[11px]">
                <span className="text-white/50">
                  {formatDate(h.shown_at)} {formatHour(h.shown_at)}
                </span>
                <span className="text-white/30 uppercase">{h.source}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
