'use client'

import { useState } from 'react'
import { updateBarConfig, updateBarProfile, addLogEntry } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── ConfigTab ─────────────────────────────────────────────────────────────────

export default function ConfigTab() {
  const { bar, barConfig, admin, refreshBar } = useAdminContext()

  // ── Profile state ─────────────────────────────────────────────────────────
  const [barName,       setBarName]       = useState(bar?.name      ?? '')
  const [barEmoji,      setBarEmoji]      = useState(bar?.emoji     ?? '')
  const [logoUrl,       setLogoUrl]       = useState(bar?.logo_url  ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileOk,     setProfileOk]     = useState(false)

  // ── Config state ─────────────────────────────────────────────────────────
  const [avgSong,      setAvgSong]      = useState(barConfig?.avg_song_duration      ?? 180)
  const [maxTables,    setMaxTables]    = useState(barConfig?.max_tables             ?? 15)
  const [minBid,       setMinBid]       = useState(barConfig?.min_bid               ?? 5)
  const [profFilter,   setProfFilter]   = useState(barConfig?.profanity_filter       ?? false)
  const [allowDed,     setAllowDed]     = useState(barConfig?.allow_dedications      ?? true)
  const [skipThresh,   setSkipThresh]   = useState(barConfig?.auto_skip_threshold    ?? 50)
  const [tvPin,        setTvPin]        = useState(bar?.tv_pin ?? barConfig?.tv_pin  ?? '000000')
  const [closingTime,  setClosingTime]  = useState(barConfig?.closing_time           ?? '')
  const [maxSongs,     setMaxSongs]     = useState(barConfig?.max_canciones_por_mesa ?? 3)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configOk,     setConfigOk]     = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function saveProfile() {
    if (!bar?.id) return
    setSavingProfile(true)
    setProfileOk(false)
    try {
      await updateBarProfile(bar.id, {
        name:    barName.trim()  || undefined,
        emoji:   barEmoji        || undefined,
        logoUrl: logoUrl.trim()  || undefined,
      })
      await addLogEntry(bar.id, admin?.email ?? 'admin', 'config_updated', 'Actualizó perfil del bar')
      await refreshBar()
      setProfileOk(true)
      setTimeout(() => setProfileOk(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveConfig() {
    if (!bar?.id) return
    setSavingConfig(true)
    setConfigOk(false)
    try {
      await updateBarConfig(bar.id, {
        avg_song_duration:      avgSong,
        max_tables:             maxTables,
        min_bid:                minBid,
        profanity_filter:       profFilter,
        allow_dedications:      allowDed,
        auto_skip_threshold:    skipThresh,
        tv_pin:                 tvPin,
        closing_time:           closingTime || undefined,
        max_canciones_por_mesa: maxSongs,
      })
      await addLogEntry(bar.id, admin?.email ?? 'admin', 'config_updated', 'Actualizó configuración del bar')
      await refreshBar()
      setConfigOk(true)
      setTimeout(() => setConfigOk(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingConfig(false)
    }
  }

  function regeneratePin() {
    setTvPin(Math.floor(100000 + Math.random() * 900000).toString())
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Perfil ─────────────────────────────────────────────────────── */}
      <SectionCard title="Perfil del bar">
        {/* Logo preview */}
        {logoUrl && (
          <div className="flex justify-center mb-1">
            <img
              src={logoUrl}
              alt="Logo"
              className="w-20 h-20 rounded-2xl object-cover border border-[#2a2a2a]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        <Field label="URL del logo">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <label className={labelCls}>Nombre</label>
            <input
              type="text"
              value={barName}
              onChange={(e) => setBarName(e.target.value)}
              placeholder="Nombre del bar"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Emoji</label>
            <input
              type="text"
              value={barEmoji}
              onChange={(e) => setBarEmoji(e.target.value.slice(-2))}
              placeholder="🍺"
              className={inputCls + ' text-center text-xl'}
            />
          </div>
        </div>

        {bar?.slug && (
          <div className="space-y-1">
            <label className={labelCls}>Slug (URL pública)</label>
            <div className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white/30 font-mono select-all">
              {bar.slug}
            </div>
          </div>
        )}

        <SaveButton saving={savingProfile} ok={profileOk} onClick={saveProfile} label="Guardar perfil" />
      </SectionCard>

      {/* ── Configuración de la sala ─────────────────────────────────── */}
      <SectionCard title="Configuración de la sala">
        {/* avg_song_duration */}
        <Field label="Duración promedio de canción" hint={`${Math.round(avgSong / 60)} min`}>
          <input
            type="range"
            min={60}
            max={600}
            step={30}
            value={avgSong}
            onChange={(e) => setAvgSong(Number(e.target.value))}
            className="w-full accent-rokka-cyan"
          />
          <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
            <span>1 min</span><span>10 min</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Máx. mesas">
            <input
              type="number"
              value={maxTables}
              min={1}
              max={100}
              onChange={(e) => setMaxTables(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Puja mínima">
            <input
              type="number"
              value={minBid}
              min={0}
              onChange={(e) => setMinBid(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Canc. por mesa">
            <input
              type="number"
              value={maxSongs}
              min={1}
              max={20}
              onChange={(e) => setMaxSongs(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Hora de cierre">
            <input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className={inputCls + ' [color-scheme:dark]'}
            />
          </Field>
        </div>

        <div className="space-y-2 border-t border-[#1e1e1e] pt-3">
          <SettingRow
            label="Filtro de groserías"
            sublabel="Bloquea palabras ofensivas en canciones"
            right={<Toggle value={profFilter} onChange={setProfFilter} />}
          />
          <SettingRow
            label="Permitir dedicatorias"
            sublabel="Los clientes pueden dedicar canciones"
            right={<Toggle value={allowDed} onChange={setAllowDed} />}
          />
        </div>

        <Field label="Umbral auto-skip" hint={`${skipThresh}%`}>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={skipThresh}
            onChange={(e) => setSkipThresh(Number(e.target.value))}
            className="w-full accent-rokka-cyan"
          />
          <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
            <span>10%</span><span>90%</span>
          </div>
        </Field>

        <Field label="PIN de TV (6 dígitos)">
          <div className="flex gap-2">
            <input
              type="text"
              value={tvPin}
              maxLength={6}
              inputMode="numeric"
              onChange={(e) => setTvPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={inputCls + ' font-mono tracking-[0.3em] flex-1'}
            />
            <button
              type="button"
              onClick={regeneratePin}
              className="px-3 rounded-xl border border-[#2a2a2a] text-white/50 hover:text-white/80 hover:border-white/30 transition-colors text-xs whitespace-nowrap"
            >
              Regenerar
            </button>
          </div>
        </Field>

        <SaveButton saving={savingConfig} ok={configOk} onClick={saveConfig} label="Guardar configuración" />
      </SectionCard>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-[#1e1e1e] rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className={labelCls}>{label}</label>
        {hint && <span className="text-[10px] text-rokka-cyan font-bold">{hint}</span>}
      </div>
      {children}
    </div>
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

function SaveButton({
  saving, ok, onClick, label,
}: { saving: boolean; ok: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
        ok ? 'bg-rokka-green text-black' : 'bg-rokka-cyan text-black hover:bg-rokka-cyan/80'
      }`}
    >
      {saving ? 'Guardando…' : ok ? '✓ Guardado' : label}
    </button>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const labelCls = 'text-[10px] font-semibold uppercase tracking-wider text-white/40'
const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50'
