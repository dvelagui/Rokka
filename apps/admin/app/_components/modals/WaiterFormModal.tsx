'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createWaiterSchema } from '@rokka/shared'
import { addLogEntry } from '@rokka/supabase'
import type { WaiterPublic } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFTS = [
  { value: 'manana',  label: 'Mañana (6am–2pm)'  },
  { value: 'tarde',   label: 'Tarde (2pm–10pm)'   },
  { value: 'noche',   label: 'Noche (10pm–6am)'   },
  { value: 'partido', label: 'Partido'             },
  { value: 'full',    label: 'Turno completo'      },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  waiter: WaiterPublic | null  // null = create mode
  onSave: (data: {
    name: string; phone: string; pin: string; shift: string
  }, isNew: boolean) => Promise<void>
  onClose: () => void
}

// ── WaiterFormModal ───────────────────────────────────────────────────────────

export default function WaiterFormModal({ waiter, onSave, onClose }: Props) {
  const { bar, admin } = useAdminContext()
  const isEdit = waiter !== null

  const [name,    setName]    = useState(waiter?.name    ?? '')
  const [phone,   setPhone]   = useState(waiter?.phone   ?? '')
  const [pin,     setPin]     = useState('')
  const [shift,   setShift]   = useState(waiter?.shift   ?? 'tarde')
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [saving,  setSaving]  = useState(false)
  const [apiError,setApiError]= useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bar?.id) return

    // PIN is required for create; optional for edit
    const pinValue = pin.trim() || (isEdit ? 'SKIP' : '')

    const parseData = {
      barId: bar.id,
      name:  name.trim(),
      pin:   pinValue === 'SKIP' ? '0000' : pinValue,
      phone: phone.trim() || undefined,
      shift,
    }

    const result = createWaiterSchema.safeParse(parseData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        if (key && key !== 'barId') fieldErrors[key] = issue.message
      }
      // Skip pin error if editing with empty PIN
      if (isEdit && !pin.trim()) delete fieldErrors['pin']
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length > 0) return
    }
    setErrors({})
    setApiError('')
    setSaving(true)

    try {
      await onSave({ name: name.trim(), phone: phone.trim(), pin: pin.trim(), shift }, !isEdit)
      await addLogEntry(
        bar.id,
        admin?.email ?? 'admin',
        isEdit ? 'waiter_updated' : 'waiter_created',
        `${isEdit ? 'Editó' : 'Creó'} mesero: ${name.trim()}`,
      )
      onClose()
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="waiter-form-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/75 flex items-end justify-center"
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
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                {isEdit ? 'Editar mesero' : 'Nuevo mesero'}
              </p>
              <p className="text-white font-bold text-base mt-0.5">
                {isEdit ? waiter.name : 'Agregar personal'}
              </p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-3">
            {/* Name */}
            <Field label="Nombre *" error={errors['name']}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Carlos Ramírez"
                className={inputCls(errors['name'])}
              />
            </Field>

            {/* Phone */}
            <Field label="Teléfono" error={errors['phone']}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 3001234567"
                className={inputCls(errors['phone'])}
              />
            </Field>

            {/* PIN */}
            <Field
              label={isEdit ? 'PIN (dejar vacío para no cambiar)' : 'PIN de 4 dígitos *'}
              error={errors['pin']}
            >
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={isEdit ? '••••' : '4 dígitos numéricos'}
                className={inputCls(errors['pin'])}
              />
            </Field>

            {/* Shift */}
            <Field label="Turno" error={errors['shift']}>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className={inputCls(errors['shift']) + ' [color-scheme:dark]'}
              >
                {SHIFTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            {apiError && (
              <p className="text-xs text-rokka-red bg-rokka-red/10 border border-rokka-red/20 rounded-lg px-3 py-2">
                {apiError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-rokka-cyan text-black font-bold text-sm disabled:opacity-40 hover:bg-rokka-cyan/80 transition-opacity"
              >
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear mesero'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputCls(error?: string) {
  return `w-full bg-[#1a1a1a] border ${error ? 'border-rokka-red/50' : 'border-[#2a2a2a]'} rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rokka-cyan/50`
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</label>
      {children}
      {error && <p className="text-[11px] text-rokka-red">{error}</p>}
    </div>
  )
}
