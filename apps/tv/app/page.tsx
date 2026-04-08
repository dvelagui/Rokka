'use client'

import { useRouter } from 'next/navigation'
import { useTV, clearTVSession } from '@rokka/supabase'

export default function TVHome() {
  const router = useRouter()
  const { barId, barSlug, loading } = useTV()

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-rokka-fire border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!barId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-7xl font-black">
              <span className="text-rokka-fire">ROKKA</span>
              <span className="text-white"> TV</span>
            </h1>
            <p className="text-white/30 text-lg mt-2">Pantalla no configurada</p>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="
              bg-rokka-fire text-white font-bold px-8 py-4 rounded-2xl text-lg
              hover:brightness-110 transition-all
            "
          >
            Configurar pantalla
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header TV */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <h1 className="text-4xl font-black">
          <span className="text-rokka-fire">ROKKA</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-rokka-green animate-pulse" />
          <span className="text-white/40 text-sm font-mono">{barSlug}</span>
        </div>
      </div>

      {/* Contenido principal — placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-8xl">🎵</span>
          <p className="text-white/40 text-xl">Display TV — En desarrollo</p>
          <p className="text-white/20 text-sm font-mono">{barId}</p>
        </div>
      </div>

      {/* Footer con botón de reset (dev) */}
      <div className="px-8 py-4 flex justify-end">
        <button
          onClick={() => {
            clearTVSession()
            router.replace('/setup')
          }}
          className="text-white/20 text-xs hover:text-white/40 transition-colors"
        >
          [dev] resetear sesión
        </button>
      </div>
    </main>
  )
}
