'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateTableSession, storeTableSession } from '@rokka/supabase'

// ── Next.js 15 requiere Suspense alrededor de useSearchParams ─────────────────

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JoinContent />
    </Suspense>
  )
}

// ── Contenido real ────────────────────────────────────────────────────────────

type Status = 'validating' | 'success' | 'error_invalid' | 'error_banned' | 'error_no_token'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('validating')
  const [label, setLabel] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error_no_token')
      return
    }

    validateTableSession(token)
      .then((data) => {
        if (!data) {
          setStatus('error_invalid')
          return
        }
        if (data.credits === undefined) {
          setStatus('error_banned')
          return
        }

        storeTableSession(token)
        setLabel(data.label)
        setStatus('success')

        setTimeout(() => router.replace('/'), 1200)
      })
      .catch(() => setStatus('error_invalid'))
  }, [searchParams, router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-5 max-w-xs w-full">

        {status === 'validating' && <LoadingSpinner />}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-rokka-cyan/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">🎵</span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-xl">{label}</p>
              <p className="text-white/40 text-sm">Sesión iniciada — redirigiendo...</p>
            </div>
            <div className="h-1 w-full bg-card rounded-full overflow-hidden">
              <div className="h-full bg-rokka-cyan rounded-full animate-[grow_1.2s_linear_forwards]" />
            </div>
          </>
        )}

        {status === 'error_no_token' && (
          <ErrorCard
            emoji="🔗"
            title="Enlace inválido"
            message="Este QR no contiene un token de sesión. Pide al mesero que te muestre el QR correcto."
          />
        )}

        {status === 'error_invalid' && (
          <ErrorCard
            emoji="❌"
            title="Sesión no encontrada"
            message="El QR expiró o no es válido. Pide al mesero que regenere el QR de tu mesa."
          />
        )}

        {status === 'error_banned' && (
          <ErrorCard
            emoji="🚫"
            title="Mesa bloqueada"
            message="Esta mesa ha sido bloqueada por el administrador del bar."
          />
        )}
      </div>
    </main>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-5">
        <div className="w-12 h-12 rounded-full border-2 border-rokka-cyan border-t-transparent animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Validando sesión...</p>
      </div>
    </main>
  )
}

function ErrorCard({
  emoji,
  title,
  message,
}: {
  emoji: string
  title: string
  message: string
}) {
  return (
    <div className="space-y-4">
      <div className="w-16 h-16 rounded-full bg-rokka-red/10 flex items-center justify-center mx-auto">
        <span className="text-3xl">{emoji}</span>
      </div>
      <div className="space-y-1">
        <p className="text-white font-bold">{title}</p>
        <p className="text-white/40 text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
