'use client'

import { useEffect, useState } from 'react'
import {
  validateTableSession,
  getStoredTableSession,
  clearTableSession,
  type TableSessionData,
} from '../auth/table'

export interface TableState {
  session: (TableSessionData & { token: string }) | null
  loading: boolean
  error: string | null
}

/**
 * Hook para la app de mesas.
 * Lee el token del localStorage y lo valida contra la base de datos.
 * Si el token es inválido lo limpia automáticamente.
 */
export function useTable(): TableState {
  const [state, setState] = useState<TableState>({
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const stored = getStoredTableSession()

    if (!stored?.token) {
      setState({ session: null, loading: false, error: null })
      return
    }

    validateTableSession(stored.token)
      .then((data) => {
        if (data) {
          setState({ session: { ...data, token: stored.token }, loading: false, error: null })
        } else {
          // Token inválido o mesa baneada — limpiar
          clearTableSession()
          setState({ session: null, loading: false, error: 'sesion_invalida' })
        }
      })
      .catch(() => {
        setState({ session: null, loading: false, error: 'error_conexion' })
      })
  }, [])

  return state
}
