'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { generateTableQR, addLogEntry } from '@rokka/supabase'
import { useAdminContext } from '../../../providers/AdminProvider'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  tableId: string
  tableLabel: string
  onClose: () => void
}

// ── TableQRModal ──────────────────────────────────────────────────────────────

export default function TableQRModal({ tableId, tableLabel, onClose }: Props) {
  const { bar, admin } = useAdminContext()

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bar?.id) return
    void generate(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar?.id, tableId])

  async function generate(isRegeneration: boolean) {
    if (!bar?.id) return
    setLoading(true)
    setError('')
    try {
      const result = await generateTableQR(bar.id, tableId, process.env.NEXT_PUBLIC_CLIENT_URL)
      setUrl(result.url)
      if (isRegeneration) {
        await addLogEntry(bar.id, admin?.email ?? 'admin', 'table_qr_regenerated', `QR regenerado para ${tableLabel}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el QR')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="table-qr-overlay"
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
                QR de mesa
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

          {/* Content */}
          <div className="px-5 pb-6 space-y-4">
            <p className="text-xs text-white/40">
              Los clientes escanean este QR para unirse a {tableLabel} desde su celular.
            </p>

            <div className="flex flex-col items-center gap-3 py-2">
              {url ? (
                <div className="p-3 bg-white rounded-2xl">
                  <QRCodeSVG value={url} size={200} bgColor="#ffffff" fgColor="#0a0a0a" level="M" />
                </div>
              ) : (
                <div className="w-[224px] h-[224px] flex items-center justify-center text-white/20 text-xs">
                  {loading ? 'Generando…' : 'Sin QR'}
                </div>
              )}
              {url && (
                <p className="text-[10px] text-white/30 font-mono break-all text-center px-2">{url}</p>
              )}
            </div>

            {error && <p className="text-[11px] text-rokka-fire font-semibold">{error}</p>}

            {/* Warning */}
            <div className="flex items-start gap-2 bg-rokka-orange/10 border border-rokka-orange/30 rounded-xl px-3 py-2.5">
              <span className="text-rokka-orange text-base shrink-0">⚠️</span>
              <p className="text-xs text-rokka-orange/90 leading-relaxed">
                Regenerar el QR invalida el anterior — la sesión actual de la mesa se cerrará.
              </p>
            </div>

            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rokka-cyan text-black font-bold text-sm disabled:opacity-40 hover:bg-rokka-cyan/80 transition-opacity"
            >
              {loading ? 'Generando…' : 'Regenerar QR'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
