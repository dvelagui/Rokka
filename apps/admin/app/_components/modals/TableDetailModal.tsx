'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTransactionHistory } from '@rokka/supabase'
import type { TableRow } from '@rokka/supabase'
import type { CreditTransaction } from '@rokka/supabase'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  table: TableRow
  barId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function fmtTimestamp(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${time}`
}

const TX_STATUS_CLS: Record<string, string> = {
  completed: 'text-rokka-green',
  pending:   'text-rokka-orange',
  failed:    'text-white/30',
  cancelled: 'text-white/30',
}

const TX_STATUS_ICON: Record<string, string> = {
  completed: '✓',
  pending:   '⏳',
  failed:    '✗',
  cancelled: '✗',
}

// ── TableDetailModal ──────────────────────────────────────────────────────────

export default function TableDetailModal({ isOpen, onClose, table, barId }: Props) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [isLoading,    setIsLoading]    = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    getTransactionHistory(barId, table.id, 20)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [isOpen, barId, table.id])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="table-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/[0.93] flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#111] border border-[#2a2a2a] rounded-[14px] w-full max-w-[370px] max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0a0a0a] flex items-center justify-between px-4 py-3.5 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Detalle de mesa
                </p>
                <p className="text-sm font-bold text-white mt-0.5">{table.label}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Info strip */}
            <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] mx-4 mt-4 rounded-xl overflow-hidden shrink-0">
              {[
                { label: '💳 Créditos',        value: fmtPrice(table.credits) },
                { label: table.is_active ? '✅ Activa' : '⚫ Inactiva',
                  value: table.connected_at ? 'Conectada' : 'Sin sesión' },
                { label: table.is_banned ? '🚫 Baneada' : '🟢 Libre',
                  value: `Mesa ${table.number}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#111] flex flex-col items-center py-3">
                  <p className="text-[9px] text-white/30 text-center leading-tight px-1">{label}</p>
                  <p className="text-xs font-bold text-white mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* Transactions list */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 mt-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                Últimas transacciones
              </p>

              {isLoading ? (
                <p className="text-center text-white/20 text-xs py-6">Cargando…</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-white/20 text-xs py-6">Sin transacciones registradas</p>
              ) : (
                transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── TxRow ─────────────────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: CreditTransaction }) {
  const isRecharge = tx.type === 'recharge'
  const statusCls  = TX_STATUS_CLS[tx.status] ?? 'text-white/30'
  const statusIcon = TX_STATUS_ICON[tx.status] ?? '?'

  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl px-3 py-2 flex items-center gap-2.5">
      <span className="text-base leading-none shrink-0">{isRecharge ? '💳' : '💸'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-white">
            {isRecharge ? 'Recarga' : 'Débito'}
          </p>
          <span className={`text-[10px] font-bold ${statusCls}`}>{statusIcon}</span>
        </div>
        <p className="text-[9px] text-white/25 mt-0.5">{fmtTimestamp(tx.created_at)}</p>
      </div>
      <span className={`text-sm font-bold shrink-0 ${isRecharge ? 'text-rokka-cyan' : 'text-white/50'}`}>
        {isRecharge ? '+' : '−'}{fmtPrice(tx.amount)}
      </span>
    </div>
  )
}
