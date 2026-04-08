'use client'

import { useRouter } from 'next/navigation'
import { useTable } from '@rokka/supabase'

export default function ClientHome() {
  const router = useRouter()
  const { session, loading, error } = useTable()

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-rokka-cyan border-t-transparent animate-spin" />
      </main>
    )
  }

  // Sin sesión → invitar a escanear QR
  if (!session || error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black">
            <span className="text-rokka-cyan">ROKKA</span>
          </h1>
          <p className="text-white/40 text-sm">Plataforma musical interactiva</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3 max-w-xs w-full">
          <span className="text-4xl">📱</span>
          <p className="text-white font-semibold">Escanea el QR de tu mesa</p>
          <p className="text-white/40 text-xs leading-relaxed">
            Cada mesa tiene un código QR único. Escanéalo para conectarte y pedir canciones.
          </p>
        </div>

        {error === 'sesion_invalida' && (
          <p className="text-rokka-red text-xs text-center">
            Tu sesión anterior expiró. Escanea el QR nuevamente.
          </p>
        )}

        {/* Dev helper */}
        <button
          onClick={() => router.push('/join?token=tok-mesa-01')}
          className="text-white/20 text-xs hover:text-white/40 transition-colors underline"
        >
          [dev] conectar como Mesa 1
        </button>
      </main>
    )
  }

  // Con sesión → app principal
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-rokka-cyan">ROKKA</h1>
          <p className="text-white/40 text-xs">{session.label}</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
          <span className="text-rokka-gold text-xs font-bold">{session.credits}</span>
          <span className="text-white/40 text-xs">créditos</span>
        </div>
      </div>

      {/* Placeholder del contenido principal */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] gap-4 px-4">
        <div className="text-center space-y-2">
          <span className="text-4xl">🎵</span>
          <p className="text-white font-semibold">Cola de canciones</p>
          <p className="text-white/30 text-sm">En desarrollo</p>
        </div>
      </div>
    </main>
  )
}
