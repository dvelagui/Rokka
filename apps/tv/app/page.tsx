'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { clearTVSession, playNextSong } from '@rokka/supabase'
import type { ChatMessage } from '@rokka/supabase'
import { TVProvider, useTVContext } from '../providers/TVProvider'
import { RealtimeProvider, useTVRealtime } from '../providers/RealtimeProvider'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { VideoHeaderOverlay } from '../components/VideoHeaderOverlay'
import { ReactionsOverlay } from '../components/ReactionsOverlay'
import { BottomBar } from '../components/BottomBar'
import { QueueColumn } from '../components/QueueColumn'
import { AdBanner } from '../components/AdBanner'

// ── Burn-in prevention ────────────────────────────────────────────────────────
// Shifts static elements 1–2 px every 5 minutes. Imperceptible from 2+ meters
// but sufficient to prevent permanent image retention on OLED panels.

function useBurnInShift() {
  const [t, setT] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const id = setInterval(
      () =>
        setT({
          x: Math.round((Math.random() - 0.5) * 4),
          y: Math.round((Math.random() - 0.5) * 4),
        }),
      5 * 60_000,
    )
    return () => clearInterval(id)
  }, [])
  return `translate(${t.x}px, ${t.y}px)`
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState('--:--')
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-white/40 text-xl">{time}</span>
}

// ── Connection indicator ──────────────────────────────────────────────────────

type ConnStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected'

function ConnectionDot({ status }: { status: ConnStatus }) {
  const cls: Record<ConnStatus, string> = {
    connected: 'bg-rokka-green animate-pulse',
    connecting: 'bg-rokka-gold animate-pulse',
    reconnecting: 'bg-rokka-gold animate-pulse',
    disconnected: 'bg-rokka-red',
  }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls[status]}`} />
}

// ── Chat panel (sidebar) ──────────────────────────────────────────────────────

function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Bubble background classes — written out fully so Tailwind's scanner picks them up
const BUBBLE_CLASSES = [
  'bg-rokka-cyan/10',
  'bg-rokka-purple/10',
  'bg-rokka-fire/10',
  'bg-rokka-gold/10',
  'bg-rokka-green/10',
  'bg-rokka-orange/10',
] as const

function bubbleClass(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return BUBBLE_CLASSES[Math.abs(hash) % BUBBLE_CLASSES.length]
}

function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  const visible = messages.slice(-20)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visible.length])

  return (
    <div className="h-full flex flex-col justify-end overflow-hidden pointer-events-none">
      <div className="flex flex-col justify-end gap-2 [scrollbar-width:none] overflow-hidden">
        {visible.length > 0 && (
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                {msg.message_type === 'reaction' ? (
                  <span className="block text-right text-3xl leading-none drop-shadow-lg">
                    {msg.message}
                  </span>
                ) : (
                  <div
                    className={`ml-auto max-w-full rounded-2xl px-3 py-1.5 shadow-lg backdrop-blur-sm ${
                      msg.message_type === 'admin' ? 'bg-rokka-cyan/10' : bubbleClass(msg.table_id ?? msg.id)
                    }`}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wide leading-none mb-0.5 text-white/80"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                    >
                      {msg.message_type === 'admin' ? '🎛 DJ' : 'Mesa'} · {formatChatTime(msg.created_at)}
                    </p>
                    <p
                      className="text-white text-sm font-semibold leading-snug break-words"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    >
                      {msg.message}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Idle screen ───────────────────────────────────────────────────────────────

function IdleScreen({ barName }: { barName: string }) {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h1
        className="font-black leading-none"
        style={{ fontSize: 'min(15vw, 13rem)' }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-rokka-fire">ROK</span>
        <span className="text-white">KA</span>
      </motion.h1>
      {barName && (
        <p className="text-white/30 text-3xl font-semibold tracking-wide">{barName}</p>
      )}
      <div className="mt-4 text-center space-y-2">
        <p className="text-white/20 text-xl">Escanea el QR de tu mesa</p>
        <p className="text-white/15 text-lg">y pide tu canción</p>
      </div>
    </motion.div>
  )
}

// ── Start overlay (browser autoplay unlock) ───────────────────────────────────

function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black cursor-pointer"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={onStart}
    >
      <div className="text-center space-y-6 select-none">
        <h1 className="font-black leading-none" style={{ fontSize: 'min(16vw, 14rem)' }}>
          <span className="text-rokka-fire">ROK</span>
          <span className="text-white">KA</span>
        </h1>
        <motion.p
          className="text-white/40 text-2xl tracking-[0.3em] uppercase"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Toca para iniciar
        </motion.p>
      </div>
    </motion.div>
  )
}

// ── Main TV display ───────────────────────────────────────────────────────────

function TVDisplay() {
  const router = useRouter()
  const { barId, barSlug, bar } = useTVContext()
  const { queue, chat, votes, connectionStatus, broadcast } = useTVRealtime()

  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [videoLoading, setVideoLoading] = useState(false)
  const [cursorHidden, setCursorHidden] = useState(false)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const burnIn = useBurnInShift()

  // Hide cursor after 3 seconds of mouse inactivity
  useEffect(() => {
    const show = () => {
      setCursorHidden(false)
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
      cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 3_000)
    }
    window.addEventListener('mousemove', show)
    window.addEventListener('mousedown', show)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('mousedown', show)
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    }
  }, [])

  // Request fullscreen + unlock autoplay on first tap
  const handleStart = useCallback(() => {
    setStarted(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const currentSong = queue.currentSong
  const allMessages = chat.messages
  const pinnedMessage =
    [...allMessages].reverse().find((m) => m.is_pinned && m.message_type === 'admin') ?? null

  const upcomingQueue = queue.queue.filter((q) => q.status === 'queued')
  const topHasBid = (upcomingQueue[0]?.bid_amount ?? 0) > 0

  // Toggle playback when admin sends pause_music action
  useEffect(() => {
    if (broadcast.latestAdminAction?.action === 'pause_music') {
      setIsPlaying((prev) => !prev)
    }
  }, [broadcast.latestAdminAction])

  // Show loading spinner whenever the current song changes (clears on onPlaying)
  useEffect(() => {
    if (!started || !currentSong?.id) {
      setVideoLoading(false)
      return
    }
    setVideoLoading(true)
  }, [started, currentSong?.id])

  // Arrancar la cola si no hay ninguna canción en estado 'playing' aún
  // (p.ej. primera canción pedida tras configurar la TV: nunca hubo un
  // video que "termine" para disparar play_next_song)
  useEffect(() => {
    if (!started || !barId || currentSong || queue.isLoading) return
    if (upcomingQueue.length === 0) return
    void playNextSong(barId)
  }, [started, barId, currentSong, queue.isLoading, upcomingQueue.length])

  // Advance to next song in DB when the video ends
  const handleVideoEnd = useCallback(async () => {
    if (!barId) return
    try {
      await playNextSong(barId)
    } catch {
      // Admin can advance manually from the panel
    }
  }, [barId])

  // Auto-skip when YouTube reports a video error (unavailable, geo-blocked, etc.)
  const handleVideoError = useCallback(
    async (errorCode: number) => {
      console.warn(`[TV] YouTube error ${errorCode} for "${currentSong?.title}" — skipping`)
      if (!barId) return
      try {
        await playNextSong(barId)
      } catch {
        // Admin can advance manually from the panel
      }
    },
    [barId, currentSong?.title],
  )

  // Clear loading spinner the moment YouTube starts playing
  const handleVideoPlaying = useCallback(() => {
    setVideoLoading(false)
  }, [])

  const handleReset = useCallback(() => {
    clearTVSession()
    router.replace('/setup')
  }, [router])

  return (
    <div
      className="w-screen h-screen bg-background flex flex-col overflow-hidden select-none"
      style={{ cursor: cursorHidden ? 'none' : 'default' }}
    >

      {/* ── Start overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!started && <StartOverlay key="start" onStart={handleStart} />}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-6 py-3 bg-card border-b border-border h-[52px] z-20">
        <span
          className="text-2xl font-black tracking-tight"
          style={{ transform: burnIn, transition: 'transform 2s ease-in-out', display: 'inline-block' }}
        >
          <span className="text-rokka-fire">ROKKA</span>
        </span>
        {bar?.name && (
          <>
            <span className="text-white/20 text-lg">·</span>
            <span className="text-white/55 font-semibold text-lg leading-none">{bar.name}</span>
          </>
        )}
        {!isPlaying && (
          <span className="ml-2 text-xs font-bold text-rokka-gold uppercase tracking-widest bg-rokka-gold/10 px-2 py-0.5 rounded">
            ⏸ Pausado
          </span>
        )}
        <div className="flex-1" />
        <ConnectionDot status={connectionStatus as ConnStatus} />
        <span className="text-white/25 text-sm font-mono hidden lg:block">{barSlug}</span>
        <Clock />
      </header>

      {/* ── Reconnection banner — shown only when realtime drops ─────────── */}
      <AnimatePresence>
        {(connectionStatus === 'reconnecting' || connectionStatus === 'disconnected') && (
          <motion.div
            key="reconnect-banner"
            className="shrink-0 flex items-center justify-center gap-2 z-30"
            style={{
              background:
                connectionStatus === 'disconnected'
                  ? 'rgba(255,69,0,0.12)'
                  : 'rgba(255,180,0,0.10)',
              borderBottom:
                connectionStatus === 'disconnected'
                  ? '1px solid rgba(255,69,0,0.28)'
                  : '1px solid rgba(255,180,0,0.18)',
              padding: 'clamp(5px, 0.7vh, 9px) clamp(12px, 1.5vw, 20px)',
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="animate-spin shrink-0"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '2px solid rgba(255,180,0,0.18)',
                borderTopColor: connectionStatus === 'disconnected' ? '#ff4500' : '#ffb400',
              }}
            />
            <span
              style={{
                fontSize: 'clamp(11px, 1.2vw, 15px)',
                color:
                  connectionStatus === 'disconnected'
                    ? 'rgba(255,100,50,0.9)'
                    : 'rgba(255,200,50,0.9)',
                fontWeight: 600,
                letterSpacing: '0.4px',
              }}
            >
              {connectionStatus === 'disconnected'
                ? 'Sin conexión — reintentando…'
                : 'Reconectando…'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!currentSong ? (
          <IdleScreen key="idle" barName={bar?.name ?? barSlug} />
        ) : (
          <motion.div
            key="display"
            className="flex-1 relative w-full bg-black overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Video (with all overlays), filling the entire screen ─────── */}

            {/* YouTube player (or music note placeholder) */}
            <AnimatePresence mode="wait">
              {started && currentSong.youtube_video_id ? (
                <motion.div
                  key={`player-${currentSong.id}`}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <YouTubePlayer
                    videoId={currentSong.youtube_video_id}
                    isPlaying={isPlaying}
                    onVideoEnd={handleVideoEnd}
                    onError={handleVideoError}
                    onPlaying={handleVideoPlaying}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="no-video"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span style={{ fontSize: 'clamp(60px, 10vw, 120px)' }}>🎵</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading spinner — visible while YouTube buffers after a song change */}
            <AnimatePresence>
              {videoLoading && currentSong.youtube_video_id && (
                <motion.div
                  key="vid-loading"
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  style={{ zIndex: 11 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.4 }}
                >
                  <div
                    className="animate-spin"
                    style={{
                      width: 'clamp(32px, 3.5vw, 50px)',
                      height: 'clamp(32px, 3.5vw, 50px)',
                      borderRadius: '50%',
                      border: '3px solid rgba(0,229,255,0.15)',
                      borderTopColor: '#00e5ff',
                      marginBottom: 'clamp(10px, 1.2vh, 16px)',
                    }}
                  />
                  <p
                    style={{
                      fontSize: 'clamp(11px, 1.3vw, 17px)',
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 600,
                      maxWidth: '55%',
                      textAlign: 'center' as const,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                      textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                    }}
                  >
                    {currentSong.title}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gradient top — ensures header overlay is always readable */}
            <div
              className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/60 to-transparent z-10"
              style={{ pointerEvents: 'none' }}
            />

            {/* Gradient bottom — ensures bottom bar is always readable */}
            <div
              className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent z-10"
              style={{ pointerEvents: 'none' }}
            />

            {/* ── Overlays (z-index > gradients) ──────────────────────── */}

            {/* 1. Header: bar logo + voting bar + ROKKA branding */}
            <VideoHeaderOverlay bar={bar} keepVotes={votes.keepVotes} skipVotes={votes.skipVotes} />

            {/* 2. Floating emoji reactions (absolute inset-0, overflow hidden) */}
            <ReactionsOverlay latestReaction={broadcast.latestReaction} />

            {/* 3. Right column overlay — chat (40%) + queue (60%) ────────── */}
            <div
              className="absolute z-20 flex flex-col gap-2"
              style={{
                right: 'clamp(10px, 1.2vw, 20px)',
                top: 'clamp(60px, 8vh, 90px)',
                bottom: 'clamp(10px, 1.2vh, 20px)',
                width: 'clamp(220px, 20vw, 360px)',
              }}
            >
              <div style={{ height: '40%' }} className="overflow-hidden">
                <ChatPanel messages={allMessages} />
              </div>
              <div style={{ height: '60%' }} className="overflow-hidden">
                <QueueColumn queue={queue.queue} />
              </div>
            </div>

            {/* 4. Left column overlay — anuncio rotativo ────────────────── */}
            <div
              className="absolute z-20"
              style={{
                left: 'clamp(10px, 1.2vw, 20px)',
                top: 'clamp(60px, 8vh, 90px)',
                width: 'clamp(220px, 20vw, 360px)',
              }}
            >
              <AdBanner barId={barId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom bar: pinned message + progress ───────────────────────── */}
      <BottomBar
        currentSong={currentSong}
        queue={queue.queue}
        pinnedMessage={pinnedMessage}
        isPlaying={isPlaying}
        onReset={handleReset}
      />

      {/* ── Fire viewport border — inset box-shadow via CSS @keyframes ──────
            Uses the spec's inset trick: box-shadow: inset 0 0 0 4px #FF4500
            so no extra DOM element needed for the border edge.           ── */}
      <AnimatePresence>
        {topHasBid && (
          <motion.div
            key="fire-border"
            className="fixed inset-0 pointer-events-none"
            style={{ animation: 'borderfire 1.2s ease-in-out infinite alternate', zIndex: 40 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* ── Fullscreen toggle — barely visible, bottom-right corner ─────── */}
      <button
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.()
          } else {
            document.exitFullscreen?.()
          }
        }}
        className="fixed pointer-events-auto"
        style={{
          right: 'clamp(10px, 1.2vw, 18px)',
          bottom: 'clamp(10px, 1.2vh, 18px)',
          fontSize: 'clamp(12px, 1.4vw, 18px)',
          color: 'rgba(255,255,255,0.10)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
          zIndex: 50,
        }}
        title="Pantalla completa"
      >
        ⛶
      </button>
    </div>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function TVPage() {
  return (
    <TVProvider>
      <RealtimeProvider>
        <TVDisplay />
      </RealtimeProvider>
    </TVProvider>
  )
}
