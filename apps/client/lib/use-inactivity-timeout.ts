'use client'

import { useEffect, useRef, useCallback } from 'react'

/** Tiempo total de inactividad antes de cerrar sesión (30 min). */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000

/** Cuánto antes del timeout se muestra el aviso (60 s). */
export const INACTIVITY_WARNING_MS = 60 * 1_000

const ACTIVITY_EVENTS = ['touchstart', 'touchmove', 'click', 'keydown', 'scroll'] as const

interface UseInactivityTimeoutOptions {
  /** Solo activo cuando hay sesión válida. */
  enabled: boolean
  /** Llamada cuando se agota el tiempo — debe cerrar la sesión. */
  onTimeout: () => void
  /** Llamada INACTIVITY_WARNING_MS antes del timeout para mostrar el aviso. */
  onWarning: () => void
  /** Llamada cuando el usuario interactúa estando en estado de aviso. */
  onResume: () => void
}

/**
 * Detecta inactividad del usuario y dispara callbacks antes y después del timeout.
 * El temporizador se reinicia con cada evento de actividad del documento.
 */
export function useInactivityTimeout({
  enabled,
  onTimeout,
  onWarning,
  onResume,
}: UseInactivityTimeoutOptions) {
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inWarningRef    = useRef(false)

  // Refs estables para los callbacks (evitan re-registrar eventos en cada render)
  const onTimeoutRef = useRef(onTimeout)
  const onWarningRef = useRef(onWarning)
  const onResumeRef  = useRef(onResume)
  useEffect(() => { onTimeoutRef.current = onTimeout }, [onTimeout])
  useEffect(() => { onWarningRef.current = onWarning }, [onWarning])
  useEffect(() => { onResumeRef.current  = onResume  }, [onResume])

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    warningTimerRef.current = null
    timeoutTimerRef.current = null
  }, [])

  const startTimers = useCallback(() => {
    clearTimers()
    warningTimerRef.current = setTimeout(() => {
      inWarningRef.current = true
      onWarningRef.current()
      timeoutTimerRef.current = setTimeout(() => {
        inWarningRef.current = false
        onTimeoutRef.current()
      }, INACTIVITY_WARNING_MS)
    }, INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS)
  }, [clearTimers])

  const handleActivity = useCallback(() => {
    if (inWarningRef.current) {
      inWarningRef.current = false
      onResumeRef.current()
    }
    startTimers()
  }, [startTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    startTimers()
    const opts = { passive: true }
    ACTIVITY_EVENTS.forEach((e) => document.addEventListener(e, handleActivity, opts))

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, handleActivity))
    }
  }, [enabled, startTimers, handleActivity, clearTimers])
}
