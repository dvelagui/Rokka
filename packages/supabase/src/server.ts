// Re-exporta createServerClient de @supabase/ssr para que cada app
// pueda crear su propio cliente de servidor con acceso a cookies.
// Uso típico en apps/*/lib/supabase-server.ts
export { createServerClient } from '@supabase/ssr'
export type { SupabaseClient } from '@supabase/supabase-js'
