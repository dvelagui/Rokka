'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUpBar } from '@rokka/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', barName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signUpBar(form.email, form.password, form.barName)
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-10">

        <div className="text-center space-y-1">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-rokka-cyan">ROKKA</span>
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Registra tu bar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { name: 'barName', label: 'Nombre del bar', type: 'text', placeholder: 'Bar La Noche' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@mi-bar.com' },
            { name: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <label htmlFor={name} className="block text-sm text-white/60">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                required
                value={form[name as keyof typeof form]}
                onChange={handleChange}
                placeholder={placeholder}
                className="
                  w-full bg-card border border-border rounded-xl px-4 py-3
                  text-white placeholder:text-white/20
                  focus:outline-none focus:border-rokka-cyan
                  transition-colors
                "
              />
            </div>
          ))}

          {error && (
            <p role="alert" className="text-rokka-red text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              w-full bg-rokka-cyan text-black font-bold py-3.5 rounded-xl
              hover:brightness-110 active:scale-[0.98]
              transition-all disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <a
            href="/login"
            className="block text-center text-white/40 text-sm hover:text-white transition-colors"
          >
            Ya tengo cuenta
          </a>
        </form>
      </div>
    </main>
  )
}
