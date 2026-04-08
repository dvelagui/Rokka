'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateTV, storeTVSession } from '@rokka/supabase'

export default function TVSetupPage() {
  const router = useRouter()
  const [barSlug, setBarSlug] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pin.length !== 6) {
      setError('El PIN debe tener 6 dígitos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const barId = await authenticateTV(barSlug.trim().toLowerCase(), pin)
      storeTVSession(barId, barSlug.trim().toLowerCase())
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-10">

        <div className="text-center space-y-1">
          <h1 className="text-6xl font-black tracking-tight">
            <span className="text-rokka-fire">ROKKA</span>
            <span className="text-white"> TV</span>
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Configuración de pantalla
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="slug" className="block text-sm text-white/60">
              Slug del bar
            </label>
            <input
              id="slug"
              type="text"
              required
              value={barSlug}
              onChange={(e) => setBarSlug(e.target.value)}
              placeholder="la-noche"
              autoCapitalize="none"
              className="
                w-full bg-card border border-border rounded-xl px-4 py-3
                text-white placeholder:text-white/20 font-mono
                focus:outline-none focus:border-rokka-fire
                transition-colors
              "
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pin" className="block text-sm text-white/60">
              PIN de 6 dígitos
            </label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="
                w-full bg-card border border-border rounded-xl px-4 py-3
                text-white placeholder:text-white/20 font-mono text-2xl tracking-[0.5em] text-center
                focus:outline-none focus:border-rokka-fire
                transition-colors
              "
            />
          </div>

          {error && (
            <p role="alert" className="text-rokka-red text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="
              w-full bg-rokka-fire text-white font-bold py-4 rounded-xl text-lg
              hover:brightness-110 active:scale-[0.98]
              transition-all disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Conectando...' : 'Activar pantalla'}
          </button>
        </form>

        {/* Dev helper */}
        <button
          onClick={() => {
            setBarSlug('la-noche')
            setPin('123456')
          }}
          className="w-full text-white/20 text-xs hover:text-white/40 transition-colors underline"
        >
          [dev] rellenar con datos de ejemplo
        </button>
      </div>
    </main>
  )
}
