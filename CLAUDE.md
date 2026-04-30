# ROKKA — Guía del desarrollador

Plataforma musical interactiva para bares: los clientes piden canciones, pujan créditos y votan en tiempo real desde su celular (sin instalar nada), mientras el admin gestiona la cola y la pantalla TV muestra el estado en directo.

---

## Stack completo con versiones exactas

| Capa | Tecnología | Versión |
|---|---|---|
| Monorepo | Turborepo | 2.3.3 |
| Package manager | pnpm | 9.15.0 |
| Lenguaje | TypeScript | 5.7.2 |
| Frontend | Next.js (App Router) | 15.1.6 |
| UI | Tailwind CSS | v4 |
| Animaciones | Framer Motion | 11.15.0 |
| Backend / DB | Supabase JS | 2.47.0 |
| SSR auth | @supabase/ssr | 0.6.1 |
| Validación | Zod | 3.24.0 |
| Drag-and-drop | @dnd-kit | (admin) |
| QR generación | qrcode.react | (admin) |
| QR escáner | html5-qrcode | (client) |
| Testing | Vitest + jsdom | (client) |
| Linting | ESLint (Next.js config) | — |
| Formateo | Prettier | 3.3.3 |
| Runtime | Node.js | 20+ |
| DB local | Supabase CLI + Docker | — |

---

## Prerrequisitos

Antes de clonar, instala estas herramientas:

- **Node.js 20+** — `node -v` debe mostrar `v20.x` o superior
- **pnpm 9+** — `npm install -g pnpm@9.15.0`
- **Docker Desktop** — activo y corriendo (Supabase local lo necesita)
- **Supabase CLI** — `npm install -g supabase` o vía `npx supabase`
- **Git** — cualquier versión reciente
- **YouTube Data API v3 key** — [Google Cloud Console](https://console.cloud.google.com) → APIs → YouTube Data API v3 → Crear credenciales

---

## Setup paso a paso

```bash
# 1. Clonar el repo
git clone <url-del-repo>
cd rokka

# 2. Instalar todas las dependencias (instala las 3 apps + 3 packages a la vez)
pnpm install

# 3. Levantar Supabase local (Docker Desktop debe estar corriendo)
#    Al terminar muestra las URLs y keys que necesitas para el .env
npx supabase start

# 4. Copiar plantillas de variables de entorno (ver sección siguiente)
cp apps/client/.env.local.example  apps/client/.env.local
cp apps/admin/.env.local.example   apps/admin/.env.local
cp apps/tv/.env.local.example      apps/tv/.env.local

# 5. Editar cada .env.local con los valores que mostró `supabase start`
#    (ver plantillas completas abajo)

# 6. Aplicar migraciones y seed de datos de ejemplo
npx supabase db reset

# 7. Iniciar las 3 apps en paralelo
pnpm dev
```

URLs de desarrollo:
- `http://localhost:3000` — Client (app móvil de mesas)
- `http://localhost:3001` — Admin (panel del dueño del bar)
- `http://localhost:3002` — TV (pantalla del bar)

---

## Plantillas .env.local

### `apps/client/.env.local`

```env
# Supabase — valores que muestra `npx supabase start`
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>

# YouTube Data API v3 — Google Cloud Console → APIs → YouTube Data API v3
NEXT_PUBLIC_YOUTUBE_API_KEY=<tu API key>

# URL pública del client (usada para generar links de QR de mesas)
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
```

### `apps/admin/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>

# Service Role: solo para rutas de servidor (NUNCA exponerla al cliente)
SUPABASE_SERVICE_ROLE_KEY=<service_role key de supabase start>

# YouTube Data API v3
NEXT_PUBLIC_YOUTUBE_API_KEY=<tu API key>

# URL del client — para generar QR de mesas desde el admin
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
```

### `apps/tv/.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>
```

> Los valores de `supabase start` (URL, anon key, service role) son **iguales para todos** en local porque son generados determinísticamente por Docker. La única variable personal que necesitas es la YouTube API key.

---

## Scripts disponibles

### Raíz del monorepo (ejecutan en paralelo sobre todas las apps/packages)

```bash
pnpm dev          # Levanta las 3 apps con Turbopack (puertos 3000, 3001, 3002)
pnpm build        # Build de producción de todas las apps
pnpm type-check   # Verifica tipos TypeScript en todo el monorepo
pnpm lint         # ESLint en todo el monorepo
pnpm format       # Prettier sobre *.ts, *.tsx, *.md, *.json
```

### Por app individual (ejecutar desde la carpeta de la app)

```bash
pnpm --filter @rokka/client dev        # Solo client (puerto 3000)
pnpm --filter @rokka/admin dev         # Solo admin (puerto 3001)
pnpm --filter @rokka/tv dev            # Solo tv (puerto 3002)
pnpm --filter @rokka/client test       # Tests con Vitest (solo client tiene tests)
pnpm --filter @rokka/client test:watch # Tests en modo watch
```

### Supabase

```bash
npx supabase start        # Levanta DB local (muestra keys al final)
npx supabase stop         # Detiene los contenedores
npx supabase db reset     # Resetea DB, aplica las 12 migraciones + seed.sql
npx supabase status       # Muestra URLs y keys activos
npx supabase gen types typescript --local > packages/shared/src/types/database.ts
                          # Regenerar tipos DB tras agregar migraciones
```

---

## Estructura de carpetas

```
rokka/
├── apps/
│   ├── client/            # Next.js 15 — PWA móvil para clientes del bar (puerto 3000)
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout: fuente Outfit, metadata, ClientProviders
│   │   │   ├── page.tsx           # Interfaz principal: tabs Queue/Chat/Search/Genres/Top
│   │   │   ├── join/page.tsx      # Landing de acceso por QR de mesa
│   │   │   ├── no-session/page.tsx# Pantalla cuando el token de mesa no es válido
│   │   │   └── (main)/layout.tsx  # Layout para sub-rutas autenticadas (pendiente expansión)
│   │   └── components/
│   │       ├── tabs/              # QueueTab, ChatTab, SearchTab, GenresTab, TopBarTab
│   │       ├── queue/             # NowPlaying, VotingSection, QueueList, AddSongModal
│   │       ├── modals/            # BidModal, DedicationModal
│   │       ├── menu/              # MenuSheet
│   │       ├── ads/               # AdPopup
│   │       └── scanner/           # QRScanner
│   │
│   ├── admin/             # Next.js 15 — Panel del dueño/encargado (puerto 3001)
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── page.tsx           # Redirect a dashboard si autenticado
│   │       ├── login/page.tsx     # Login con Supabase Auth
│   │       ├── register/page.tsx  # Registro de bar nuevo
│   │       └── _components/       # Dashboard + 13 tabs + 11 modales (ver abajo)
│   │
│   └── tv/                # Next.js 15 — Pantalla del bar (puerto 3002)
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx           # Display principal (⚠️ EN DESARROLLO — ver estado)
│           └── setup/page.tsx     # Auth por bar slug + PIN 6 dígitos
│
├── packages/
│   ├── shared/            # @rokka/shared — Tipos, schemas, constantes, utils
│   │   └── src/
│   │       ├── types/
│   │       │   ├── models.ts      # Tipos de dominio: Bar, QueueItem, Order, ChatMessage…
│   │       │   └── database.ts    # ⚠️ STUB generado por Supabase CLI (regenerar tras migraciones)
│   │       ├── schemas/
│   │       │   └── validation.ts  # Schemas Zod: sendMessageSchema, bidSchema, createOrderSchema…
│   │       ├── constants/
│   │       │   └── index.ts       # PROFANITY_LIST, ALLOWED_REACTIONS, QUEUE_DEFAULTS, SHIFTS…
│   │       └── utils/
│   │           └── format.ts      # formatCredits, formatTime, estimateWait, generateQRCode…
│   │
│   ├── supabase/          # @rokka/supabase — Capa de acceso a datos
│   │   └── src/
│   │       ├── auth/              # admin.ts, table.ts, tv.ts — flujos de autenticación
│   │       ├── queries/           # 16 módulos: ads, bar, chat, credits, menu, orders, stats…
│   │       ├── hooks/             # 20 hooks React: useQueue, useChat, useOrders, useTables…
│   │       ├── realtime/          # RealtimeProvider + 8 listeners especializados
│   │       ├── services/
│   │       │   └── youtube.ts     # YouTube Data API v3 con caché en memoria
│   │       ├── rpc.ts             # Todas las llamadas RPC a funciones SQL
│   │       ├── client.ts          # Supabase browser client
│   │       └── server.ts          # Supabase server client (SSR/API routes)
│   │
│   └── ui/                # @rokka/ui — Componentes visuales compartidos (mínimo por ahora)
│       └── src/
│           └── components/
│               ├── RokkaCard.tsx  # Tarjeta con variantes de glow: cyan/purple/fire
│               └── RokkaButton.tsx# Botón animado con Framer Motion
│
└── supabase/
    ├── migrations/        # 12 migraciones SQL (ver README para detalle de cada una)
    └── seed.sql           # Datos de ejemplo para desarrollo local
```

---

## Estado del proyecto

### Construido y funcional

- **@rokka/shared** — Tipos de dominio, schemas Zod, constantes, utils (~950 LOC)
- **@rokka/supabase** — Auth (admin/mesa/TV), 16 módulos de queries, 20 hooks React, 8 listeners realtime, YouTube service (~5.300 LOC)
- **@rokka/ui** — 2 componentes base (RokkaCard, RokkaButton)
- **Base de datos** — 12 migraciones (19 tablas, 6 enums, RLS completo, 30+ RPCs)
- **apps/client** — Interfaz completa: cola, chat, búsqueda, géneros, top canciones, bid modal, menú, QR scanner, anuncios, reacciones flotantes
- **apps/admin** — Dashboard completo: gestión de cola, mesas, pedidos, menú, mozos, anuncios, config, estadísticas, log, notificaciones en tiempo real (13 tabs + 11 modales)
- **apps/tv** — Flujo de setup (slug + PIN) y autenticación

### Pendiente — alta prioridad

- **apps/tv — display principal**: La pantalla TV (`app/page.tsx`) es un placeholder. Falta implementar: cola con countdown visual, canción actual con progreso, chat en vivo con reacciones, rotación de anuncios, YouTube IFrame API player
- **`database.ts` en @rokka/shared**: Es un stub manual. Ejecutar `npx supabase gen types` y commitear el resultado actualizado tras cada migración nueva

### Pendiente — media prioridad

- **apps/tv — anuncios**: El hook `useAdRotation` ya existe en @rokka/supabase; falta conectarlo en la pantalla TV
- **apps/client `(main)` layout**: El route group `(main)` está previsto para sub-rutas autenticadas; por ahora solo es un pass-through de 8 líneas
- **@rokka/ui**: Solo tiene 2 componentes. La mayoría del UI se construye inline con Tailwind. Considerar extraer componentes reutilizables si hay duplicación entre apps

### Pendiente — baja prioridad

- **Suscripciones y gift cards**: El schema de DB tiene las tablas `subscriptions` y `gift_cards`, pero no hay frontend ni RPCs para el flujo de compra
- **Notificaciones push**: La infraestructura de realtime está; falta integración con Web Push API
- **Deployment docs**: La dependencia `@netlify/plugin-nextjs` está en las apps; falta documentar el proceso de deploy a producción

---

## Convenciones del código

### TypeScript

- **Strict mode obligatorio** — `noImplicitAny`, `strictNullChecks` activos. No usar `any`; preferir `unknown` y narrowing
- **Tipos de DB**: Siempre importar desde `@rokka/shared` → `Tables<'nombre_tabla'>`, `Enums<'nombre_enum'>`
- **Tipos de dominio**: Los modelos de la app viven en `@rokka/shared/types/models.ts`, no en las apps

### Imports

- Usar alias de workspace: `@rokka/shared`, `@rokka/supabase`, `@rokka/ui`
- Nunca hacer imports relativos entre apps (`../../admin/...`); toda lógica compartida va a packages

### Formato (Prettier)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- Sin punto y coma
- Comillas simples
- Trailing comma en multi-línea
- Máximo 100 caracteres por línea

### Componentes React

- Componentes nombrados en PascalCase, archivos en PascalCase (`NowPlaying.tsx`)
- Hooks siempre en `use` prefix, definidos en `@rokka/supabase/hooks/`
- No mezclar lógica de datos con UI: los hooks del package supabase manejan los datos, los componentes solo renderizan
- Animaciones con Framer Motion; no usar CSS transitions para elementos interactivos principales

### Acceso a datos

- **Nunca llamar a Supabase directamente desde componentes** — siempre a través de los hooks de `@rokka/supabase`
- **Mutaciones de usuarios anónimos** (mesas) solo via RPCs SQL (`rpc.ts`), nunca `.insert()`/`.update()` directo desde el cliente
- **Rutas de servidor** (API routes del admin) usan `createServerClient` de `@rokka/supabase/server`

### Supabase y migraciones

- Cada migración es un archivo SQL numerado en `supabase/migrations/`
- Después de agregar una migración: `npx supabase db reset` para aplicar, luego regenerar `database.ts`
- Las políticas RLS van en la migración correspondiente, no inline en el código

### Comentarios

- Solo comentar el **por qué**, nunca el qué
- En `@rokka/supabase`, cada hook exporta una interfaz tipada — el nombre del hook documenta su propósito

### Git

- Commits en español, con prefijo de tipo: `feat:`, `fix:`, `refactor:`, `chore:`
- Una feature por branch: `feat/nombre-feature`
- No commitear `.env.local` ni `database.ts` sin regenerar primero
