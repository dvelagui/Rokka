# 🎵 ROKKA

**Plataforma musical interactiva para bares** — los clientes piden canciones, pujan para subir en la cola y votan en tiempo real desde su celular, sin descargar ninguna app.

---

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 + Framer Motion |
| Backend / DB | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Validación | Zod |
| Lenguaje | TypeScript strict |

---

## Estructura del monorepo

```
rokka/
├── apps/
│   ├── client/        # App móvil para mesas (puerto 3000)
│   ├── admin/         # Panel de administración (puerto 3001)
│   └── tv/            # Pantalla del bar (puerto 3002)
├── packages/
│   ├── shared/        # Tipos, schemas Zod, constantes y utils
│   ├── supabase/      # Cliente, hooks, queries y RPCs
│   └── ui/            # Componentes visuales compartidos
└── supabase/
    ├── migrations/    # 12 migraciones SQL
    └── seed.sql       # Datos de ejemplo
```

---

## Apps

### 📱 Client (`apps/client`) — puerto 3000
App web progresiva para los clientes del bar. Acceso via QR por mesa, sin registro.

- Buscar y pedir canciones (YouTube)
- Pujar créditos para subir en la cola
- Votar skip / keep en la canción actual
- Chat en vivo con reacciones flotantes
- Ver menú y hacer pedidos a la mesa
- Consultar saldo de créditos

### 🎛️ Admin (`apps/admin`) — puerto 3001
Panel completo para el dueño o encargado del bar.

- Gestión de cola (reordenar, saltar, eliminar)
- Gestión de mesas (QR, créditos, baneo)
- Pedidos en tiempo real con cambio de estado
- Configuración del bar (pujas, skip automático, PIN TV)
- Estadísticas: KPIs, top canciones, ranking global
- Notificaciones: mesa llamando, pedidos, pujas altas

### 📺 TV (`apps/tv`) — puerto 3002
Pantalla de visualización para el bar. Acceso con PIN de 6 dígitos.

- Cola de canciones con countdown visual
- Chat en vivo y reacciones flotantes
- Rotación de anuncios (propios + sponsors)
- Player de YouTube integrado (IFrame API)

---

## Packages

### `@rokka/shared`
Código compartido entre las 3 apps y el package supabase.

```ts
import { QueueItem, sendMessageSchema, formatCredits, ALLOWED_REACTIONS } from '@rokka/shared'
```

- **Tipos de dominio** (`models.ts`) — `Bar`, `QueueItem`, `Order`, `ChatMessage`, etc.
- **Tipos de DB** (`database.ts`) — stub de `supabase gen types`, `Tables<T>`, `Enums<T>`
- **Schemas Zod** (`validation.ts`) — `sendMessageSchema`, `bidSchema`, `createOrderSchema`, etc.
- **Constantes** — `PROFANITY_LIST`, `ALLOWED_REACTIONS`, `QUEUE_DEFAULTS`, `SHIFTS`, etc.
- **Utils** — `formatCredits`, `formatTime`, `estimateWait`, `generateQRCode`, `formatHour`

### `@rokka/supabase`
Toda la lógica de acceso a datos.

```ts
import { useQueue, useChat, useVoting, useBarRealtime, RealtimeProvider } from '@rokka/supabase'
```

- **Auth** — Admin (Supabase Auth), Mesa (token QR), TV (PIN 6 dígitos)
- **Queries** — chat, votes, credits, menu, orders, tables, waiters, bar, log, ads, stats
- **Services** — YouTube Data API v3 con caché en memoria
- **Hooks** — `useQueue`, `useChat`, `useVoting`, `useCredits`, `useCart`, `useOrders`, `useTables`, `useWaiters`, `useAdminNotifications`, `useYouTubeSearch`, `useAdRotation`
- **Realtime** — `RealtimeProvider` + `useRealtime()` con reconexión automática

### `@rokka/ui`
Componentes visuales base.

- `<RokkaCard />` — tarjeta con variantes de glow (cyan / purple / fire)
- `<RokkaButton />` — botón animado con Framer Motion

---

## Base de datos

12 migraciones SQL sobre PostgreSQL (Supabase):

| # | Migración |
|---|---|
| 001 | Schema inicial — 19 tablas, 6 enums, índices, triggers |
| 002 | RLS básico |
| 003 | Funciones: `request_song`, `vote_on_song`, `get_active_queue`, `play_next_song`, `skip_song` |
| 004 | Auth: `bar_admins`, `tv_pin`, `refresh_table_session`, `verify_tv_pin`, `register_bar_admin` |
| 005 | RLS scoped por bar — políticas por fila para las 19 tablas |
| 006 | RPCs complementarios: pedidos, chat, info pública del bar |
| 007 | Cola avanzada: `bid_on_song`, `reorder_queue`, `remove_from_queue` |
| 008 | Realtime: `REPLICA IDENTITY FULL` en 6 tablas |
| 009 | Chat seguro: `send_message_safe` (filtro groserías + autoban), `cast_vote_and_check` |
| 010 | Créditos QR: `initiate_recharge_qr`, `confirm_recharge_qr`, `create_order_validated` |
| 011 | Admin RPCs: `ban_table_rpc`, `authenticate_waiter`, `create_waiter_rpc`, `update_bar_config` |
| 012 | Stats: `get_bar_stats_summary`, `get_top_songs`, `get_global_top_songs`, `get_global_bar_ranking` |

---

## Desarrollo local

### Requisitos
- Node.js 20+
- pnpm 9+
- Docker Desktop (para Supabase local)

### Setup

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar Supabase local (requiere Docker Desktop corriendo)
npx supabase start

# 3. Copiar variables de entorno
cp apps/client/.env.example  apps/client/.env.local
cp apps/admin/.env.example   apps/admin/.env.local
cp apps/tv/.env.example      apps/tv/.env.local

# 4. Iniciar todas las apps en paralelo
pnpm dev
```

Las URLs de Supabase local las muestra el comando `npx supabase start` al terminar.

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>
NEXT_PUBLIC_YOUTUBE_API_KEY=<tu API key de Google Cloud>
```

### Comandos útiles

```bash
pnpm dev          # Inicia las 3 apps en paralelo
pnpm build        # Build de producción
pnpm type-check   # Verificar tipos TypeScript
pnpm lint         # ESLint en todo el monorepo

# Supabase
npx supabase start        # Levantar DB local
npx supabase db reset     # Resetear DB y aplicar seed
npx supabase stop         # Detener contenedores
```

---

## Seguridad

- **Row Level Security (RLS)** en todas las tablas — cada bar solo ve sus propios datos
- **SECURITY DEFINER RPCs** — todas las mutaciones de usuarios anónimos pasan por funciones SQL que validan el token de sesión antes de escribir
- **Tokens de mesa** — hex de 16 bytes generado por `gen_random_bytes`
- **Autoban** — detección automática de groserías reiteradas con bloqueo de mesa
- **Validación doble QR** — las recargas de créditos requieren escaneo físico para confirmarse

---

## Licencia

Privado — todos los derechos reservados.
