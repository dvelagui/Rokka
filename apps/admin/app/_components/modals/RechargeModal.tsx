'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { initiateRecharge, confirmRecharge, addLogEntry } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 'success'

interface Props {
  tableId: string
  tableLabel: string
  onClose: () => void
}

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000]

function fmtCurrency(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── RechargeModal ─────────────────────────────────────────────────────────────

export default function RechargeModal({ tableId, tableLabel, onClose }: Props) {
  const { bar, admin } = useAdminContext()

  const [step,          setStep]          = useState<Step>(1)
  const [amount,        setAmount]        = useState<number | null>(null)
  const [customAmount,  setCustomAmount]  = useState('')
  const [amountError,   setAmountError]   = useState('')
  const [generating,    setGenerating]    = useState(false)
  const [qrCode,        setQrCode]        = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [confirming,    setConfirming]    = useState(false)
  const [confirmedAt,   setConfirmedAt]   = useState('')
  const [newCredits,    setNewCredits]    = useState(0)

  // Auto-close after success
  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(onClose, 1800)
      return () => clearTimeout(t)
    }
  }, [step, onClose])

  // ── Step 1 helpers ──────────────────────────────────────────────────────────

  function resolveAmount(): number | null {
    if (amount !== null) return amount
    const parsed = parseInt(customAmount.replace(/\D/g, ''), 10)
    if (isNaN(parsed) || parsed < 1_000) return null
    if (parsed % 1_000 !== 0) return null
    return parsed
  }

  async function handleGenerate() {
    const a = resolveAmount()
    if (!a) {
      setAmountError('Ingresa un monto válido (mín. $1.000, múltiplo de $1.000)')
      return
    }
    if (!bar?.id) return
    setAmountError('')
    setGenerating(true)
    try {
      const result = await initiateRecharge(bar.id, tableId, a)
      setQrCode(result.qrCode)
      setTransactionId(result.transactionId)
      setStep(2)
    } catch (err) {
      setAmountError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Step 3 confirmation ─────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!bar?.id || confirming) return
    setConfirming(true)
    try {
      const credits = await confirmRecharge(transactionId, qrCode)
      setNewCredits(credits)
      setConfirmedAt(new Date().toISOString())
      await addLogEntry(
        bar.id,
        admin?.email ?? 'admin',
        'recharge_confirmed',
        `Recargó ${fmtCurrency(resolveAmount() ?? 0)} a ${tableLabel}. Código: ${qrCode}`,
      )
      setStep('success')
    } catch (err) {
      console.error('[RechargeModal] confirm failed:', err)
    } finally {
      setConfirming(false)
    }
  }

  const selectedAmount = resolveAmount()

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        key="recharge-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Recargar créditos
              </p>
              <p className="text-white font-bold text-base mt-0.5">{tableLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white text-xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          {step !== 'success' && (
            <div className="flex items-center gap-1.5 px-5 pb-4">
              {([1, 2, 3] as const).map((s, idx) => (
                <div key={s} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                      ${step === s
                        ? 'bg-rokka-cyan text-black'
                        : (step === 2 && s === 1) || (step === 3 && s <= 2)
                          ? 'bg-rokka-cyan/30 text-rokka-cyan'
                          : 'bg-white/10 text-white/30'
                      }
                    `}
                  >
                    {s}
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-px ${s < step ? 'bg-rokka-cyan/40' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="px-5 pb-6 space-y-4">
            {step === 1 && (
              <Step1
                amount={amount}
                customAmount={customAmount}
                amountError={amountError}
                generating={generating}
                onSelectAmount={(a) => { setAmount(a); setCustomAmount(''); setAmountError('') }}
                onCustomChange={(v) => { setCustomAmount(v); setAmount(null); setAmountError('') }}
                onGenerate={handleGenerate}
              />
            )}

            {step === 2 && (
              <Step2
                qrCode={qrCode}
                amount={selectedAmount ?? 0}
                tableLabel={tableLabel}
                onNext={() => setStep(3)}
                onBack={onClose}
              />
            )}

            {step === 3 && (
              <Step3
                qrCode={qrCode}
                amount={selectedAmount ?? 0}
                tableLabel={tableLabel}
                confirming={confirming}
                onConfirm={handleConfirm}
                onBack={() => setStep(2)}
              />
            )}

            {step === 'success' && (
              <StepSuccess amount={newCredits} tableLabel={tableLabel} confirmedAt={confirmedAt} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Step 1: Elegir monto ──────────────────────────────────────────────────────

function Step1({
  amount, customAmount, amountError, generating,
  onSelectAmount, onCustomChange, onGenerate,
}: {
  amount: number | null
  customAmount: string
  amountError: string
  generating: boolean
  onSelectAmount: (a: number) => void
  onCustomChange: (v: string) => void
  onGenerate: () => void
}) {
  return (
    <>
      <p className="text-xs text-white/40">Selecciona un monto para la recarga:</p>

      {/* Quick amounts */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => onSelectAmount(a)}
            className={`
              py-2 rounded-xl text-sm font-semibold border transition-colors
              ${amount === a
                ? 'bg-rokka-cyan/15 border-rokka-cyan text-rokka-cyan'
                : 'bg-card border-[#2a2a2a] text-white/60 hover:border-white/40 hover:text-white/80'
              }
            `}
          >
            {fmtCurrency(a)}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div>
        <p className="text-[10px] text-white/30 mb-1.5">Otro monto (mín. $1.000)</p>
        <input
          type="text"
          inputMode="numeric"
          value={customAmount}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Ej: 15000"
          className="w-full bg-card border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50"
        />
        {amountError && (
          <p className="text-[11px] text-rokka-red mt-1">{amountError}</p>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full py-3 rounded-xl bg-rokka-cyan text-black font-bold text-sm disabled:opacity-40 hover:bg-rokka-cyan/80 transition-opacity"
      >
        {generating ? 'Generando…' : 'Generar Código de Recarga'}
      </button>
    </>
  )
}

// ── Step 2: Cliente escanea QR ────────────────────────────────────────────────

function Step2({
  qrCode, amount, tableLabel, onNext, onBack,
}: {
  qrCode: string
  amount: number
  tableLabel: string
  onNext: () => void
  onBack: () => void
}) {
  return (
    <>
      {/* QR code */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="p-3 bg-white rounded-2xl">
          <QRCodeSVG
            value={qrCode}
            size={180}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            level="M"
          />
        </div>
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-rokka-cyan tracking-[0.2em]">
            {qrCode}
          </p>
          <p className="text-xs text-white/40 mt-1">
            Uso único · {fmtCurrency(amount)} · {tableLabel}
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 bg-rokka-orange/10 border border-rokka-orange/30 rounded-xl px-3 py-2.5">
        <span className="text-rokka-orange text-base shrink-0">⚠️</span>
        <p className="text-xs text-rokka-orange/90 leading-relaxed">
          Espera que el cliente confirme el pago antes de continuar. El código expira si no se usa.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white/80 transition-colors"
        >
          ← Cancelar
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-2.5 rounded-xl bg-rokka-green/15 border border-rokka-green/40 text-rokka-green font-semibold text-sm hover:bg-rokka-green/25 transition-colors"
        >
          ✅ El cliente ya pagó
        </button>
      </div>
    </>
  )
}

// ── Step 3: Confirmación final ────────────────────────────────────────────────

function Step3({
  qrCode, amount, tableLabel, confirming, onConfirm, onBack,
}: {
  qrCode: string
  amount: number
  tableLabel: string
  confirming: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <>
      <p className="text-xs text-white/40">Revisa el resumen antes de confirmar:</p>

      {/* Summary card */}
      <div className="bg-card border border-[#2a2a2a] rounded-xl divide-y divide-[#1e1e1e]">
        {[
          { label: 'Mesa',   value: tableLabel },
          { label: 'Monto',  value: fmtCurrency(amount), highlight: true },
          { label: 'Código', value: qrCode, mono: true },
          { label: 'Hora',   value: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }) },
        ].map(({ label, value, highlight, mono }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-white/40">{label}</span>
            <span className={`text-sm font-semibold ${highlight ? 'text-rokka-cyan' : mono ? 'font-mono text-white/70' : 'text-white'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={confirming}
          className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white/80 transition-colors disabled:opacity-30"
        >
          ← Atrás
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="flex-1 py-2.5 rounded-xl bg-rokka-cyan text-black font-bold text-sm disabled:opacity-40 hover:bg-rokka-cyan/80 transition-opacity"
        >
          {confirming ? 'Confirmando…' : '✅ Confirmar Recarga'}
        </button>
      </div>
    </>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function StepSuccess({
  amount, tableLabel, confirmedAt,
}: {
  amount: number
  tableLabel: string
  confirmedAt: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <span className="text-5xl">🎉</span>
      <p className="font-bold text-white text-lg">Recarga exitosa</p>
      <p className="text-3xl font-black text-rokka-cyan">{fmtCurrency(amount)}</p>
      <p className="text-xs text-white/40">
        {tableLabel} · {confirmedAt ? new Date(confirmedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
      </p>
    </div>
  )
}
