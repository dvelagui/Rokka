'use client'

import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  useAdminNotifications,
  useQueueActions,
  getSupabaseBrowserClient,
  updateBarProfile,
  useRealtime,
} from '@rokka/supabase'
import { useAdminContext } from '../../providers/AdminProvider'
import NotificationsPanel from './NotificationsPanel'

export default function AdminHeader() {
  const { bar, refreshBar, isPaused, togglePause } = useAdminContext()
  const realtime = useRealtime()
  const notifs   = useAdminNotifications(bar?.id ?? null)
  const actions  = useQueueActions()

  const [showNotifs, setShowNotifs] = useState(false)
  const [uploading,  setUploading]  = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  const currentSong = realtime.queue.currentSong

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !bar) return

    // Validate type and size
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG o WebP.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo debe pesar menos de 2 MB.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${bar.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('bar-logos')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('bar-logos').getPublicUrl(path)
      await updateBarProfile(bar.id, { logoUrl: publicUrl })
      await refreshBar()
    } catch (err) {
      console.error('[AdminHeader] logo upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handlePauseToggle() {
    const next = !isPaused
    togglePause()
    realtime.broadcast.sendAdminAction({ action: 'pause_music', data: { paused: next } })
  }

  async function handleSkip() {
    if (!bar?.id || !currentSong) return
    try { await actions.skip(currentSong.id, bar.id) } catch { /* no-op */ }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[52px] bg-black border-b border-[#1a1a1a] flex items-center px-3 gap-2">

      {/* Logo / Emoji */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Subir logo del bar"
        className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-dashed border-white/20 hover:border-rokka-purple/60 transition-colors flex items-center justify-center"
      >
        {bar?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bar.logo_url} alt={bar.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg">{bar?.emoji ?? '🎵'}</span>
        )}
        {uploading && (
          <span className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] text-white">
            ···
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoUpload}
      />

      {/* Bar name */}
      <span className="hidden sm:block text-xs text-white/40 truncate max-w-[120px]">
        {bar?.name ?? ''}
      </span>

      <div className="flex-1" />

      {/* Controls */}
      <div className="flex items-center gap-1">

        {/* Pause / Play */}
        <CtrlBtn onClick={handlePauseToggle} title={isPaused ? 'Reanudar' : 'Pausar'}>
          {isPaused ? '▶' : '⏸'}
        </CtrlBtn>

        {/* Skip */}
        <CtrlBtn
          onClick={handleSkip}
          disabled={!currentSong || actions.isLoading}
          title="Saltar canción"
        >
          ⏭
        </CtrlBtn>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <CtrlBtn
            onClick={() => setShowNotifs((v) => !v)}
            title="Notificaciones"
            className={notifs.unreadCount > 0 ? 'bell-ring' : ''}
          >
            🔔
          </CtrlBtn>
          {notifs.unreadCount > 0 && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rokka-red text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {notifs.unreadCount > 99 ? '99+' : notifs.unreadCount}
            </span>
          )}
          <AnimatePresence>
            {showNotifs && (
              <NotificationsPanel
                notifications={notifs.notifications}
                onMarkAllRead={notifs.markAllRead}
                onDismiss={notifs.dismiss}
                onClose={() => setShowNotifs(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Brand */}
        <span className="text-rokka-cyan font-black text-sm tracking-tight ml-2 select-none">
          ROKKA
        </span>
      </div>
    </header>
  )
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  title,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-8 h-8 flex items-center justify-center rounded-lg text-base
        text-white/70 hover:text-white hover:bg-white/10
        disabled:opacity-30 transition-colors
        ${className}
      `}
    >
      {children}
    </button>
  )
}
