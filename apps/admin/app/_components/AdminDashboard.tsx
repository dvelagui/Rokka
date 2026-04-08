'use client'

import { useRouter } from 'next/navigation'
import { signOutAdmin } from '@rokka/supabase'

// Supabase devuelve el join como array incluso en relaciones many-to-one
// cuando no hay tipos generados. Normalizamos en el componente.
interface BarRow {
  id: string
  name: string
  slug: string
  tv_pin: string | null
}

interface BarAdmin {
  bar_id: string
  role: string
  bars: BarRow | BarRow[] | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseUser = { id: string; email?: string; [key: string]: any }

interface Props {
  user: SupabaseUser
  barAdmin: BarAdmin | null
}

export default function AdminDashboard({ user, barAdmin }: Props) {
  const router = useRouter()
  // Normalizar: Supabase puede devolver bars como array o como objeto
  const barsRaw = barAdmin?.bars
  const bar: BarRow | null = Array.isArray(barsRaw) ? (barsRaw[0] ?? null) : (barsRaw ?? null)

  async function handleSignOut() {
    await signOutAdmin()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">
              <span className="text-rokka-purple">ROKKA</span>
              <span className="text-white"> ADMIN</span>
            </h1>
            {bar && (
              <p className="text-white/40 text-sm mt-0.5">{bar.name}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="
              border border-border rounded-lg px-4 py-2 text-sm text-white/60
              hover:border-rokka-red hover:text-rokka-red transition-colors
            "
          >
            Cerrar sesión
          </button>
        </div>

        {/* Cards de acceso rápido */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Cola',       color: 'text-rokka-cyan',   desc: 'Gestionar canciones' },
            { label: 'Mesas',      color: 'text-rokka-purple', desc: 'Ver y conectar mesas' },
            { label: 'Pedidos',    color: 'text-rokka-orange', desc: 'Pedidos en tiempo real' },
            { label: 'Menú',       color: 'text-rokka-green',  desc: 'Editar carta' },
            { label: 'Stats',      color: 'text-rokka-gold',   desc: 'KPIs del día' },
            { label: 'Config',     color: 'text-rokka-fire',   desc: 'Ajustes del bar' },
          ].map(({ label, color, desc }) => (
            <div
              key={label}
              className="
                bg-card border border-border rounded-xl p-5 space-y-1
                hover:border-white/20 transition-colors cursor-pointer
              "
            >
              <p className={`text-xl font-bold ${color}`}>{label}</p>
              <p className="text-white/40 text-xs">{desc}</p>
            </div>
          ))}
        </div>

        {/* Info de sesión (dev helper) */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Sesión activa</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <span className="text-white/40 w-20 shrink-0">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
            {bar && (
              <>
                <div className="flex gap-3">
                  <span className="text-white/40 w-20 shrink-0">Bar</span>
                  <span className="text-white">{bar.name}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-white/40 w-20 shrink-0">Slug</span>
                  <span className="text-white/60 font-mono text-xs">{bar.slug}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-white/40 w-20 shrink-0">PIN TV</span>
                  <span className="text-white font-mono">
                    {bar.tv_pin ?? <span className="text-white/30">no configurado</span>}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-white/40 w-20 shrink-0">Rol</span>
                  <span className="text-rokka-cyan text-xs uppercase">{barAdmin?.role}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
