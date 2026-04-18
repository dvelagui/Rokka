'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { WarningToast, type ToastVariant } from '@/components/queue/WarningToast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string | null
  variant: ToastVariant
}

interface ToastContextValue {
  showWarning: (msg: string) => void
  showRefund:  (msg: string) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: null, variant: 'warning' })

  const showWarning = useCallback((msg: string) => {
    setToast({ message: msg, variant: 'warning' })
  }, [])

  const showRefund = useCallback((msg: string) => {
    setToast({ message: msg, variant: 'refund' })
  }, [])

  const dismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, message: null }))
  }, [])

  return (
    <ToastContext.Provider value={{ showWarning, showRefund }}>
      {children}
      <WarningToast
        message={toast.message}
        variant={toast.variant}
        onDismiss={dismiss}
      />
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
  return ctx
}
