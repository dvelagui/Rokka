'use client'

import { useState, useEffect } from 'react'
import { getAds, deleteAd, toggleAdActive, updateBarConfig, addLogEntry } from '@rokka/supabase'
import type { AdRow } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'
import AdFormModal from '../modals/AdFormModal'

// ── AdsTab ────────────────────────────────────────────────────────────────────

export default function AdsTab() {
  const { bar, barConfig, admin, refreshBar } = useAdminContext()
  const [ads,             setAds]             = useState<AdRow[]>([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [thirdParty,      setThirdParty]      = useState(barConfig?.third_party_ads ?? false)
  const [togglingId,      setTogglingId]      = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [formTarget,      setFormTarget]      = useState<AdRow | 'create' | null>(null)

  useEffect(() => {
    if (!bar?.id) return
    setIsLoading(true)
    getAds(bar.id, false)
      .then(setAds)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [bar?.id])

  useEffect(() => {
    setThirdParty(barConfig?.third_party_ads ?? false)
  }, [barConfig?.third_party_ads])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleThirdPartyToggle() {
    if (!bar?.id) return
    const next = !thirdParty
    setThirdParty(next)
    try {
      await updateBarConfig(bar.id, { third_party_ads: next })
      await addLogEntry(bar.id, admin?.email ?? 'admin', 'config_updated', `Anuncios de terceros: ${next ? 'activado' : 'desactivado'}`)
      await refreshBar()
    } catch {
      setThirdParty(!next)
    }
  }

  async function handleToggleActive(ad: AdRow) {
    setTogglingId(ad.id)
    try {
      const newVal = await toggleAdActive(ad.id)
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, is_active: newVal } : a))
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(adId: string) {
    if (confirmDeleteId !== adId) { setConfirmDeleteId(adId); return }
    try {
      await deleteAd(adId)
      await addLogEntry(bar?.id ?? '', admin?.email ?? 'admin', 'ad_deleted', 'Eliminó anuncio')
      setAds((prev) => prev.filter((a) => a.id !== adId))
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  function handleAdSaved(saved: AdRow) {
    setAds((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [...prev, saved]
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Third-party ads card */}
      <div className="bg-card border border-[#1e1e1e] rounded-xl p-4 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">💸 Anuncios de Terceros</p>
            <p className="text-[11px] text-white/40 mt-0.5">Genera ingresos mostrando publicidad externa</p>
            <p className={`text-[10px] font-bold mt-2 ${thirdParty ? 'text-rokka-green' : 'text-white/30'}`}>
              {thirdParty ? '✅ ACTIVO — mostrando en App y TV' : '❌ Desactivado'}
            </p>
          </div>
          <Toggle value={thirdParty} onChange={handleThirdPartyToggle} />
        </div>
      </div>

      {/* Bar ads header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/30">Anuncios del Bar</p>
        <button
          onClick={() => setFormTarget('create')}
          className="text-xs px-3 py-1.5 rounded-lg bg-rokka-cyan/15 border border-rokka-cyan/40 text-rokka-cyan font-semibold hover:bg-rokka-cyan/25 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-white/20 text-xs py-8">Cargando anuncios…</p>
      ) : ads.length === 0 ? (
        <p className="text-center text-white/20 text-xs py-8">
          Sin anuncios. Crea uno para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              isToggling={togglingId === ad.id}
              confirmDelete={confirmDeleteId === ad.id}
              onEdit={() => { setConfirmDeleteId(null); setFormTarget(ad) }}
              onToggleActive={() => handleToggleActive(ad)}
              onDelete={() => handleDelete(ad.id)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {formTarget !== null && (
        <AdFormModal
          ad={formTarget === 'create' ? null : formTarget}
          barId={bar?.id ?? ''}
          onSave={handleAdSaved}
          onClose={() => setFormTarget(null)}
        />
      )}
    </>
  )
}

// ── AdCard ────────────────────────────────────────────────────────────────────

function AdCard({
  ad,
  isToggling,
  confirmDelete,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  ad: AdRow
  isToggling: boolean
  confirmDelete: boolean
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="bg-card border border-[#1e1e1e] rounded-xl p-3 space-y-2"
      style={{ borderLeftColor: ad.color, borderLeftWidth: '3px' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none shrink-0">{ad.emoji}</span>
            <span className="font-bold text-white text-[13px] truncate">{ad.title}</span>
          </div>
          {ad.subtitle && (
            <p className="text-[10px] text-white/35 mt-0.5 ml-6 truncate">{ad.subtitle}</p>
          )}
          {ad.company_name && (
            <p className="text-[10px] text-white/25 mt-0.5 ml-6">🏢 {ad.company_name}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              ad.is_active
                ? 'bg-rokka-green/10 border-rokka-green/30 text-rokka-green'
                : 'bg-white/5 border-white/15 text-white/30'
            }`}
          >
            {ad.is_active ? 'Activo' : 'Off'}
          </span>
          <span className="text-[9px] text-white/25">{ad.duration_seconds}s</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onEdit}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-[#2a2a2a] text-white/50 hover:text-white/80 hover:border-white/30 transition-colors"
        >
          ✏️ Editar
        </button>

        <button
          onClick={onToggleActive}
          disabled={isToggling}
          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
            ad.is_active
              ? 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/60'
              : 'border-rokka-green/30 text-rokka-green/70 hover:bg-rokka-green/10'
          }`}
        >
          {isToggling ? '…' : ad.is_active ? 'Desactivar' : 'Activar'}
        </button>

        <button
          onClick={onDelete}
          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
            confirmDelete
              ? 'border-rokka-red bg-rokka-red/10 text-rokka-red'
              : 'border-[#2a2a2a] text-white/30 hover:text-rokka-red/70 hover:border-rokka-red/30'
          }`}
        >
          {confirmDelete ? '¿Confirmar?' : '🗑'}
        </button>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-rokka-green' : 'bg-[#2a2a2a]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
