import type { AuthSession } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '../client'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50)
}

/** Login del admin del bar. */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<AuthSession> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('No se pudo iniciar sesión')
  return data.session
}

/** Cerrar sesión del admin. */
export async function signOutAdmin(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/**
 * Registro de un nuevo bar.
 * Crea el usuario en Auth, luego llama al RPC para crear el bar
 * y vincularlo como owner.
 */
export async function signUpBar(
  email: string,
  password: string,
  barName: string,
): Promise<{ userId: string; barId: string }> {
  const supabase = getSupabaseBrowserClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('No se pudo crear el usuario')

  const { data: barId, error: rpcError } = await supabase.rpc('register_bar_admin', {
    p_user_id: authData.user.id,
    p_bar_name: barName,
    p_bar_slug: slugify(barName),
  })
  if (rpcError) throw new Error(rpcError.message)

  return { userId: authData.user.id, barId: barId as string }
}

/** Obtener sesión activa (puede ser null si no está logueado). */
export async function getAdminSession(): Promise<AuthSession | null> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}
