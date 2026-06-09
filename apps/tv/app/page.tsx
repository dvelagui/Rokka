'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { clearTVSession, playNextSong, useAdRotation } from '@rokka/supabase'
import type { AdRow } from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import { TVProvider, useTVContext } from '../providers/TVProvider'
import { RealtimeProvider, useTVRealtime } from '../providers/RealtimeProvider'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { VideoHeaderOverlay } from '../components/VideoHeaderOverlay'
import { ChatOverlay } from '../components/ChatOverlay'
import { ReactionsOverlay } from '../components/ReactionsOverlay'

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

// ── Ad overlay ────────────────────────────────────────────────────────────────

function AdOverlay({ ad, countdown }: { ad: AdRow; countdown: number }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `${ad.color}e6` }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="text-center max-w-3xl px-16 space-y-5">
        <motion.div
          className="text-[8rem] leading-none"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {ad.emoji}
        </motion.div>
        <h2 className="text-6xl font-black text-white drop-shadow-2xl leading-tight">{ad.title}</h2>
        {ad.subtitle && (
          <p className="text-3xl text-white/85 font-semibold">{ad.subtitle}</p>
        )}
        {ad.company_name && (
          <p className="text-lg text-white/50 uppercase tracking-[0.25em]">{ad.company_name}</p>
        )}
        <div className="pt-3">
          <span className="font-mono text-white/60 text-lg bg-black/30 px-4 py-1.5 rounded-full">
            {countdown}s
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Queue list (sidebar) ──────────────────────────────────────────────────────

function QueueList({ queue }: { queue: QueueItemWithVotes[] }) {
  const upcoming = queue.filter((q) => q.status === 'queued').slice(0, 7)
  return (
    <div className="space-y-2">
      <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-3">
        Próximas canciones
      </p>
      {upcoming.length === 0 ? (
        <p className="text-white/20 text-sm italic">Cola vacía</p>
      ) : (
        <AnimatePresence mode="popLayout">
          {upcoming.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 pb-2 border-b border-white/[0.06] last:border-0"
            >
              <span className="text-white/20 font-mono text-sm w-5 shrink-0 pt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-snug truncate">{item.title}</p>
                <p className="text-white/45 text-xs truncate">{item.artist}</p>
                {item.table_label && (
                  <p className="text-white/25 text-xs mt-0.5">Mesa {item.table_label}</p>
                )}
              </div>
              {item.bid_amount > 0 && (
                <span className="text-rokka-gold text-xs font-bold shrink-0 pt-0.5">
                  💰 {item.bid_amount}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
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
  const { currentAd, isShowingAd, countdown } = useAdRotation(barId)

  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)

  const currentSong = queue.currentSong
  const allMessages = chat.messages
  const pinnedMessage =
    [...allMessages].reverse().find((m) => m.is_pinned && m.message_type === 'admin') ?? null

  // Toggle playback when admin sends pause_music action
  useEffect(() => {
    if (broadcast.latestAdminAction?.action === 'pause_music') {
      setIsPlaying((prev) => !prev)
    }
  }, [broadcast.latestAdminAction])

  // Advance to next song in DB when the video ends
  const handleVideoEnd = useCallback(async () => {
    if (!barId) return
    try {
      await playNextSong(barId)
    } catch {
      // Admin can advance manually from the panel
    }
  }, [barId])

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden select-none">

      {/* ── Start overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!started && <StartOverlay key="start" onStart={() => setStarted(true)} />}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-6 py-3 bg-card border-b border-border h-[52px] z-20">
        <span className="text-2xl font-black tracking-tight">
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

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!currentSong ? (
          <IdleScreen key="idle" barName={bar?.name ?? barSlug} />
        ) : (
          <motion.div
            key="display"
            className="flex-1 flex overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Left: video (with all overlays) + now-playing strip ────── */}
            <div className="flex flex-col overflow-hidden" style={{ width: '62%' }}>

              {/* Video container — all overlays are absolute children here */}
              <div className="relative w-full bg-black flex-shrink-0" style={{ aspectRatio: '16 / 9' }}>

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

                {/* Gradient top — ensures header overlay is always readable */}
                <div
                  className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/60 to-transparent z-10"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Gradient bottom — ensures chat overlay is always readable */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent z-10"
                  style={{ pointerEvents: 'none' }}
                />

                {/* ── Overlays (z-index > gradients) ──────────────────────── */}

                {/* 1. Header: bar logo + voting bar + ROKKA branding */}
                <VideoHeaderOverlay
                  bar={bar}
                  keepVotes={votes.keepVotes}
                  skipVotes={votes.skipVotes}
                />

                {/* 2. Chat bubbles at bottom-left of the video */}
                <ChatOverlay messages={allMessages} />

                {/* 3. Floating emoji reactions (absolute inset-0, overflow hidden) */}
                <ReactionsOverlay latestReaction={broadcast.latestReaction} />
              </div>

              {/* Now-playing strip below the video */}
              <div className="flex-1 flex flex-col justify-between px-6 py-4 bg-card overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSong.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.4 }}
                    className="min-w-0 space-y-1"
                  >
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                      Sonando ahora
                    </p>
                    <h2 className="text-white text-3xl font-black leading-tight line-clamp-1">
                      {currentSong.title}
                    </h2>
                    <p className="text-white/55 text-xl line-clamp-1">{currentSong.artist}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1">
                      {currentSong.table_label && (
                        <span className="text-white/30 text-sm">Mesa {currentSong.table_label}</span>
                      )}
                      {currentSong.bid_amount > 0 && (
                        <span className="text-rokka-gold text-sm font-bold">
                          💰 {currentSong.bid_amount} créditos
                        </span>
                      )}
                      {currentSong.dedication && (
                        <span className="text-white/45 text-sm italic line-clamp-1">
                          ❤️ &ldquo;{currentSong.dedication}&rdquo;
                        </span>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Textual vote summary (reinforces the in-video bar) */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-rokka-cyan font-bold">
                    👍 {votes.keepVotes} keep
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-rokka-purple font-bold">
                    ⏭ {votes.skipVotes} skip
                  </span>
                  {votes.thresholdReached && (
                    <span className="ml-2 text-xs text-rokka-red font-bold uppercase tracking-wide animate-pulse">
                      ⚡ Skip inminente
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: queue only (chat moved to video overlay) ──────────── */}
            <div className="flex-1 flex flex-col border-l border-border overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none]">
                <QueueList queue={queue.queue} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <footer className="shrink-0 flex items-center gap-3 px-6 py-2.5 bg-card border-t border-border h-[48px] z-20">
        {pinnedMessage ? (
          <>
            <span className="text-rokka-cyan text-sm shrink-0">📌</span>
            <p className="text-white/65 text-sm line-clamp-1 flex-1">{pinnedMessage.message}</p>
          </>
        ) : (
          <p className="text-white/20 text-sm flex-1">
            Escanea el QR de tu mesa para pedir canciones y chatear
          </p>
        )}
        <button
          onClick={() => { clearTVSession(); router.replace('/setup') }}
          className="text-white/10 text-xs hover:text-white/30 transition-colors shrink-0"
        >
          [dev] reset
        </button>
      </footer>

      {/* ── Ad overlay (fullscreen, encima de todo) ────────────────────── */}
      <AnimatePresence>
        {isShowingAd && currentAd && (
          <AdOverlay key="ad" ad={currentAd} countdown={countdown} />
        )}
      </AnimatePresence>
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
