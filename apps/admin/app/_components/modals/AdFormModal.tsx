'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createAd, updateAd, addLogEntry, getSupabaseBrowserClient } from '@rokka/supabase'
import type { AdRow } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_EMOJIS = ['📢', '🎵', '🍺', '🎉', '⭐', '🔥', '💫', '🎊', '🎸', '🍹', '💡', '🎤']
const PRESET_COLORS = [
  '#00E5FF', '#FF4B4B', '#7C4DFF', '#FF6B00', '#00BFA5',
  '#FFD600', '#E040FB', '#64DD17', '#FF80AB', '#00B0FF',
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ad: AdRow | null  // null = create mode
  barId: string
  onSave: (ad: AdRow) => void
  onClose: () => void
}

// ── AdFormModal ───────────────────────────────────────────────────────────────

export default function AdFormModal({ ad, barId, onSave, onClose }: Props) {
  const { admin } = useAdminContext()
  const isEdit = ad !== null

  const [emoji,    setEmoji]    = useState(ad?.emoji ?? '📢')
  const [title,    setTitle]    = useState(ad?.title ?? '')
  const [subtitle, setSubtitle] = useState(ad?.subtitle ?? '')
  const [color,    setColor]    = useState(ad?.color ?? '#00E5FF')
  const [duration, setDuration] = useState(ad?.duration_seconds ?? 8)
  const [isOwn,    setIsOwn]    = useState(ad?.is_own ?? true)
  const [company,  setCompany]  = useState(ad?.company_name ?? '')
  const [isActive, setIsActive] = useState(ad?.is_active ?? true)
  const [imageUrl, setImageUrl] = useState<string | null>(ad?.image_url ?? null)
  const [startDate, setStartDate] = useState(ad?.start_date ?? '')
  const [endDate,   setEndDate]   = useState(ad?.end_date ?? '')
  const [timeStart, setTimeStart] = useState(ad?.time_start?.slice(0, 5) ?? '')
  const [timeEnd,   setTimeEnd]   = useState(ad?.time_end?.slice(0, 5) ?? '')
  const [maxImpressions, setMaxImpressions] = useState(
    ad?.max_impressions != null ? String(ad.max_impressions) : '',
  )
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const imageFileRef = useRef<HTMLInputElement>(null)
  const newAdIdRef   = useRef(crypto.randomUUID())

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WebP o GIF.')
      if (imageFileRef.current) imageFileRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5 MB.')
      if (imageFileRef.current) imageFileRef.current.value = ''
      return
    }

    setUploadingImage(true)
    setError('')
    try {
      const supabase = getSupabaseBrowserClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const id   = ad?.id ?? newAdIdRef.current
      const path = `${barId}/${id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('ad-banners')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('ad-banners').getPublicUrl(path)
      setImageUrl(`${publicUrl}?v=${Date.now()}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploadingImage(false)
      if (imageFileRef.current) imageFileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }

    const startDateVal = startDate || null
    const endDateVal   = endDate || null
    const timeStartVal = timeStart || null
    const timeEndVal   = timeEnd || null
    const maxImpressionsVal = maxImpressions.trim() ? Number(maxImpressions) : null

    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await updateAd(ad.id, {
          emoji,
          title:            title.trim(),
          subtitle:         subtitle.trim() || undefined,
          color,
          duration_seconds: duration,
          is_own:           isOwn,
          company_name:     !isOwn ? (company.trim() || undefined) : undefined,
          is_active:        isActive,
          image_url:        imageUrl,
          start_date:       startDateVal,
          end_date:         endDateVal,
          time_start:       timeStartVal,
          time_end:         timeEndVal,
          max_impressions:  maxImpressionsVal,
        })
        const updated: AdRow = {
          ...ad,
          emoji,
          title:        title.trim(),
          subtitle:     subtitle.trim() || null,
          color,
          duration_seconds: duration,
          is_own:       isOwn,
          company_name: !isOwn ? (company.trim() || null) : null,
          is_active:    isActive,
          image_url:    imageUrl,
          start_date:   startDateVal,
          end_date:     endDateVal,
          time_start:   timeStartVal,
          time_end:     timeEndVal,
          max_impressions: maxImpressionsVal,
        }
        await addLogEntry(barId, admin?.email ?? 'admin', 'ad_updated', `Editó anuncio: ${title.trim()}`)
        onSave(updated)
      } else {
        const created = await createAd(barId, {
          emoji,
          title:           title.trim(),
          subtitle:        subtitle.trim() || undefined,
          color,
          durationSeconds: duration,
          isOwn,
          companyName:     !isOwn ? (company.trim() || undefined) : undefined,
          isActive,
          imageUrl:        imageUrl ?? undefined,
          startDate:       startDateVal,
          endDate:         endDateVal,
          timeStart:       timeStartVal,
          timeEnd:         timeEndVal,
          maxImpressions:  maxImpressionsVal,
        })
        await addLogEntry(barId, admin?.email ?? 'admin', 'ad_created', `Creó anuncio: ${title.trim()}`)
        onSave(created)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="ad-form-overlay"
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                {isEdit ? 'Editar anuncio' : 'Nuevo anuncio'}
              </p>
              <p className="text-white font-bold text-base mt-0.5">
                {isEdit ? ad.title : 'Crear anuncio'}
              </p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pb-6 space-y-4">
            {/* Emoji */}
            <div className="space-y-1.5">
              <label className={labelCls}>Emoji</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(-2))}
                  className="w-14 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-2 py-2 text-xl text-center focus:outline-none focus:border-rokka-cyan/50"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-8 h-8 rounded-lg text-base transition-colors ${
                        emoji === em
                          ? 'bg-rokka-cyan/20 border border-rokka-cyan/40'
                          : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-white/20'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className={labelCls}>Título *</label>
              <input
                type="text"
                value={title}
                maxLength={50}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Happy Hour 2x1"
                className={inputCls}
              />
              <p className="text-[10px] text-white/20 text-right">{title.length}/50</p>
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <label className={labelCls}>Subtítulo</label>
              <input
                type="text"
                value={subtitle}
                maxLength={80}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej: Todas las cervezas a mitad de precio"
                className={inputCls}
              />
              <p className="text-[10px] text-white/20 text-right">{subtitle.length}/80</p>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <label className={labelCls}>Color</label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border border-[#2a2a2a] cursor-pointer"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-black scale-110' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Banner image / GIF */}
            <div className="space-y-1.5">
              <label className={labelCls}>Banner publicitario (imagen o GIF)</label>
              <p className="text-[10px] text-white/30">
                Tamaño recomendado: 1200 × 675 px (16:9), máx. 5 MB. Se acepta JPG, PNG, WebP o GIF.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => imageFileRef.current?.click()}
                  disabled={uploadingImage}
                  className="relative w-24 h-[54px] rounded-lg overflow-hidden shrink-0 border border-dashed border-white/20 hover:border-rokka-cyan/60 transition-colors flex items-center justify-center bg-[#1a1a1a]"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white/30">Subir</span>
                  )}
                  {uploadingImage && (
                    <span className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] text-white">
                      ···
                    </span>
                  )}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="text-[10px] text-rokka-red/70 hover:text-rokka-red transition-colors"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
              <input
                ref={imageFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className={labelCls}>Duración de visualización</label>
                <span className="text-[10px] text-rokka-cyan font-bold">{duration}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-rokka-cyan"
              />
              <div className="flex justify-between text-[9px] text-white/20">
                <span>5s</span><span>30s</span>
              </div>
            </div>

            {/* is_own toggle */}
            <SettingRow
              label="Anuncio propio"
              sublabel="Desactiva para anuncios de terceros"
              right={<Toggle value={isOwn} onChange={setIsOwn} />}
            />

            {/* Company name */}
            {!isOwn && (
              <div className="space-y-1">
                <label className={labelCls}>Empresa anunciante</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className={inputCls}
                />
              </div>
            )}

            {/* Programación: rango de fechas */}
            <div className="space-y-1.5">
              <label className={labelCls}>Rango de fechas</label>
              <p className="text-[10px] text-white/30">
                Deja en blanco para que no tenga fecha de inicio/fin.
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Programación: rango horario */}
            <div className="space-y-1.5">
              <label className={labelCls}>Rango horario</label>
              <p className="text-[10px] text-white/30">
                Solo se mostrará entre estas horas cada día. Deja en blanco para todo el día.
              </p>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Límite de impresiones */}
            <div className="space-y-1">
              <label className={labelCls}>Límite de veces a mostrar</label>
              <input
                type="number"
                min={1}
                value={maxImpressions}
                onChange={(e) => setMaxImpressions(e.target.value)}
                placeholder="Sin límite"
                className={inputCls}
              />
              {isEdit && (
                <p className="text-[10px] text-white/30">
                  Mostrado {ad.impressions_count} {ad.impressions_count === 1 ? 'vez' : 'veces'} hasta ahora.
                </p>
              )}
            </div>

            {/* Active toggle */}
            <SettingRow
              label="Activo"
              sublabel="Mostrar este anuncio en rotación"
              right={<Toggle value={isActive} onChange={setIsActive} />}
            />

            {error && (
              <p className="text-xs text-rokka-red bg-rokka-red/10 border border-rokka-red/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-rokka-cyan text-black font-bold text-sm disabled:opacity-40 hover:bg-rokka-cyan/80 transition-opacity"
              >
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear anuncio'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const labelCls = 'text-[10px] font-semibold uppercase tracking-wider text-white/40'
const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-rokka-green' : 'bg-[#2a2a2a]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

function SettingRow({ label, sublabel, right }: { label: string; sublabel?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div>
        <p className="text-xs text-white/70 font-semibold">{label}</p>
        {sublabel && <p className="text-[10px] text-white/30">{sublabel}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}
