/**
 * Formatea un número de créditos con sufijo k/M.
 * Ej: 500 → "500", 15000 → "$15k", 1200000 → "$1.2M"
 */
export function formatCredits(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return `$${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return String(amount)
}

/**
 * Convierte segundos a formato "M:SS".
 * Ej: 222 → "3:42", 65 → "1:05"
 */
export function formatTime(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds))
  const m    = Math.floor(secs / 60)
  const s    = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Estima el tiempo de espera dada la posición en la cola y la duración promedio.
 * @param position   Posición en la cola (1-based)
 * @param avgSeconds Duración promedio de canción en segundos
 * Ej: position=3, avgSeconds=210 → "~10 min"
 */
export function estimateWait(position: number, avgSeconds = 210): string {
  if (position <= 0) return 'Reproduciendo ahora'
  const totalSeconds = position * avgSeconds
  if (totalSeconds < 60) return `~${totalSeconds} seg`
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `~${minutes} min`
  const hours = (totalSeconds / 3600).toFixed(1)
  return `~${hours} h`
}

/**
 * Genera un código QR para recarga de créditos.
 * Formato: "RC" + 6 caracteres alfanuméricos en mayúsculas.
 */
export function generateQRCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
  return `RC${suffix}`
}

/**
 * Formatea una fecha ISO o Date a hora local en formato "HH:MM" (24h).
 * Ej: "2026-04-08T21:44:00Z" → "21:44"
 */
export function formatHour(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('es', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formatea una fecha ISO a fecha corta "DD/MM/YYYY".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

/**
 * Dado un precio en centavos (entero), lo muestra con separador de miles.
 * Ej: 15000 → "15.000"
 */
export function formatPrice(amount: number): string {
  return amount.toLocaleString('es-CO')
}

/**
 * Trunca un texto a N caracteres agregando "…" si se corta.
 */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
}
