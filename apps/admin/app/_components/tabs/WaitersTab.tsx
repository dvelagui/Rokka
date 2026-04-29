'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useRealtime,
  useWaiters,
  useOrders,
  getTransactionHistory,
} from '@rokka/supabase'
import type { WaiterPublic, CreditTransaction } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'
import WaiterFormModal from '../modals/WaiterFormModal'
import WaiterMovementsModal from '../modals/WaiterMovementsModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SHIFT_LABEL: Record<string, string> = {
  manana:  'Mañana (6am–2pm)',
  tarde:   'Tarde (2pm–10pm)',
  noche:   'Noche (10pm–6am)',
  partido: 'Partido',
  full:    'Turno completo',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── WaitersTab ────────────────────────────────────────────────────────────────

export default function WaitersTab() {
  const { bar, admin }   = useAdminContext()
  const { tables }       = useRealtime()
  const { waiters, isLoading, createWaiter, updateWaiter, toggleActive } = useWaiters(bar?.id ?? null)
  const { orders }       = useOrders(bar?.id ?? null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])

  // Table label map for movements modal
  const tableLabelMap = useMemo(
    () => new Map((tables?.tables ?? []).map((t) => [t.id, t.label])),
    [tables?.tables],
  )

  // Load credit transactions once for stats
  useEffect(() => {
    if (!bar?.id) return
    getTransactionHistory(bar.id, undefined, 200)
      .then(setTransactions)
      .catch(console.error)
  }, [bar?.id])

  // Per-waiter stats
  const waiterStats = useMemo(() => {
    const map = new Map<string, { orders: number; confirmed: number; recharges: number }>()
    for (const o of orders) {
      if (!o.waiter_id) continue
      const s = map.get(o.waiter_id) ?? { orders: 0, confirmed: 0, recharges: 0 }
      s.orders += 1
      if (o.status !== 'cancelled') s.confirmed += 1
      map.set(o.waiter_id, s)
    }
    for (const tx of transactions) {
      if (!tx.verified_by) continue
      const s = map.get(tx.verified_by) ?? { orders: 0, confirmed: 0, recharges: 0 }
      s.recharges += 1
      map.set(tx.verified_by, s)
    }
    return map
  }, [orders, transactions])

  // Modal state
  const [formTarget,  setFormTarget]  = useState<WaiterPublic | 'create' | null>(null)
  const [movTarget,   setMovTarget]   = useState<WaiterPublic | null>(null)
  const [togglingId,  setTogglingId]  = useState<string | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleSave(
    data: { name: string; phone: string; pin: string; shift: string },
    isNew: boolean,
  ) {
    if (!bar?.id) return
    if (isNew) {
      await createWaiter({ name: data.name, pin: data.pin, phone: data.phone || undefined, shift: data.shift })
    } else if (formTarget && formTarget !== 'create') {
      const update: Partial<{ name: string; phone: string; shift: string; pin: string }> = {
        name:  data.name,
        phone: data.phone || undefined,
        shift: data.shift,
      }
      if (data.pin) update.pin = data.pin
      await updateWaiter(formTarget.id, update)
    }
  }

  async function handleToggleActive(waiter: WaiterPublic) {
    setTogglingId(waiter.id)
    try { await toggleActive(waiter.id) } finally { setTogglingId(null) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/30">Personal con trazabilidad de movimientos</p>
        <button
          onClick={() => setFormTarget('create')}
          className="text-xs px-3 py-1.5 rounded-lg bg-rokka-cyan/15 border border-rokka-cyan/40 text-rokka-cyan font-semibold hover:bg-rokka-cyan/25 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-white/20 text-xs py-8">Cargando personal…</p>
      ) : waiters.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-8">
          Sin meseros registrados. Agrega uno para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {waiters.map((w) => {
            const stats  = waiterStats.get(w.id)
            const loading = togglingId === w.id
            return (
              <WaiterCard
                key={w.id}
                waiter={w}
                stats={stats}
                isLoading={loading}
                onViewMovements={() => setMovTarget(w)}
                onEdit={() => setFormTarget(w)}
                onToggleActive={() => handleToggleActive(w)}
              />
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {formTarget !== null && (
        <WaiterFormModal
          waiter={formTarget === 'create' ? null : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      {/* Movements modal */}
      {movTarget && (
        <WaiterMovementsModal
          waiter={movTarget}
          barId={bar?.id ?? ''}
          tableLabelMap={tableLabelMap}
          onClose={() => setMovTarget(null)}
        />
      )}
    </>
  )
}

// ── WaiterCard ────────────────────────────────────────────────────────────────

function WaiterCard({
  waiter,
  stats,
  isLoading,
  onViewMovements,
  onEdit,
  onToggleActive,
}: {
  waiter: WaiterPublic
  stats?: { orders: number; confirmed: number; recharges: number }
  isLoading: boolean
  onViewMovements: () => void
  onEdit: () => void
  onToggleActive: () => void
}) {
  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-2">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Name + status dot */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${waiter.is_active ? 'bg-rokka-green' : 'bg-white/25'}`}
            />
            <span className="font-bold text-white text-[13px] truncate">{waiter.name}</span>
          </div>

          {/* Phone + shift */}
          <p className="text-[10px] text-white/35 mt-0.5 ml-4">
            {waiter.phone ? `📞 ${waiter.phone}` : 'Sin teléfono'} · {SHIFT_LABEL[waiter.shift] ?? waiter.shift}
          </p>

          {/* Join date */}
          <p className="text-[9px] text-white/20 mt-0.5 ml-4">
            Desde {fmtDate(waiter.created_at)}
          </p>
        </div>

        {/* Status pill */}
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5
            ${waiter.is_active
              ? 'bg-rokka-green/10 border-rokka-green/30 text-rokka-green'
              : 'bg-white/5 border-white/15 text-white/30'
            }
          `}
        >
          {waiter.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Stats row */}
      <p className="text-[10px] text-white/30 ml-4">
        ✅ {stats?.confirmed ?? 0} confirmados
        {' · '}
        💳 {stats?.recharges ?? 0} recargas
        {' · '}
        📦 {stats?.orders ?? 0} pedidos
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 ml-4 flex-wrap">
        <button
          onClick={onViewMovements}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-[#2a2a2a] text-white/50 hover:text-white/80 hover:border-white/30 transition-colors"
        >
          Ver Mov.
        </button>

        <button
          onClick={onEdit}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-[#2a2a2a] text-white/50 hover:text-white/80 hover:border-white/30 transition-colors"
        >
          ✏️ Editar
        </button>

        <button
          onClick={onToggleActive}
          disabled={isLoading}
          className={`
            text-[11px] px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40
            ${waiter.is_active
              ? 'border-rokka-red/30 text-rokka-red/70 hover:bg-rokka-red/10'
              : 'border-rokka-green/30 text-rokka-green/70 hover:bg-rokka-green/10'
            }
          `}
        >
          {isLoading ? '…' : waiter.is_active ? 'Inactivar' : 'Activar'}
        </button>
      </div>
    </div>
  )
}
