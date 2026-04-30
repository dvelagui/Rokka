'use client'

import { useState, useMemo } from 'react'
import {
  useTables,
  useRealtime,
  createTable,
  toggleTableActive,
  banTable,
  unbanTable,
  deleteTable,
  updateBarConfig,
} from '@rokka/supabase'
import type { TableRow } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'
import RechargeModal from '../modals/RechargeModal'

// ── TablesTab ─────────────────────────────────────────────────────────────────

export default function TablesTab() {
  const { bar, barConfig, refreshBar } = useAdminContext()
  const { queue: queueState }          = useRealtime()
  const {
    tables,
    callingTables,
    isLoading,
    refresh,
    clearCall,
  } = useTables(bar?.id ?? null)

  const [rechargeTarget,  setRechargeTarget]  = useState<{ id: string; label: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [creatingTable,   setCreatingTable]   = useState(false)
  const [actionLoading,   setActionLoading]   = useState<string | null>(null) // tableId of in-progress action

  // Songs per table from live queue
  const songCountByTable = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of queueState.queue) {
      if ((item.status === 'queued' || item.status === 'playing') && item.table_id) {
        map.set(item.table_id, (map.get(item.table_id) ?? 0) + 1)
      }
    }
    return map
  }, [queueState.queue])

  const songLimit = barConfig?.max_canciones_por_mesa ?? 4

  // ── Quick config ────────────────────────────────────────────────────────────

  async function handleSongLimit(limit: number) {
    if (!bar?.id) return
    await updateBarConfig(bar.id, { max_canciones_por_mesa: limit })
    await refreshBar()
  }

  async function handleClosingTime(time: string) {
    if (!bar?.id) return
    await updateBarConfig(bar.id, { closing_time: time })
    await refreshBar()
  }

  // ── Create table ─────────────────────────────────────────────────────────────

  async function handleCreateTable() {
    if (!bar?.id || creatingTable) return
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1
    setCreatingTable(true)
    try {
      await createTable(bar.id, { number: nextNumber, label: `Mesa ${nextNumber}` })
      await refresh()
    } catch (err) {
      console.error('[TablesTab] create failed:', err)
    } finally {
      setCreatingTable(false)
    }
  }

  // ── Table actions ────────────────────────────────────────────────────────────

  async function handleToggleActive(table: TableRow) {
    if (!bar?.id) return
    setActionLoading(table.id)
    try {
      await toggleTableActive(bar.id, table.id)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBan(table: TableRow) {
    if (!bar?.id) return
    setActionLoading(table.id)
    try {
      if (table.is_banned) await unbanTable(bar.id, table.id)
      else                 await banTable(bar.id, table.id)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(table: TableRow) {
    if (!bar?.id) return
    if (confirmDeleteId !== table.id) {
      setConfirmDeleteId(table.id)
      return
    }
    setActionLoading(table.id)
    setConfirmDeleteId(null)
    try {
      await deleteTable(bar.id, table.id)
    } catch (err) {
      console.error('[TablesTab] delete failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Quick config */}
      <div className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Configuración rápida
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-white/50 shrink-0">Canciones/mesa:</span>
          <div className="flex gap-1.5">
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleSongLimit(n)}
                className={`
                  w-9 h-8 rounded-lg text-sm font-bold border transition-colors
                  ${songLimit === n
                    ? 'bg-rokka-cyan/15 border-rokka-cyan text-rokka-cyan'
                    : 'bg-transparent border-[#2a2a2a] text-white/40 hover:border-white/30 hover:text-white/70'
                  }
                `}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-white/50 shrink-0">Hora de cierre:</span>
          <div className="flex items-center gap-2">
            <input
              type="time"
              defaultValue={barConfig?.closing_time ?? ''}
              onBlur={(e) => { if (e.target.value) handleClosingTime(e.target.value) }}
              className="bg-transparent border border-[#2a2a2a] rounded-lg px-2 py-1 text-sm text-white/70 focus:outline-none focus:border-rokka-cyan/50 [color-scheme:dark]"
            />
            <span className="text-[10px] text-white/25">1h antes: no más canciones</span>
          </div>
        </div>
      </div>

      {/* New table button */}
      <button
        onClick={handleCreateTable}
        disabled={creatingTable}
        className="w-full py-2.5 mb-3 rounded-xl border border-dashed border-white/20 text-white/40 text-sm hover:border-rokka-cyan/40 hover:text-rokka-cyan/60 transition-colors disabled:opacity-30"
      >
        {creatingTable ? 'Creando…' : '+ Nueva Mesa'}
      </button>

      {/* Tables list */}
      {isLoading ? (
        <p className="text-center text-white/20 text-xs py-8">Cargando mesas…</p>
      ) : tables.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-8">Sin mesas creadas</p>
      ) : (
        <div className="space-y-2">
          {tables.map((table) => {
            const isCalling = callingTables.has(table.id)
            const songCount = songCountByTable.get(table.id) ?? 0
            const isLoading = actionLoading === table.id
            const isConfirmingDelete = confirmDeleteId === table.id

            return (
              <TableCard
                key={table.id}
                table={table}
                isCalling={isCalling}
                songCount={songCount}
                songLimit={songLimit}
                isLoading={isLoading}
                isConfirmingDelete={isConfirmingDelete}
                onAttend={() => clearCall(table.id)}
                onRecharge={() => setRechargeTarget({ id: table.id, label: table.label })}
                onToggleActive={() => handleToggleActive(table)}
                onBan={() => handleBan(table)}
                onDelete={() => handleDelete(table)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            )
          })}
        </div>
      )}

      {/* Recharge modal */}
      {rechargeTarget && (
        <RechargeModal
          tableId={rechargeTarget.id}
          tableLabel={rechargeTarget.label}
          onClose={() => setRechargeTarget(null)}
        />
      )}
    </>
  )
}

// ── TableCard ─────────────────────────────────────────────────────────────────

interface TableCardProps {
  table: TableRow
  isCalling: boolean
  songCount: number
  songLimit: number
  isLoading: boolean
  isConfirmingDelete: boolean
  onAttend: () => void
  onRecharge: () => void
  onToggleActive: () => void
  onBan: () => void
  onDelete: () => void
  onCancelDelete: () => void
}

function TableCard({
  table, isCalling, songCount, songLimit, isLoading, isConfirmingDelete,
  onAttend, onRecharge, onToggleActive, onBan, onDelete, onCancelDelete,
}: TableCardProps) {
  const isConnected = Boolean(table.connected_at)

  return (
    <div
      style={{ opacity: !table.is_active ? 0.55 : 1 }}
      className={`
        bg-card border rounded-xl p-3 space-y-2.5 transition-opacity
        ${table.is_banned ? 'border-rokka-red/50' : 'border-[#1e1e1e]'}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-sm">{table.label}</span>

          {table.is_banned && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rokka-red/20 text-rokka-red">
              🚫 Baneada
            </span>
          )}
          {isCalling && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rokka-green/15 text-rokka-green flex items-center gap-1">
              <span className="bell-ring inline-block">🔔</span> Llamando
            </span>
          )}
          {!table.is_active && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
              Inactiva
            </span>
          )}
          {table.is_active && !isCalling && !table.is_banned && isConnected && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rokka-green/10 text-rokka-green/70">
              Conectada
            </span>
          )}
        </div>

        {/* Credits */}
        <span className="text-rokka-cyan font-black text-base shrink-0">
          {table.credits.toLocaleString()}
        </span>
      </div>

      {/* Stats row */}
      <p className="text-xs text-white/30">
        {isConnected ? '1 usuario' : 'Sin usuarios'} · {songCount}/{songLimit} canciones
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {isCalling && (
          <ActionBtn
            onClick={onAttend}
            disabled={isLoading}
            className="bg-rokka-green/15 border-rokka-green/40 text-rokka-green hover:bg-rokka-green/25"
          >
            🔔 Atender
          </ActionBtn>
        )}

        <ActionBtn onClick={onRecharge} disabled={isLoading}>
          💳 Recargar
        </ActionBtn>

        <ActionBtn onClick={onToggleActive} disabled={isLoading}>
          {table.is_active ? 'Deshabilitar' : 'Habilitar'}
        </ActionBtn>

        <ActionBtn
          onClick={onBan}
          disabled={isLoading}
          className={table.is_banned ? 'border-rokka-green/30 text-rokka-green/70 hover:bg-rokka-green/10' : 'hover:border-rokka-red/40 hover:text-rokka-red/70'}
        >
          {table.is_banned ? 'Desbanear' : 'Banear'}
        </ActionBtn>

        {isConfirmingDelete ? (
          <>
            <ActionBtn
              onClick={onDelete}
              disabled={isLoading}
              className="border-rokka-red/50 text-rokka-red bg-rokka-red/10"
            >
              ¿Confirmar borrado?
            </ActionBtn>
            <ActionBtn onClick={onCancelDelete} disabled={isLoading}>
              Cancelar
            </ActionBtn>
          </>
        ) : (
          <ActionBtn
            onClick={onDelete}
            disabled={isLoading}
            className="hover:border-rokka-red/30 hover:text-rokka-red/60"
          >
            Borrar
          </ActionBtn>
        )}
      </div>
    </div>
  )
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

function ActionBtn({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        text-xs px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] text-white/50
        hover:text-white/80 hover:border-white/30 transition-colors
        disabled:opacity-30 ${className}
      `}
    >
      {children}
    </button>
  )
}
