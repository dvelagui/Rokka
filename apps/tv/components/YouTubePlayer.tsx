'use client'

import { useEffect, useRef } from 'react'

// ── YouTube IFrame API types ───────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (idOrEl: string | HTMLElement, opts: YTOptions) => YTPlayer
      PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTOptions {
  videoId?: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (e: { target: YTPlayer }) => void
    onStateChange?: (e: { data: number; target: YTPlayer }) => void
    onError?: (e: { data: number }) => void
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  setVolume: (vol: number) => void
  mute: () => void
  unMute: () => void
  destroy: () => void
  getPlayerState: () => number
}

// ── Singleton API loader ──────────────────────────────────────────────────────
// The IFrame API script must be loaded once globally; callbacks are queued
// until `onYouTubeIframeAPIReady` fires.

let _apiReady = false
const _waitQueue: Array<() => void> = []

function loadAPI() {
  if (typeof window === 'undefined') return
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return
  const s = document.createElement('script')
  s.src = 'https://www.youtube.com/iframe_api'
  s.async = true
  document.head.appendChild(s)
  window.onYouTubeIframeAPIReady = () => {
    _apiReady = true
    _waitQueue.splice(0).forEach((cb) => cb())
  }
}

function whenReady(cb: () => void) {
  if (_apiReady && window.YT?.Player) {
    cb()
    return
  }
  _waitQueue.push(cb)
  loadAPI()
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface YouTubePlayerProps {
  videoId: string | null
  /** Controls playback; defaults to true. Changes call playVideo/pauseVideo. */
  isPlaying?: boolean
  /** Called when the video ends — use to advance the queue */
  onVideoEnd?: () => void
  /** Called on playback error (e.g. video unavailable or geo-blocked) */
  onError?: (errorCode: number) => void
  /** Called when playback transitions to PLAYING state (buffering done) */
  onPlaying?: () => void
}

export function YouTubePlayer({
  videoId,
  isPlaying = true,
  onVideoEnd,
  onError,
  onPlaying,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)

  // Refs so effects always see the latest values without re-running
  const pendingVideoRef = useRef<string | null>(videoId)
  const isPlayingRef = useRef(isPlaying)
  const onVideoEndRef = useRef(onVideoEnd)
  const onErrorRef = useRef(onError)
  const onPlayingRef = useRef(onPlaying)

  isPlayingRef.current = isPlaying
  onVideoEndRef.current = onVideoEnd
  onErrorRef.current = onError
  onPlayingRef.current = onPlaying

  // Load a new video when videoId changes
  useEffect(() => {
    pendingVideoRef.current = videoId
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId)
    }
  }, [videoId])

  // Control play/pause when isPlaying changes
  useEffect(() => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isPlaying])

  // Initialize YT.Player once on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    whenReady(() => {
      if (playerRef.current) return // guard against double-init in StrictMode

      playerRef.current = new window.YT.Player(el, {
        videoId: pendingVideoRef.current ?? '',
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          fs: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(100)
            if (pendingVideoRef.current) {
              e.target.loadVideoById(pendingVideoRef.current)
            }
            if (!isPlayingRef.current) {
              e.target.pauseVideo()
            }
          },
          onStateChange: (e) => {
            if (e.data === 0) onVideoEndRef.current?.() // 0 = ENDED
            if (e.data === 1) onPlayingRef.current?.()  // 1 = PLAYING
          },
          onError: (e) => {
            onErrorRef.current?.(e.data)
          },
        },
      })
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Player fills its container via absolute positioning (container must be relative).
  // [&>iframe] targets the <iframe> that YT.Player inserts here, forcing it to
  // fill the container and display as block (avoids inline-element sizing issues).
  return (
    <div className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:block">
      {/* YT.Player replaces this element with an <iframe> */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
