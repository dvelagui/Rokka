-- ============================================================
-- 001 — ROKKA SCHEMA INICIAL
-- Plataforma musical interactiva para bares
-- ============================================================

-- ── Extensiones ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE queue_status      AS ENUM ('queued', 'playing', 'played', 'skipped');
CREATE TYPE vote_type         AS ENUM ('skip', 'keep');
CREATE TYPE message_type      AS ENUM ('msg', 'admin', 'reaction', 'system');
CREATE TYPE transaction_type  AS ENUM ('recharge', 'bid', 'refund', 'reward');
CREATE TYPE order_status      AS ENUM ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled');

-- ── Tabla: bars ───────────────────────────────────────────────────────────────

CREATE TABLE bars (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  emoji      TEXT        NOT NULL DEFAULT '🎵',
  logo_url   TEXT,
  slug       TEXT        UNIQUE NOT NULL,
  config     JSONB       NOT NULL DEFAULT '{
    "volumen_default": 70,
    "max_mesas": 20,
    "avg_song_duration": 210,
    "limite_pujas": 500,
    "creditos_por_puja_minimo": 50,
    "max_canciones_por_mesa": 3,
    "chat_habilitado": true,
    "pedidos_habilitado": true
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: tables (mesas) ─────────────────────────────────────────────────────

CREATE TABLE tables (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id         UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  number         INT         NOT NULL,
  label          TEXT        NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  is_banned      BOOLEAN     NOT NULL DEFAULT FALSE,
  session_token  TEXT        UNIQUE,
  credits        INT         NOT NULL DEFAULT 0 CHECK (credits >= 0),
  connected_at   TIMESTAMPTZ,
  max_occupants  INT         NOT NULL DEFAULT 4,
  UNIQUE(bar_id, number)
);

-- ── Tabla: queue (cola de canciones) ─────────────────────────────────────────

CREATE TABLE queue (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id           UUID          NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  title            TEXT          NOT NULL,
  artist           TEXT          NOT NULL,
  youtube_video_id TEXT,
  thumbnail_url    TEXT,
  table_id         UUID          REFERENCES tables(id) ON DELETE SET NULL,
  bid_amount       INT           NOT NULL DEFAULT 0 CHECK (bid_amount >= 0),
  position         INT           NOT NULL,
  dedication       TEXT,
  status           queue_status  NOT NULL DEFAULT 'queued',
  added_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  played_at        TIMESTAMPTZ
);

-- ── Tabla: votes ──────────────────────────────────────────────────────────────

CREATE TABLE votes (
  id         UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id   UUID       NOT NULL REFERENCES queue(id) ON DELETE CASCADE,
  table_id   UUID       NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  vote_type  vote_type  NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(queue_id, table_id)
);

-- ── Tabla: chat_messages ──────────────────────────────────────────────────────

CREATE TABLE chat_messages (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id       UUID          NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  table_id     UUID          REFERENCES tables(id) ON DELETE SET NULL,
  message      TEXT          NOT NULL CHECK (char_length(message) <= 280),
  message_type message_type  NOT NULL DEFAULT 'msg',
  is_pinned    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Tabla: credits_transactions ───────────────────────────────────────────────

CREATE TABLE credits_transactions (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id       UUID              NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  table_id     UUID              NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  amount       INT               NOT NULL,
  type         transaction_type  NOT NULL,
  reference    TEXT,
  qr_code      TEXT,
  verified_by  TEXT,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── Tabla: waiters (meseros) ──────────────────────────────────────────────────

CREATE TABLE waiters (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id     UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  phone      TEXT,
  pin        TEXT        NOT NULL CHECK (char_length(pin) = 4),
  shift      TEXT        NOT NULL DEFAULT 'full',
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: menu_categories ────────────────────────────────────────────────────

CREATE TABLE menu_categories (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id     UUID  NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  name       TEXT  NOT NULL,
  emoji      TEXT  NOT NULL DEFAULT '🍽️',
  sort_order INT   NOT NULL DEFAULT 0
);

-- ── Tabla: menu_subcategories ─────────────────────────────────────────────────

CREATE TABLE menu_subcategories (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID  NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name        TEXT  NOT NULL,
  sort_order  INT   NOT NULL DEFAULT 0
);

-- ── Tabla: menu_items ─────────────────────────────────────────────────────────

CREATE TABLE menu_items (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcategory_id UUID    NOT NULL REFERENCES menu_subcategories(id) ON DELETE CASCADE,
  bar_id         UUID    NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  price          INT     NOT NULL CHECK (price >= 0),
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT     NOT NULL DEFAULT 0
);

-- ── Tabla: orders ─────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id     UUID         NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  table_id   UUID         NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  items      JSONB        NOT NULL DEFAULT '[]',
  total      INT          NOT NULL DEFAULT 0 CHECK (total >= 0),
  status     order_status NOT NULL DEFAULT 'pending',
  waiter_id  UUID         REFERENCES waiters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla: ads ────────────────────────────────────────────────────────────────

CREATE TABLE ads (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id           UUID    NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  emoji            TEXT    NOT NULL DEFAULT '📢',
  title            TEXT    NOT NULL,
  subtitle         TEXT,
  color            TEXT    NOT NULL DEFAULT '#00E5FF',
  duration_seconds INT     NOT NULL DEFAULT 8,
  is_own           BOOLEAN NOT NULL DEFAULT TRUE,
  company_name     TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT     NOT NULL DEFAULT 0
);

-- ── Tabla: genres ─────────────────────────────────────────────────────────────

CREATE TABLE genres (
  id     UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id UUID  NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  name   TEXT  NOT NULL,
  emoji  TEXT  NOT NULL DEFAULT '🎵',
  color  TEXT  NOT NULL DEFAULT '#00E5FF'
);

-- ── Tabla: genre_songs ────────────────────────────────────────────────────────

CREATE TABLE genre_songs (
  id               UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  genre_id         UUID  NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  title            TEXT  NOT NULL,
  artist           TEXT  NOT NULL,
  youtube_video_id TEXT
);

-- ── Tabla: favorites ──────────────────────────────────────────────────────────

CREATE TABLE favorites (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id           UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  artist           TEXT        NOT NULL,
  youtube_video_id TEXT,
  times_played     INT         NOT NULL DEFAULT 0,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: blocked_songs (vetadas) ────────────────────────────────────────────

CREATE TABLE blocked_songs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id     UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  artist     TEXT        NOT NULL,
  blocked_by TEXT        NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: activity_log ───────────────────────────────────────────────────────

CREATE TABLE activity_log (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id     UUID        NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  actor      TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  detail     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: bar_stats (KPIs diarios) ──────────────────────────────────────────

CREATE TABLE bar_stats (
  id                 UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id             UUID  NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  date               DATE  NOT NULL,
  total_bids         INT   NOT NULL DEFAULT 0,
  total_songs        INT   NOT NULL DEFAULT 0,
  total_credits_sold INT   NOT NULL DEFAULT 0,
  active_tables      INT   NOT NULL DEFAULT 0,
  peak_tables        INT   NOT NULL DEFAULT 0,
  UNIQUE(bar_id, date)
);

-- ── Índices ───────────────────────────────────────────────────────────────────

-- Queue: consultar cola activa de un bar ordenada
CREATE INDEX idx_queue_bar_status_position  ON queue (bar_id, status, position);
CREATE INDEX idx_queue_bar_playing          ON queue (bar_id, status) WHERE status = 'playing';

-- Chat: feed por bar
CREATE INDEX idx_chat_bar_created           ON chat_messages (bar_id, created_at DESC);
CREATE INDEX idx_chat_bar_pinned            ON chat_messages (bar_id, is_pinned) WHERE is_pinned = TRUE;

-- Transacciones de créditos
CREATE INDEX idx_credits_tx_bar_table       ON credits_transactions (bar_id, table_id, created_at DESC);

-- Activity log
CREATE INDEX idx_activity_bar_created       ON activity_log (bar_id, created_at DESC);

-- Orders
CREATE INDEX idx_orders_bar_status          ON orders (bar_id, status, created_at DESC);
CREATE INDEX idx_orders_table               ON orders (table_id, created_at DESC);

-- Tables
CREATE INDEX idx_tables_bar_active          ON tables (bar_id, is_active);

-- Votes
CREATE INDEX idx_votes_queue                ON votes (queue_id);

-- ── Trigger: updated_at automático ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bars_updated_at
  BEFORE UPDATE ON bars
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
