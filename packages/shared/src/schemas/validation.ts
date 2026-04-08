import { z } from 'zod'
import { MAX_CHAT_LENGTH, MAX_DEDICATION_LENGTH, RECHARGE_AMOUNTS } from '../constants'

// ── Chat ──────────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(MAX_CHAT_LENGTH, `Máximo ${MAX_CHAT_LENGTH} caracteres`),
  tableId: z.string().uuid('Mesa inválida'),
  barId:   z.string().uuid('Bar inválido'),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

// ── Cola: agregar canción ─────────────────────────────────────────────────────

export const addSongSchema = z.object({
  title:           z.string().min(1, 'El título es requerido').max(200),
  artist:          z.string().min(1, 'El artista es requerido').max(200),
  youtubeVideoId:  z.string().min(1).optional(),
  thumbnailUrl:    z.string().url().optional().or(z.literal('')),
  dedication:      z
    .string()
    .max(MAX_DEDICATION_LENGTH, `Dedicatoria máx. ${MAX_DEDICATION_LENGTH} caracteres`)
    .optional(),
  bidAmount:       z.number().int().min(0, 'La puja no puede ser negativa').default(0),
  tableId:         z.string().uuid('Mesa inválida'),
  barId:           z.string().uuid('Bar inválido'),
})
export type AddSongInput = z.infer<typeof addSongSchema>

// ── Puja ──────────────────────────────────────────────────────────────────────

export const bidSchema = z.object({
  queueId:  z.string().uuid('ID de cola inválido'),
  barId:    z.string().uuid('Bar inválido'),
  tableId:  z.string().uuid('Mesa inválida'),
  amount:   z
    .number()
    .int('La puja debe ser un entero')
    .positive('La puja debe ser mayor a 0'),
})
export type BidInput = z.infer<typeof bidSchema>

// ── Pedidos ───────────────────────────────────────────────────────────────────

export const orderItemSchema = z.object({
  itemId: z.string().uuid('ID de ítem inválido'),
  qty:    z.number().int().positive('La cantidad debe ser mayor a 0'),
})

export const createOrderSchema = z.object({
  barId:  z.string().uuid('Bar inválido'),
  items:  z
    .array(orderItemSchema)
    .nonempty('El pedido debe tener al menos un ítem'),
})
export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ── Recarga de créditos ───────────────────────────────────────────────────────

export const rechargeSchema = z.object({
  barId:     z.string().uuid('Bar inválido'),
  tableId:   z.string().uuid('Mesa inválida'),
  amount:    z
    .number()
    .int('El monto debe ser entero')
    .positive('El monto debe ser mayor a 0')
    .refine(
      (n) => n % 1_000 === 0,
      'El monto debe ser múltiplo de 1.000',
    ),
  waiterId:  z.string().optional(),
})
export type RechargeInput = z.infer<typeof rechargeSchema>

// ── Meseros ───────────────────────────────────────────────────────────────────

export const createWaiterSchema = z.object({
  barId: z.string().uuid('Bar inválido'),
  name:  z.string().min(1, 'El nombre es requerido').max(100),
  pin:   z
    .string()
    .regex(/^\d{4}$/, 'El PIN debe ser exactamente 4 dígitos numéricos'),
  phone: z.string().max(20).optional(),
  shift: z.string().optional(),
})
export type CreateWaiterInput = z.infer<typeof createWaiterSchema>

// ── Configuración del bar ─────────────────────────────────────────────────────

export const barConfigSchema = z.object({
  avgSongDuration: z
    .number()
    .int()
    .min(1, 'Mínimo 1 minuto')
    .max(10, 'Máximo 10 minutos')
    .optional(),
  maxTables: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
  minBid: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .optional(),
  profanityFilter: z.boolean().optional(),
  allowDedications: z.boolean().optional(),
  autoSkipThreshold: z
    .number()
    .int()
    .min(10, 'Mínimo 10%')
    .max(90, 'Máximo 90%')
    .optional(),
  maxSongsPerTable: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),
  tvPin: z
    .string()
    .regex(/^\d{6}$/, 'El PIN de TV debe ser exactamente 6 dígitos')
    .nullable()
    .optional(),
}).strict()
export type BarConfigInput = z.infer<typeof barConfigSchema>

// ── Anuncios ──────────────────────────────────────────────────────────────────

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

export const createAdSchema = z.object({
  barId:           z.string().uuid('Bar inválido'),
  emoji:           z.string().min(1).max(4),
  title:           z.string().min(1, 'El título es requerido').max(50, 'Máximo 50 caracteres'),
  subtitle:        z.string().max(80, 'Máximo 80 caracteres').optional(),
  color:           z
    .string()
    .regex(hexColorRegex, 'Color debe ser hexadecimal válido (#RGB o #RRGGBB)')
    .optional()
    .default('#00E5FF'),
  durationSeconds: z
    .number()
    .int()
    .min(3, 'Mínimo 3 segundos')
    .max(30, 'Máximo 30 segundos')
    .optional()
    .default(8),
  isOwn:           z.boolean().optional().default(true),
  companyName:     z.string().max(100).optional(),
})
export type CreateAdInput = z.infer<typeof createAdSchema>

// ── Perfil del bar ────────────────────────────────────────────────────────────

export const updateBarProfileSchema = z.object({
  name:    z.string().min(1).max(100).optional(),
  emoji:   z.string().min(1).max(4).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
})
export type UpdateBarProfileInput = z.infer<typeof updateBarProfileSchema>

// ── Helpers: parse y validate ─────────────────────────────────────────────────

/**
 * Parsea y valida un input. Retorna `{success, data}` o `{success: false, errors}`.
 * Compatible con Server Actions de Next.js.
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(input)
  if (result.success) return { success: true, data: result.data }
  return { success: false, errors: result.error.errors }
}
