'use client'

import { useState, useEffect }  from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMenu, useCart }       from '@rokka/supabase'
import type { MenuItem }          from '@rokka/supabase'
import { useTableContext }         from '@/providers/TableProvider'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO')
}

// ── MenuSheet ─────────────────────────────────────────────────────────────────

interface MenuSheetProps {
  onClose: () => void
}

type SheetView = 'menu' | 'success'

export function MenuSheet({ onClose }: MenuSheetProps) {
  const { table }  = useTableContext()
  const menu       = useMenu(table?.barId ?? null)
  const cart       = useCart()

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [view, setView]                          = useState<SheetView>('menu')

  // Auto-select first category once loaded
  useEffect(() => {
    if (!activeCategoryId && menu.categories.length > 0) {
      setActiveCategoryId(menu.categories[0].id)
    }
  }, [menu.categories, activeCategoryId])

  // Auto-close 2 s after success
  useEffect(() => {
    if (view !== 'success') return
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [view, onClose])

  const activeCategory = menu.categories.find((c) => c.id === activeCategoryId) ?? null

  const handleCheckout = async () => {
    if (!table?.barId || !table?.token) return
    try {
      await cart.checkout(table.barId, table.token)
      setView('success')
    } catch {
      // error shown inline via cart.error
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{   opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/[0.88]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{   y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="w-full max-w-md flex flex-col bg-card rounded-t-[18px] overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {view === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3 px-6"
            >
              <span className="text-5xl">🎉</span>
              <p className="text-white font-extrabold text-base text-center">
                Pedido enviado
              </p>
              <p className="text-white/40 text-sm text-center">
                Tu mesero viene en camino
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-h-0 flex-1"
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-extrabold text-sm">🍽️ Menú del Bar</p>
                  {cart.itemCount > 0 && (
                    <span className="bg-rokka-purple text-white text-[10px] font-bold
                                     w-5 h-5 rounded-full flex items-center justify-center">
                      {cart.itemCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-white/30 hover:text-white/70 text-lg leading-none transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* ── Categories ── */}
              {menu.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="w-7 h-7 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar shrink-0 border-b border-border">
                    {menu.categories.map((cat) => {
                      const isActive = cat.id === activeCategoryId
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategoryId(cat.id)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                            ${isActive
                              ? 'bg-rokka-cyan text-black'
                              : 'bg-card2 text-white/50 border border-border'
                            }`}
                        >
                          <span>{cat.emoji}</span>
                          <span>{cat.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* ── Items list ── */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-4">
                    {activeCategory?.subcategories.map((sub) => (
                      <div key={sub.id}>
                        <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-2">
                          {sub.name}
                        </p>
                        <div className="space-y-2">
                          {sub.items.map((item) => (
                            <MenuItemRow
                              key={item.id}
                              item={item}
                              onAdd={() => cart.addItem(item)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {activeCategory && activeCategory.subcategories.length === 0 && (
                      <p className="text-white/25 text-xs text-center py-8">
                        Sin items en esta categoría
                      </p>
                    )}
                  </div>

                  {/* ── Cart footer ── */}
                  <AnimatePresence>
                    {cart.itemCount > 0 && (
                      <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0,  opacity: 1 }}
                        exit={{   y: 80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                        className="shrink-0 bg-card2 border-t border-border px-4 pt-3 pb-5 space-y-3"
                      >
                        {/* Summary */}
                        <div className="flex items-center justify-between">
                          <p className="text-white/50 text-xs">
                            {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-white font-bold text-sm">
                            {formatCOP(cart.total)}
                          </p>
                        </div>

                        {/* Per-item controls */}
                        <div className="space-y-2">
                          {cart.items.map(({ item, qty }) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <p className="flex-1 text-white text-xs line-clamp-1">{item.name}</p>
                              <p className="text-white/40 text-[10px] shrink-0">
                                {formatCOP(item.price * qty)}
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => cart.updateQty(item.id, qty - 1)}
                                  className="w-6 h-6 rounded-full bg-card border border-border
                                             text-white/60 text-sm flex items-center justify-center
                                             active:scale-90 transition-transform"
                                >
                                  −
                                </button>
                                <span className="text-white text-xs tabular-nums w-4 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => cart.updateQty(item.id, qty + 1)}
                                  className="w-6 h-6 rounded-full bg-card border border-border
                                             text-white/60 text-sm flex items-center justify-center
                                             active:scale-90 transition-transform"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Error */}
                        {cart.error && (
                          <p className="text-rokka-red text-[11px] text-center">{cart.error}</p>
                        )}

                        {/* CTA */}
                        <button
                          onClick={handleCheckout}
                          disabled={cart.isLoading}
                          className="w-full py-3 rounded-xl bg-rokka-cyan/15 border border-rokka-cyan/40
                                     text-rokka-cyan font-bold text-sm
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     active:scale-95 transition-transform
                                     flex items-center justify-center gap-2"
                        >
                          {cart.isLoading ? (
                            <span className="w-4 h-4 rounded-full border-2 border-rokka-cyan/40 border-t-rokka-cyan animate-spin" />
                          ) : (
                            `Pedir · ${formatCOP(cart.total)}`
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ── MenuItemRow ───────────────────────────────────────────────────────────────

function MenuItemRow({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-card2 border border-border rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold line-clamp-1">{item.name}</p>
        <p className="text-white/40 text-[10px]">{formatCOP(item.price)}</p>
      </div>
      {item.is_available ? (
        <button
          onClick={onAdd}
          className="w-[28px] h-[28px] shrink-0 rounded-full bg-rokka-cyan/15
                     border border-rokka-cyan/40 text-rokka-cyan font-bold text-base
                     flex items-center justify-center active:scale-90 transition-transform"
        >
          +
        </button>
      ) : (
        <span className="text-rokka-red text-[10px] shrink-0 font-medium">Agotado</span>
      )}
    </div>
  )
}
