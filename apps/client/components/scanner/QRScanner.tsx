'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { confirmRecharge, getTransactionByQrCode } from '@rokka/supabase'
import { useTableContext } from '@/providers/TableProvider'
import type { CreditTransaction } from '@rokka/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'scanning' | 'validating' | 'success'

interface QRScannerProps {
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QR_PATTERN = /^RC[A-Z0-9]{6}$/i

// ── Component ─────────────────────────────────────────────────────────────────

export function QRScanner({ onClose }: QRScannerProps) {
  const { table } = useTableContext()

  const [step, setStep]               = useState<Step>('scanning')
  const [error, setError]             = useState<string | null>(null)
  const [transaction, setTransaction] = useState<CreditTransaction | null>(null)
  const [newBalance, setNewBalance]   = useState<number | null>(null)
  const [confirming, setConfirming]   = useState(false)

  // html5-qrcode scanner ref
  const scannerRef    = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null)
  const scannerAreaId = 'rokka-qr-reader'

  // ── Start scanner ──────────────────────────────────────────────────────────

  useEffect(() => {
    let stopped = false

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode')

      let devices: { id: string }[] = []
      try {
        devices = await Html5Qrcode.getCameras()
      } catch {
        if (!stopped) setError('Tu dispositivo no tiene cámara disponible')
        return
      }

      if (!devices.length) {
        if (!stopped) setError('Tu dispositivo no tiene cámara disponible')
        return
      }

      const instance = new Html5Qrcode(scannerAreaId)
      scannerRef.current = instance

      try {
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          async (decodedText) => {
            const code = decodedText.trim().toUpperCase()
            if (!QR_PATTERN.test(code)) return
            if (stopped) return

            // Pause scanner while validating
            try { await instance.pause(true) } catch { /* ignore */ }

            await handleScanned(code)
          },
          () => { /* scan errors are normal — ignore */ },
        )
      } catch (err) {
        if (!stopped) {
          const msg = err instanceof Error ? err.message : ''
          if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
            setError('Necesitas dar permiso a la cámara para escanear')
          } else {
            setError('Tu dispositivo no tiene cámara disponible')
          }
        }
      }
    }

    startScanner()

    return () => {
      stopped = true
      const instance = scannerRef.current
      if (instance) {
        instance.stop().catch(() => {})
        scannerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handle scanned QR ──────────────────────────────────────────────────────

  async function handleScanned(qrCode: string) {
    setError(null)
    const tx = await getTransactionByQrCode(qrCode)
    if (!tx) {
      setError('QR inválido o ya utilizado. Intenta de nuevo.')
      // Resume scanner
      try { await scannerRef.current?.resume() } catch { /* ignore */ }
      return
    }
    // Validate that the transaction belongs to this table/bar
    if (table && (tx.table_id !== table.tableId || tx.bar_id !== table.barId)) {
      setError('Este QR no corresponde a esta mesa.')
      try { await scannerRef.current?.resume() } catch { /* ignore */ }
      return
    }
    setTransaction(tx)
    setStep('validating')
  }

  // ── Confirm recharge ───────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!transaction?.id || !transaction.qr_code) return
    setConfirming(true)
    setError(null)
    try {
      const balance = await confirmRecharge(transaction.id, transaction.qr_code)
      setNewBalance(balance)
      setStep('success')
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar recarga')
      // Go back to scanning
      setStep('scanning')
      setTransaction(null)
      try { await scannerRef.current?.resume() } catch { /* ignore */ }
    } finally {
      setConfirming(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-5 pb-4">
        <h2 className="text-white font-bold text-base">Escanear QR de Recarga</h2>
        <button
          onClick={onClose}
          className="text-white/60 text-xl leading-none w-9 h-9 flex items-center justify-center
                     rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Scanning ── */}
          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Scanner area */}
              <div className="relative" style={{ width: 230, height: 230 }}>
                {/* Corner border frame */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    border: '2px solid #00e5ff',
                    borderRadius: 16,
                    boxShadow: '0 0 20px rgba(0,229,255,0.15)',
                  }}
                />

                {/* Camera placeholder icon */}
                <div
                  className="absolute inset-0 flex items-center justify-center text-6xl select-none"
                  style={{ opacity: 0.12 }}
                >
                  📷
                </div>

                {/* Actual camera feed */}
                <div
                  id={scannerAreaId}
                  className="absolute inset-0 overflow-hidden rounded-2xl [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden"
                />

                {/* Scanline */}
                {!error && (
                  <div
                    className="absolute left-0 right-0 h-0.5 animate-scanline pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)' }}
                  />
                )}
              </div>

              {/* Hint text */}
              {!error && (
                <p className="text-muted text-xs text-center">
                  Apunta al QR del mesero
                </p>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rokka-red/10 border border-rokka-red/30 rounded-xl px-4 py-3 text-center max-w-xs"
                >
                  <p className="text-rokka-red text-sm">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Validating / Confirm ── */}
          {step === 'validating' && transaction && (
            <motion.div
              key="validating"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="flex flex-col items-center gap-6 w-full max-w-xs"
            >
              {/* Valid indicator */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-5xl">✅</span>
                <p className="text-rokka-cyan font-bold text-lg">¡QR Válido!</p>
              </div>

              {/* Transaction card */}
              <div className="w-full bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-white/50 text-xs">Código escaneado</span>
                  <span className="text-white font-mono text-sm font-semibold">
                    {transaction.qr_code}
                  </span>
                </div>
                <div className="px-4 py-5 flex flex-col items-center gap-1">
                  <span className="text-white/40 text-xs">Monto de recarga</span>
                  <span className="text-rokka-purple font-black text-4xl tabular-nums">
                    ${transaction.amount.toLocaleString('es-CO')}
                  </span>
                  <span className="text-white/30 text-xs">créditos</span>
                </div>
              </div>

              {/* Error (confirm failed) */}
              {error && (
                <p className="text-rokka-red text-xs text-center">{error}</p>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full py-4 rounded-2xl bg-rokka-cyan text-black font-bold text-base
                           active:scale-95 transition-transform disabled:opacity-60 disabled:scale-100"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Confirmando…
                  </span>
                ) : (
                  '✓ Confirmar Recarga'
                )}
              </button>

              {/* Cancel */}
              <button
                onClick={() => {
                  setStep('scanning')
                  setTransaction(null)
                  setError(null)
                  try { scannerRef.current?.resume() } catch { /* ignore */ }
                }}
                className="text-white/40 text-xs"
              >
                Cancelar
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="text-7xl">🎉</span>
              <p className="text-rokka-cyan font-black text-3xl tabular-nums">
                +${(transaction?.amount ?? newBalance ?? 0).toLocaleString('es-CO')}
              </p>
              <p className="text-white/60 text-sm">agregados a tu cuenta</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
