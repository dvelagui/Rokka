import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Singleton del cliente Supabase para el browser.
 * Gestiona cookies automáticamente para que las sesiones
 * funcionen con SSR y el middleware de Next.js.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseBrowserClient debe llamarse sólo en el browser. ' +
        'Para Server Components usa createSupabaseServerClient desde apps/*/lib/supabase-server.ts',
    )
  }
  if (!_client) {
    _client = createSSRBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}
