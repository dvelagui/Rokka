'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWaiterMovements } from '@rokka/supabase'
import type { WaiterPublic, WaiterMovement } from '@rokka/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'order' | 'recharge'

interface Props {
  waiter: WaiterPublic
  barId: string
  tableLabelMap: Map<string, string>
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const ORDER_STATUS_CLS: Record<string, string> = {
  pending:   'text-rokka-orange',
  confirmed: 'text-blue-400',
  preparing: 'text-rokka-purple',
  delivered: 'text-rokka-green',
  cancelled: 'text-white/30',
  completed: 'text-rokka-green',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  completed: 'Completada',
}

// ── WaiterMovementsModal ──────────────────────────────────────────────────────

export default function WaiterMovementsModal({ waiter, barId, tableLabelMap, onClose }: Props) {
  const [movements, setMovements] = useState<WaiterMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter,    setFilter]    = useState<FilterType>('all')

  useEffect(() => {
    setIsLoading(true)
    getWaiterMovements(barId, waiter.id)
      .then(setMovements)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [barId, waiter.id])

  const filtered = filter === 'all'
    ? movements
    : movements.filter((m) => m.type === filter)

  // Quick stats
  const totalOrders    = movements.filter((m) => m.type === 'order').length
  const totalRecharges = movements.filter((m) => m.type === 'recharge').length
  const totalRevenue   = movements
    .filter((m) => m.type === 'recharge' && m.status === 'completed')
    .reduce((s, m) => s + m.amount, 0)

  return (
    <AnimatePresence>
      <motion.div
        key="movements-overlay"
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
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Movimientos
              </p>
              <p className="text-white font-bold text-base mt-0.5">{waiter.name}</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
              ✕
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] mx-5 rounded-xl overflow-hidden mb-3 shrink-0">
            {[
              { label: '📦 Pedidos',  value: totalOrders },
              { label: '💳 Recargas', value: totalRecharges },
              { label: '💰 Recaudado', value: fmtPrice(totalRevenue) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card flex flex-col items-center py-2.5">
                <p className="text-xs text-white/30">{label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex gap-1 px-5 mb-3 shrink-0">
            {(['all', 'order', 'recharge'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                  ${filter === f ? 'bg-rokka-cyan text-black' : 'bg-card text-white/40 hover:text-white/70'}
                `}
              >
                {f === 'all' ? 'Todo' : f === 'order' ? '📦 Pedidos' : '💳 Recargas'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-2">
            {isLoading ? (
              <p className="text-center text-white/20 text-xs py-8">Cargando movimientos…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/20 text-xs py-8">
                {filter === 'all' ? 'Sin movimientos registrados' : `Sin ${filter === 'order' ? 'pedidos' : 'recargas'}`}
              </p>
            ) : (
              filtered.map((mov) => (
                <MovementRow key={mov.id} movement={mov} tableLabelMap={tableLabelMap} />
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── MovementRow ───────────────────────────────────────────────────────────────

function MovementRow({
  movement,
  tableLabelMap,
}: {
  movement: WaiterMovement
  tableLabelMap: Map<string, string>
}) {
  const tableLabel = tableLabelMap.get(movement.table_id) ?? '?'
  const isOrder    = movement.type === 'order'

  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl px-3 py-2.5 flex items-start gap-3">
      {/* Icon */}
      <span className="text-lg leading-none mt-0.5 shrink-0">
        {isOrder ? '📦' : '💳'}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-white">Mesa {tableLabel}</span>
          <span
            className={`text-[9px] font-bold ${ORDER_STATUS_CLS[movement.status] ?? 'text-white/40'}`}
          >
            {ORDER_STATUS_LABEL[movement.status] ?? movement.status}
          </span>
        </div>
        {movement.detail && (
          <p className="text-[11px] text-white/40 mt-0.5 truncate">{movement.detail}</p>
        )}
        <p className="text-[10px] text-white/25 mt-0.5">{fmtDateTime(movement.created_at)}</p>
      </div>

      {/* Amount */}
      <span className={`text-sm font-bold shrink-0 ${isOrder ? 'text-white/60' : 'text-rokka-cyan'}`}>
        {fmtPrice(movement.amount)}
      </span>
    </div>
  )
}
