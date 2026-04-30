'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAdmin } from '@rokka/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signInAdmin(email, password)
      router.push('/')
      router.refresh()
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      setError(
        raw.toLowerCase().includes('invalid') || raw.toLowerCase().includes('credentials')
          ? 'Credenciales incorrectas'
          : raw || 'Error al iniciar sesión',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-10">

        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-rokka-purple">ROKKA</span>
            <span className="text-white"> ADMIN</span>
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Panel de administración
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm text-white/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mi-bar.com"
              className="
                w-full bg-card border border-border rounded-xl px-4 py-3
                text-white placeholder:text-white/20
                focus:outline-none focus:border-rokka-purple
                transition-colors
              "
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm text-white/60">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="
                w-full bg-card border border-border rounded-xl px-4 py-3
                text-white placeholder:text-white/20
                focus:outline-none focus:border-rokka-purple
                transition-colors
              "
            />
          </div>

          {error && (
            <p role="alert" className="text-rokka-red text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              w-full bg-rokka-purple text-white font-bold py-3.5 rounded-xl
              hover:brightness-110 active:scale-[0.98]
              transition-all disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-white/20 text-xs">¿Nuevo bar?</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <a
          href="/register"
          className="
            block text-center border border-border rounded-xl py-3.5
            text-white/60 text-sm hover:border-rokka-purple hover:text-white
            transition-colors
          "
        >
          Registrar mi bar
        </a>
      </div>
    </main>
  )
}
