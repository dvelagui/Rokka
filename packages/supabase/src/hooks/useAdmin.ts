'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '../client'

export interface AdminState {
  user: User | null
  barId: string | null
  barName: string | null
  loading: boolean
}

/**
 * Hook para el admin del bar.
 * Escucha cambios de sesión de Supabase Auth y carga el bar_id
 * del admin autenticado desde la tabla bar_admins.
 */
export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({
    user: null,
    barId: null,
    barName: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    async function loadBarAdmin(user: User): Promise<void> {
      const { data } = await supabase
        .from('bar_admins')
        .select('bar_id, bars(name)')
        .eq('user_id', user.id)
        .single()

      setState({
        user,
        barId: data?.bar_id ?? null,
        barName: (data?.bars as unknown as { name: string } | null)?.name ?? null,
        loading: false,
      })
    }

    // Carga inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        loadBarAdmin(user)
      } else {
        setState({ user: null, barId: null, barName: null, loading: false })
      }
    })

    // Suscripción a cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadBarAdmin(session.user)
      } else {
        setState({ user: null, barId: null, barName: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
