'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useRealtime,
  useOrders,
  useWaiters,
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  updateOrderStatus,
} from '@rokka/supabase'
import type { Order, OrderStatus, MenuCategory, MenuSubcategory, MenuItem } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants / helpers ───────────────────────────────────────────────────────

type SubTab = 'menu' | 'pedidos'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'confirmed',
  confirmed: 'preparing',
  preparing: 'delivered',
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}
const STATUS_CLS: Record<OrderStatus, string> = {
  pending:   'text-rokka-orange  border-rokka-orange/40  bg-rokka-orange/10',
  confirmed: 'text-blue-400      border-blue-400/40      bg-blue-400/10',
  preparing: 'text-rokka-purple  border-rokka-purple/40  bg-rokka-purple/10',
  delivered: 'text-rokka-green   border-rokka-green/40   bg-rokka-green/10',
  cancelled: 'text-white/30      border-white/15         bg-white/5',
}

function fmtPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* no-op if AudioContext blocked */ }
}

// ── MenuTab root ──────────────────────────────────────────────────────────────

export default function MenuTab() {
  const { bar }   = useAdminContext()
  const [subTab, setSubTab] = useState<SubTab>('menu')

  // Count pending orders for badge
  const { orders } = useOrders(bar?.id ?? null)
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="space-y-3">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-card border border-[#1e1e1e] rounded-xl p-1">
        {(['menu', 'pedidos'] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 rounded-lg transition-colors
              ${subTab === t ? 'bg-rokka-cyan text-black' : 'text-white/40 hover:text-white/70'}
            `}
          >
            {t === 'menu' ? '🍽 Menú' : '📋 Pedidos'}
            {t === 'pedidos' && pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rokka-orange text-black text-[9px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'menu'    && <MenuSection barId={bar?.id ?? ''} />}
      {subTab === 'pedidos' && <PedidosSection barId={bar?.id ?? ''} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU SECTION
// ─────────────────────────────────────────────────────────────────────────────

function MenuSection({ barId }: { barId: string }) {
  const [menu,     setMenu]     = useState<MenuCategory[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expCats,  setExpCats]  = useState<Set<string>>(new Set())
  const [expSubs,  setExpSubs]  = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!barId) return
    setLoading(true)
    getMenu(barId, true)
      .then(setMenu)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [barId])

  // ── Category ops ───────────────────────────────────────────────────────────

  async function handleCreateCategory() {
    const cat = await createCategory(barId, { name: 'Nueva Categoría', emoji: '🍽️' })
    setMenu((prev) => [...prev, { ...cat, subcategories: [] }])
    setExpCats((prev) => new Set([...prev, cat.id]))
  }

  async function handleUpdateCategory(catId: string, data: Partial<{ name: string; emoji: string }>) {
    await updateCategory(catId, data)
    setMenu((prev) => prev.map((c) => c.id === catId ? { ...c, ...data } : c))
  }

  async function handleDeleteCategory(catId: string) {
    await deleteCategory(catId)
    setMenu((prev) => prev.filter((c) => c.id !== catId))
  }

  // ── Subcategory ops ────────────────────────────────────────────────────────

  async function handleCreateSub(catId: string) {
    const sub = await createSubcategory(catId, { name: 'Nueva Sección' })
    setMenu((prev) => prev.map((c) =>
      c.id === catId ? { ...c, subcategories: [...c.subcategories, { ...sub, items: [] }] } : c,
    ))
    setExpSubs((prev) => new Set([...prev, sub.id]))
  }

  async function handleUpdateSub(catId: string, subId: string, name: string) {
    const supabase = (await import('@rokka/supabase')).getSupabaseBrowserClient()
    await supabase.from('menu_subcategories').update({ name }).eq('id', subId)
    setMenu((prev) => prev.map((c) =>
      c.id === catId
        ? { ...c, subcategories: c.subcategories.map((s) => s.id === subId ? { ...s, name } : s) }
        : c,
    ))
  }

  async function handleDeleteSub(catId: string, subId: string) {
    await deleteSubcategory(subId)
    setMenu((prev) => prev.map((c) =>
      c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c,
    ))
  }

  // ── Item ops ────────────────────────────────────────────────────────────────

  async function handleCreateItem(catId: string, subId: string) {
    const item = await createMenuItem(subId, barId, { name: 'Nuevo Producto', price: 10_000 })
    setMenu((prev) => prev.map((c) =>
      c.id === catId
        ? {
            ...c,
            subcategories: c.subcategories.map((s) =>
              s.id === subId ? { ...s, items: [...s.items, item] } : s,
            ),
          }
        : c,
    ))
  }

  async function handleUpdateItem(catId: string, subId: string, itemId: string, data: Partial<{ name: string; price: number }>) {
    await updateMenuItem(itemId, data)
    setMenu((prev) => prev.map((c) =>
      c.id === catId
        ? {
            ...c,
            subcategories: c.subcategories.map((s) =>
              s.id === subId
                ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, ...data } : i) }
                : s,
            ),
          }
        : c,
    ))
  }

  async function handleToggleAvailability(catId: string, subId: string, itemId: string) {
    const next = await toggleItemAvailability(itemId)
    setMenu((prev) => prev.map((c) =>
      c.id === catId
        ? {
            ...c,
            subcategories: c.subcategories.map((s) =>
              s.id === subId
                ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, is_available: next } : i) }
                : s,
            ),
          }
        : c,
    ))
  }

  async function handleDeleteItem(catId: string, subId: string, itemId: string) {
    await deleteMenuItem(itemId)
    setMenu((prev) => prev.map((c) =>
      c.id === catId
        ? {
            ...c,
            subcategories: c.subcategories.map((s) =>
              s.id === subId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s,
            ),
          }
        : c,
    ))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-center text-white/20 text-xs py-8">Cargando menú…</p>

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Menú del Bar</p>
        <button
          onClick={handleCreateCategory}
          className="text-xs px-3 py-1.5 rounded-lg bg-rokka-cyan/15 border border-rokka-cyan/40 text-rokka-cyan font-semibold hover:bg-rokka-cyan/25 transition-colors"
        >
          + Categoría
        </button>
      </div>

      {menu.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="text-4xl">🍽️</span>
          <p className="text-sm text-white/30 text-center">Tu menú está vacío</p>
          <button
            onClick={handleCreateCategory}
            className="text-sm px-4 py-2 rounded-xl bg-rokka-cyan/15 border border-rokka-cyan/40 text-rokka-cyan font-semibold hover:bg-rokka-cyan/25 transition-colors"
          >
            + Agrega tu primer producto
          </button>
        </div>
      )}

      {menu.map((cat) => {
        const totalItems = cat.subcategories.reduce((s, sub) => s + sub.items.length, 0)
        return (
          <CategoryRow
            key={cat.id}
            cat={cat}
            totalItems={totalItems}
            expanded={expCats.has(cat.id)}
            expSubs={expSubs}
            onToggle={() => setExpCats((prev) => {
              const n = new Set(prev)
              n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id)
              return n
            })}
            onToggleSub={(subId) => setExpSubs((prev) => {
              const n = new Set(prev)
              n.has(subId) ? n.delete(subId) : n.add(subId)
              return n
            })}
            onUpdate={(data) => handleUpdateCategory(cat.id, data)}
            onDelete={() => handleDeleteCategory(cat.id)}
            onCreateSub={() => handleCreateSub(cat.id)}
            onUpdateSub={(subId, name) => handleUpdateSub(cat.id, subId, name)}
            onDeleteSub={(subId) => handleDeleteSub(cat.id, subId)}
            onCreateItem={(subId) => handleCreateItem(cat.id, subId)}
            onUpdateItem={(subId, itemId, data) => handleUpdateItem(cat.id, subId, itemId, data)}
            onToggleAvailability={(subId, itemId) => handleToggleAvailability(cat.id, subId, itemId)}
            onDeleteItem={(subId, itemId) => handleDeleteItem(cat.id, subId, itemId)}
          />
        )
      })}
    </div>
  )
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

interface CategoryRowProps {
  cat: MenuCategory
  totalItems: number
  expanded: boolean
  expSubs: Set<string>
  onToggle: () => void
  onToggleSub: (subId: string) => void
  onUpdate: (data: Partial<{ name: string; emoji: string }>) => Promise<void>
  onDelete: () => Promise<void>
  onCreateSub: () => Promise<void>
  onUpdateSub: (subId: string, name: string) => Promise<void>
  onDeleteSub: (subId: string) => Promise<void>
  onCreateItem: (subId: string) => Promise<void>
  onUpdateItem: (subId: string, itemId: string, data: Partial<{ name: string; price: number }>) => Promise<void>
  onToggleAvailability: (subId: string, itemId: string) => Promise<void>
  onDeleteItem: (subId: string, itemId: string) => Promise<void>
}

function CategoryRow({
  cat, totalItems, expanded, expSubs,
  onToggle, onToggleSub, onUpdate, onDelete, onCreateSub,
  onUpdateSub, onDeleteSub, onCreateItem, onUpdateItem, onToggleAvailability, onDeleteItem,
}: CategoryRowProps) {
  const [editName,  setEditName]  = useState(cat.name)
  const [editEmoji, setEditEmoji] = useState(cat.emoji)
  const [editingName, setEditingName] = useState(false)

  function saveName() {
    setEditingName(false)
    if (editName.trim() !== cat.name || editEmoji !== cat.emoji) {
      void onUpdate({ name: editName.trim() || cat.name, emoji: editEmoji || cat.emoji })
    }
  }

  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Emoji inline edit */}
        <input
          type="text"
          value={editEmoji}
          onChange={(e) => setEditEmoji(e.target.value)}
          onBlur={() => void onUpdate({ emoji: editEmoji || '🍽️' })}
          maxLength={2}
          className="w-8 text-center text-lg bg-transparent focus:outline-none focus:bg-white/5 rounded cursor-pointer"
        />

        {/* Name inline edit */}
        {editingName ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="flex-1 bg-white/5 border border-rokka-cyan/30 rounded-lg px-2 py-0.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-sm font-semibold text-white hover:text-rokka-cyan/80 transition-colors"
          >
            {cat.name}
          </button>
        )}

        <span className="text-[10px] text-white/25 shrink-0">{totalItems} productos</span>

        <button
          onClick={() => void onDelete()}
          className="text-white/20 hover:text-rokka-red/70 text-xs transition-colors shrink-0"
          title="Eliminar categoría"
        >
          ✕
        </button>

        <button
          onClick={onToggle}
          className="text-white/40 text-xs shrink-0 w-5 text-center"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Subcategory list */}
      {expanded && (
        <div className="border-t border-[#1a1a1a]">
          {cat.subcategories.map((sub) => (
            <SubcategoryRow
              key={sub.id}
              sub={sub}
              expanded={expSubs.has(sub.id)}
              onToggle={() => onToggleSub(sub.id)}
              onUpdate={(name) => onUpdateSub(sub.id, name)}
              onDelete={() => onDeleteSub(sub.id)}
              onCreateItem={() => onCreateItem(sub.id)}
              onUpdateItem={(itemId, data) => onUpdateItem(sub.id, itemId, data)}
              onToggleAvailability={(itemId) => onToggleAvailability(sub.id, itemId)}
              onDeleteItem={(itemId) => onDeleteItem(sub.id, itemId)}
            />
          ))}

          <button
            onClick={() => void onCreateSub()}
            className="w-full text-left text-xs text-white/30 hover:text-rokka-cyan/60 px-4 py-2.5 transition-colors border-t border-[#111] flex items-center gap-1.5"
          >
            <span className="text-sm">＋</span> Agregar sección
          </button>
        </div>
      )}
    </div>
  )
}

// ── SubcategoryRow ────────────────────────────────────────────────────────────

interface SubcategoryRowProps {
  sub: MenuSubcategory
  expanded: boolean
  onToggle: () => void
  onUpdate: (name: string) => Promise<void>
  onDelete: () => Promise<void>
  onCreateItem: () => Promise<void>
  onUpdateItem: (itemId: string, data: Partial<{ name: string; price: number }>) => Promise<void>
  onToggleAvailability: (itemId: string) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
}

function SubcategoryRow({
  sub, expanded, onToggle, onUpdate, onDelete, onCreateItem,
  onUpdateItem, onToggleAvailability, onDeleteItem,
}: SubcategoryRowProps) {
  const [editName, setEditName]   = useState(sub.name)
  const [editing, setEditing]     = useState(false)

  function saveName() {
    setEditing(false)
    if (editName.trim() !== sub.name) void onUpdate(editName.trim() || sub.name)
  }

  return (
    <div className="border-t border-[#161616]">
      {/* Subcategory header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-white/30 text-xs shrink-0">▸</span>

        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="flex-1 bg-white/5 border border-rokka-cyan/30 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            {sub.name}
          </button>
        )}

        <span className="text-[10px] text-white/20 shrink-0">{sub.items.length}</span>

        <button
          onClick={() => void onDelete()}
          className="text-white/15 hover:text-rokka-red/60 text-[10px] shrink-0 transition-colors"
        >
          ✕
        </button>

        <button onClick={onToggle} className="text-white/30 text-[10px] shrink-0 w-4 text-center">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Items */}
      {expanded && (
        <div>
          {sub.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onUpdate={(data) => onUpdateItem(item.id, data)}
              onToggleAvailability={() => onToggleAvailability(item.id)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}

          <button
            onClick={() => void onCreateItem()}
            className="w-full text-left text-[11px] text-white/25 hover:text-rokka-cyan/50 px-6 py-2 transition-colors border-t border-[#111] flex items-center gap-1"
          >
            <span>＋</span> Agregar producto
          </button>
        </div>
      )}
    </div>
  )
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onUpdate,
  onToggleAvailability,
  onDelete,
}: {
  item: MenuItem
  onUpdate: (data: Partial<{ name: string; price: number }>) => Promise<void>
  onToggleAvailability: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editName,    setEditName]    = useState(item.name)
  const [editPrice,   setEditPrice]   = useState(String(item.price))
  const [editingName, setEditingName] = useState(false)
  const [editingPrice,setEditingPrice]= useState(false)
  const [toggling,    setToggling]    = useState(false)

  function saveName() {
    setEditingName(false)
    if (editName.trim() !== item.name) void onUpdate({ name: editName.trim() || item.name })
  }

  function savePrice() {
    setEditingPrice(false)
    const parsed = parseInt(editPrice.replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed !== item.price) void onUpdate({ price: parsed })
    else setEditPrice(String(item.price))
  }

  async function handleToggle() {
    setToggling(true)
    try { await onToggleAvailability() } finally { setToggling(false) }
  }

  return (
    <div className="flex items-center gap-2 px-6 py-1.5 border-t border-[#0f0f0f]">
      {/* Name */}
      {editingName ? (
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && saveName()}
          className="flex-1 bg-white/5 border border-rokka-cyan/30 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="flex-1 text-left text-xs text-white/60 hover:text-white transition-colors truncate"
        >
          {item.name}
        </button>
      )}

      {/* Price */}
      {editingPrice ? (
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => e.key === 'Enter' && savePrice()}
          className="w-20 bg-white/5 border border-rokka-cyan/30 rounded-md px-2 py-0.5 text-[11px] text-white focus:outline-none text-right"
        />
      ) : (
        <button
          onClick={() => setEditingPrice(true)}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors shrink-0"
        >
          {fmtPrice(item.price)}
        </button>
      )}

      {/* Availability toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`
          text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors disabled:opacity-40
          ${item.is_available
            ? 'bg-rokka-green/10 border-rokka-green/40 text-rokka-green'
            : 'bg-rokka-red/10  border-rokka-red/40  text-rokka-red'
          }
        `}
      >
        {item.is_available ? 'Activo' : 'Agotado'}
      </button>

      {/* Delete */}
      <button
        onClick={() => void onDelete()}
        className="text-white/20 hover:text-rokka-red/70 text-[10px] shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function PedidosSection({ barId }: { barId: string }) {
  const { tables }           = useRealtime()
  const { orders, isLoading } = useOrders(barId)
  const { waiters }           = useWaiters(barId)

  // Build table label map
  const tableLabelMap = new Map<string, string>(
    (tables?.tables ?? []).map((t) => [t.id, t.label]),
  )

  // New order audio notification
  const isFirstLoad        = useRef(true)
  const prevPendingCountRef = useRef(0)

  useEffect(() => {
    if (isLoading) return
    const count = orders.filter((o) => o.status === 'pending').length
    if (!isFirstLoad.current && count > prevPendingCountRef.current) playBeep()
    isFirstLoad.current        = false
    prevPendingCountRef.current = count
  }, [orders, isLoading])

  // Sort: pending first, then by created_at desc
  const sorted = [...orders].sort((a, b) => {
    const aP = a.status === 'pending' ? 0 : 1
    const bP = b.status === 'pending' ? 0 : 1
    if (aP !== bP) return aP - bP
    return b.created_at.localeCompare(a.created_at)
  })

  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  async function handleStatusChange(order: Order, newStatus: OrderStatus) {
    setStatusLoading(order.id)
    try { await updateOrderStatus(order.id, barId, newStatus) } catch { /* no-op */ }
    finally { setStatusLoading(null) }
  }

  async function handleAssignWaiter(order: Order, waiterId: string) {
    await updateOrderStatus(order.id, barId, order.status, waiterId)
  }

  if (isLoading) return <p className="text-center text-white/20 text-xs py-8">Cargando pedidos…</p>

  if (sorted.length === 0) {
    return <p className="text-center text-white/20 text-xs py-8">Sin pedidos</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        {sorted.length} pedidos
      </p>

      {sorted.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          tableLabel={tableLabelMap.get(order.table_id) ?? '?'}
          waiters={waiters}
          isLoading={statusLoading === order.id}
          onStatusChange={(s) => void handleStatusChange(order, s)}
          onAssignWaiter={(id) => void handleAssignWaiter(order, id)}
        />
      ))}
    </div>
  )
}

// ── OrderCard ─────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  tableLabel,
  waiters,
  isLoading,
  onStatusChange,
  onAssignWaiter,
}: {
  order: Order
  tableLabel: string
  waiters: { id: string; name: string; is_active: boolean }[]
  isLoading: boolean
  onStatusChange: (s: OrderStatus) => void
  onAssignWaiter: (id: string) => void
}) {
  const nextStatus = NEXT_STATUS[order.status]
  const isDone     = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div
      className={`
        bg-card border rounded-xl p-3 space-y-2.5
        ${order.status === 'pending' ? 'border-rokka-orange/40' : 'border-[#1e1e1e]'}
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">Mesa {tableLabel}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_CLS[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-rokka-cyan font-black text-sm">
            {fmtPrice(order.total)}
          </span>
          <span className="text-[10px] text-white/25">{fmtTime(order.created_at)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-0.5">
        {(order.items as { item_id: string; name: string; qty: number; price: number }[]).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-white/50">
            <span className="text-white/30 w-4 text-right shrink-0">{item.qty}×</span>
            <span className="flex-1 truncate">{item.name}</span>
            <span className="text-white/30 shrink-0">{fmtPrice(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-rokka-cyan/15 border border-rokka-cyan/40 text-rokka-cyan font-semibold hover:bg-rokka-cyan/25 transition-colors disabled:opacity-40"
            >
              → {STATUS_LABEL[nextStatus]}
            </button>
          )}

          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button
              onClick={() => onStatusChange('cancelled')}
              disabled={isLoading}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-rokka-red/30 text-rokka-red/70 hover:bg-rokka-red/10 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          )}

          {/* Waiter assignment */}
          {waiters.filter((w) => w.is_active).length > 0 && (
            <select
              value={order.waiter_id ?? ''}
              onChange={(e) => { if (e.target.value) onAssignWaiter(e.target.value) }}
              className="ml-auto text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white/50 focus:outline-none focus:border-rokka-cyan/30"
            >
              <option value="">Asignar mesero</option>
              {waiters
                .filter((w) => w.is_active)
                .map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
