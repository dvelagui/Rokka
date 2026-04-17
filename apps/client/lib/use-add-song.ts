'use client'

import { useState, useCallback } from 'react'
import { useQueueActions, useRealtime } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'

export interface SongToAdd {
  title:          string
  artist:         string
  youtubeVideoId?: string
  thumbnailUrl?:  string
}

export interface UseAddSongReturn {
  /** Song pending dedication confirmation, or null if no modal open */
  pending:        SongToAdd | null
  /** Validation warning to display, or null */
  warning:        string | null
  /** True while the queue RPC is in-flight */
  isAdding:       boolean
  /** Start the add flow — validates first, then opens the modal */
  initAdd:        (song: SongToAdd) => void
  /** Called from modal with optional dedication text */
  confirmAdd:     (dedication?: string) => Promise<void>
  /** Cancel / close modal */
  cancelAdd:      () => void
  /** Dismiss the warning toast */
  dismissWarning: () => void
  /** True if song (by videoId or title) is already in queue */
  isInQueue:      (title: string, videoId?: string) => boolean
}

export function useAddSong(): UseAddSongReturn {
  const { table, bar, isBanned } = useTableContext()
  const { queue }                = useRealtime()
  const { addSong, isLoading }   = useQueueActions()

  const [pending, setPending]   = useState<SongToAdd | null>(null)
  const [warning, setWarning]   = useState<string | null>(null)

  const maxSongs    = bar?.config.max_canciones_por_mesa ?? 4
  const myQueueCount = queue.queue.filter(
    (item) => item.table_id === table?.tableId && item.status === 'queued',
  ).length

  const isInQueue = useCallback(
    (title: string, videoId?: string): boolean =>
      queue.queue.some((item) => {
        if (videoId && item.youtube_video_id) return item.youtube_video_id === videoId
        return item.title.toLowerCase().trim() === title.toLowerCase().trim()
      }),
    [queue.queue],
  )

  const initAdd = useCallback(
    (song: SongToAdd) => {
      if (isBanned) {
        setWarning('⛔ Mesa baneada. No puedes agregar canciones.')
        return
      }
      if (myQueueCount >= maxSongs) {
        setWarning(`⚠️ Ya tienes ${maxSongs} canciones en cola.`)
        return
      }
      if (isInQueue(song.title, song.youtubeVideoId)) {
        setWarning(`⚠️ "${song.title}" ya está en la lista. No se repite.`)
        return
      }
      setPending(song)
    },
    [isBanned, myQueueCount, maxSongs, isInQueue],
  )

  const confirmAdd = useCallback(
    async (dedication?: string) => {
      if (!pending || !table) return
      try {
        await addSong({
          barId:          table.barId,
          tableId:        table.tableId,
          title:          pending.title,
          artist:         pending.artist,
          youtubeVideoId: pending.youtubeVideoId,
          thumbnailUrl:   pending.thumbnailUrl,
          dedication:     dedication?.trim() || undefined,
        })
        setPending(null)
      } catch (e) {
        setWarning(`Error al agregar: ${e instanceof Error ? e.message : 'Intenta de nuevo'}`)
      }
    },
    [pending, table, addSong],
  )

  const cancelAdd      = useCallback(() => setPending(null), [])
  const dismissWarning = useCallback(() => setWarning(null), [])

  return {
    pending,
    warning,
    isAdding:       isLoading,
    initAdd,
    confirmAdd,
    cancelAdd,
    dismissWarning,
    isInQueue,
  }
}
