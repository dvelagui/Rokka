'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useRealtime,
  useQueueActions,
  getSupabaseBrowserClient,
  vetarCancion,
  getGenres,
  addSongToGenre,
} from '@rokka/supabase'
import type { QueueItemWithVotes } from '@rokka/supabase'
import type { GenresRow } from '@rokka/shared'
import { useAdminContext } from '../../../providers/AdminProvider'
import GenreAssignModal from '../modals/GenreAssignModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEta(secs: number): string {
  if (secs <= 0) return '< 1m'
  const m = Math.ceil(secs / 60)
  return `~${m}m`
}

function songKey(item: { title: string; artist: string }): string {
  return `${item.title}:::${item.artist}`
}

// ── QueueTab ──────────────────────────────────────────────────────────────────

export default function QueueTab() {
  const { bar, barConfig, admin, isPaused, togglePause } = useAdminContext()
  const { queue: queueState, broadcast }                  = useRealtime()
  const actions = useQueueActions()

  const avgDuration = barConfig?.avg_song_duration ?? 210

  // ── Derived queue data ─────────────────────────────────────────────────────
  const currentSong  = queueState.currentSong
  const allQueued    = queueState.queue.filter((i) => i.status === 'queued')
  const locked       = allQueued
    .filter((i) => i.bid_amount > 0)
    .sort((a, b) => b.bid_amount - a.bid_amount)
  const freeFromRT   = allQueued
    .filter((i) => i.bid_amount === 0)
    .sort((a, b) => a.position - b.position)

  // Optimistic drag order for free items
  const [localFreeOrder, setLocalFreeOrder] = useState<QueueItemWithVotes[] | null>(null)
  const freeIds = freeFromRT.map((i) => i.id).join(',')
  useEffect(() => { setLocalFreeOrder(null) }, [freeIds])
  const freeItems = localFreeOrder ?? freeFromRT

  // ── Favorites (DB) ─────────────────────────────────────────────────────────
  const [favs, setFavs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!bar?.id) return
    const supabase = getSupabaseBrowserClient()
    void supabase
      .from('favorites')
      .select('title,artist')
      .eq('bar_id', bar.id)
      .then(({ data }) => {
        if (data) setFavs(new Set(data.map((f) => songKey(f))))
      })
  }, [bar?.id])

  const handleToggleFav = useCallback(async (item: QueueItemWithVotes) => {
    if (!bar?.id) return
    const key     = songKey(item)
    const supabase = getSupabaseBrowserClient()
    if (favs.has(key)) {
      await supabase
        .from('favorites')
        .delete()
        .eq('bar_id', bar.id)
        .eq('title', item.title)
        .eq('artist', item.artist)
      setFavs((prev) => { const n = new Set(prev); n.delete(key); return n })
    } else {
      await supabase.from('favorites').upsert({
        bar_id:           bar.id,
        title:            item.title,
        artist:           item.artist,
        youtube_video_id: item.youtube_video_id,
      })
      setFavs((prev) => new Set([...prev, key]))
    }
  }, [bar?.id, favs])

  // ── Genres ─────────────────────────────────────────────────────────────────
  const [genres,         setGenres]         = useState<GenresRow[]>([])
  const [genresReady,    setGenresReady]    = useState(false)
  const [songGenres,     setSongGenres]     = useState<Map<string, GenresRow>>(new Map())
  const [genrePickerFor, setGenrePickerFor] = useState<QueueItemWithVotes | null>(null)

  // Load genre assignments when queue changes
  useEffect(() => {
    if (!bar?.id || !allQueued.length) return
    const supabase = getSupabaseBrowserClient()
    const titles   = [...new Set(allQueued.map((i) => i.title))]
    void supabase
      .from('genre_songs')
      .select('title,artist,genres(*)')
      .in('title', titles)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, GenresRow>()
        data.forEach((gs) => {
          if (gs.genres) map.set(songKey(gs as { title: string; artist: string }), gs.genres as unknown as GenresRow)
        })
        setSongGenres(map)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeIds, bar?.id])

  async function openGenrePicker(item: QueueItemWithVotes) {
    setGenrePickerFor(item)
    if (!genresReady && bar?.id) {
      const list = await getGenres(bar.id)
      setGenres(list)
      setGenresReady(true)
    }
  }

  async function handleAssignGenre(genre: GenresRow) {
    if (!genrePickerFor) return
    const item = genrePickerFor
    await addSongToGenre(genre.id, {
      title:          item.title,
      artist:         item.artist,
      youtubeVideoId: item.youtube_video_id,
    })
    setSongGenres((prev) => new Map(prev).set(songKey(item), genre))
    setGenrePickerFor(null)
  }

  // ── Veto ───────────────────────────────────────────────────────────────────
  const handleVeto = useCallback(async (item: QueueItemWithVotes) => {
    if (!bar?.id) return
    try {
      await vetarCancion({
        queueId:   item.id,
        barId:     bar.id,
        title:     item.title,
        artist:    item.artist,
        blockedBy: admin?.email ?? 'admin',
      })
    } catch (err) {
      console.error('[QueueTab] veto failed:', err)
    }
  }, [bar?.id, admin?.email])

  // ── Remove (no veto) ───────────────────────────────────────────────────────
  const handleRemove = useCallback(async (item: QueueItemWithVotes) => {
    if (!bar?.id) return
    try { await actions.removeFromQueue(item.id, bar.id) } catch { /* no-op */ }
  }, [bar?.id, actions])

  // ── Pause / Skip ───────────────────────────────────────────────────────────
  function handlePauseToggle() {
    const next = !isPaused
    togglePause()
    broadcast.sendAdminAction({ action: 'pause_music', data: { paused: next } })
  }

  async function handleSkip() {
    if (!bar?.id || !currentSong) return
    try { await actions.skip(currentSong.id, bar.id) } catch { /* no-op */ }
  }

  async function handleNext() {
    if (!bar?.id) return
    try { await actions.nextSong(bar.id) } catch { /* no-op */ }
  }

  // ── DnD setup ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !bar?.id) return

    const oldIdx = freeItems.findIndex((i) => i.id === active.id)
    const newIdx = freeItems.findIndex((i) => i.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return

    const reordered = arrayMove(freeItems, oldIdx, newIdx)
    setLocalFreeOrder(reordered)

    const items = reordered.map((item, idx) => ({
      id:       item.id,
      position: locked.length + idx + 1,
    }))

    void actions.reorder(bar.id, items).catch(() => {
      // Revert optimistic on error
      setTimeout(() => setLocalFreeOrder(null), 1500)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePauseToggle}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
            border transition-colors
            ${isPaused
              ? 'border-rokka-cyan text-rokka-cyan hover:bg-rokka-cyan/10'
              : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'
            }
          `}
        >
          {isPaused ? '▶ Reanudar' : '⏸ Pausar'}
        </button>

        <button
          onClick={handleNext}
          disabled={actions.isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80 transition-colors disabled:opacity-30"
        >
          ⏭ Siguiente
        </button>
      </div>

      {/* Now Playing */}
      {currentSong ? (
        <NowPlayingCard
          song={currentSong}
          isPaused={isPaused}
          avgDuration={avgDuration}
          onSkip={handleSkip}
          skipLoading={actions.isLoading}
        />
      ) : (
        <div className="text-center py-8 text-white/20 text-sm">Cola vacía</div>
      )}

      {/* Locked section */}
      {locked.length > 0 && (
        <Section title="🔒 CON PUJA — BLOQUEADAS" accent="purple">
          {locked.map((item, idx) => (
            <QueueItemCard
              key={item.id}
              item={item}
              index={idx}
              displayPos={idx + 1}
              avgDuration={avgDuration}
              isFav={favs.has(songKey(item))}
              genre={songGenres.get(songKey(item))}
              isTop={idx === 0}
              isSecond={idx === 1}
              draggable={false}
              onToggleFav={() => handleToggleFav(item)}
              onGenreOpen={() => openGenrePicker(item)}
              onVeto={() => handleVeto(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </Section>
      )}

      {/* Free section */}
      {freeItems.length > 0 && (
        <Section title="⠿ SIN PUJA — ARRASTRABLES" accent="cyan">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={freeItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {freeItems.map((item, idx) => (
                <SortableQueueItem
                  key={item.id}
                  item={item}
                  displayPos={locked.length + idx + 1}
                  avgDuration={avgDuration}
                  isFav={favs.has(songKey(item))}
                  genre={songGenres.get(songKey(item))}
                  onToggleFav={() => handleToggleFav(item)}
                  onGenreOpen={() => openGenrePicker(item)}
                  onVeto={() => handleVeto(item)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Section>
      )}

      {!currentSong && locked.length === 0 && freeItems.length === 0 && (
        <div className="text-center py-16 text-white/20 text-sm">Cola vacía</div>
      )}

      <GenreAssignModal
        isOpen={genrePickerFor !== null}
        onClose={() => setGenrePickerFor(null)}
        genres={genres}
        songTitle={genrePickerFor?.title}
        onSelect={handleAssignGenre}
      />
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  accent,
  children,
}: {
  title: string
  accent: 'cyan' | 'purple'
  children: React.ReactNode
}) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${accent === 'cyan' ? 'text-rokka-cyan/70' : 'text-rokka-purple/70'}`}>
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

// ── Now Playing Card ──────────────────────────────────────────────────────────

function NowPlayingCard({
  song,
  isPaused,
  avgDuration,
  onSkip,
  skipLoading,
}: {
  song: QueueItemWithVotes
  isPaused: boolean
  avgDuration: number
  onSkip: () => void
  skipLoading: boolean
}) {
  return (
    <div className="bg-card border-l-[3px] border-l-rokka-cyan border border-[#1e1e1e] rounded-xl p-4 space-y-3">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-rokka-red' : 'bg-rokka-cyan animate-pulse'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isPaused ? 'text-rokka-red' : 'text-rokka-cyan'}`}>
            {isPaused ? 'Pausado' : 'Sonando Ahora'}
          </span>
        </div>
        <button
          onClick={onSkip}
          disabled={skipLoading}
          className="text-xs text-white/40 hover:text-white/80 transition-colors disabled:opacity-30"
        >
          Saltar ⏭
        </button>
      </div>

      {/* Song info */}
      <div>
        <p className="font-bold text-white text-base leading-tight">{song.title}</p>
        <p className="text-white/50 text-sm">{song.artist}</p>
        {song.table_label && (
          <p className="text-white/30 text-xs mt-0.5">Mesa {song.table_label}</p>
        )}
        {song.dedication && (
          <p className="text-white/40 text-xs mt-1 italic">"{song.dedication}"</p>
        )}
      </div>

      {/* Progress bar — CSS animation resets when song.id changes */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          key={`${song.id}-${isPaused ? 'paused' : 'playing'}`}
          style={{
            animationDuration: `${avgDuration}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
          className="h-full bg-rokka-cyan rounded-full playback-bar"
        />
      </div>
    </div>
  )
}

// ── Shared card props ─────────────────────────────────────────────────────────

interface CardProps {
  item: QueueItemWithVotes
  displayPos: number
  avgDuration: number
  isFav: boolean
  genre: GenresRow | undefined
  isTop?: boolean
  isSecond?: boolean
  draggable?: boolean
  onToggleFav: () => void
  onGenreOpen: () => void
  onVeto: () => void
  onRemove: () => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
  index?: number
}

// ── Non-sortable card (locked items) ─────────────────────────────────────────

function QueueItemCard({
  item, displayPos, avgDuration, isFav, genre, isTop, isSecond, draggable,
  onToggleFav, onGenreOpen, onVeto, onRemove,
  dragHandleProps, isDragging,
}: CardProps) {
  const eta = fmtEta((displayPos - 1) * avgDuration)

  const borderClass = isTop
    ? 'border-[#FF4500] fire-glow'
    : isSecond
      ? 'border-[#FF8C00]'
      : item.bid_amount > 0
        ? 'border-rokka-purple/40'
        : 'border-[#1e1e1e]'

  return (
    <div
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`
        bg-card border rounded-xl px-3 py-2.5 space-y-1.5
        ${borderClass}
        ${draggable !== false ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle / lock indicator */}
        {draggable !== false ? (
          <span
            {...(dragHandleProps ?? {})}
            className="text-white/30 text-base mt-0.5 select-none shrink-0 touch-none"
          >
            ⠿
          </span>
        ) : (
          <span className="text-white/30 text-sm mt-0.5 shrink-0">🔒</span>
        )}

        {/* Position */}
        <span className="text-white/30 text-xs mt-1 shrink-0 w-4 text-right">
          {displayPos}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isTop && <span className="text-base">🔥</span>}
            <span className="font-semibold text-white text-sm leading-tight truncate max-w-[160px]">
              {item.title}
            </span>
            {genre && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: genre.color + '33', color: genre.color }}
              >
                {genre.emoji} {genre.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-white/40 mt-0.5">
            <span>{item.artist}</span>
            {item.table_label && <span>· Mesa {item.table_label}</span>}
            {item.bid_amount > 0 && (
              <span className="text-rokka-purple font-semibold">
                💰 {item.bid_amount} cr
              </span>
            )}
            <span>{eta}</span>
          </div>
          {item.dedication && (
            <p className="text-[11px] text-white/30 italic mt-0.5 truncate">
              "{item.dedication}"
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 pl-8">
        <ActionBtn
          onClick={onToggleFav}
          title={isFav ? 'Quitar favorito' : 'Agregar favorito'}
          active={isFav}
          activeColor="text-rokka-gold"
        >
          {isFav ? '★' : '☆'}
        </ActionBtn>

        <ActionBtn onClick={onGenreOpen} title="Asignar género">
          🏷
        </ActionBtn>

        <ActionBtn onClick={onVeto} title="Vetar canción" hoverColor="hover:text-rokka-orange">
          🚫 Vetar
        </ActionBtn>

        <ActionBtn onClick={onRemove} title="Eliminar de la cola" hoverColor="hover:text-rokka-red">
          ✕
        </ActionBtn>
      </div>
    </div>
  )
}

// ── Sortable wrapper for free items ──────────────────────────────────────────

function SortableQueueItem(props: Omit<CardProps, 'isTop' | 'isSecond' | 'draggable' | 'dragHandleProps' | 'isDragging' | 'index'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <QueueItemCard
        {...props}
        draggable={true}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// ── Small action button ───────────────────────────────────────────────────────

function ActionBtn({
  children,
  onClick,
  title,
  active,
  activeColor,
  hoverColor = 'hover:text-white/80',
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  active?: boolean
  activeColor?: string
  hoverColor?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        text-xs px-2 py-1 rounded-md transition-colors
        ${active ? (activeColor ?? 'text-white') : 'text-white/40'}
        ${hoverColor} hover:bg-white/5
      `}
    >
      {children}
    </button>
  )
}
