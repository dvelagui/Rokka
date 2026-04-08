-- ============================================================
-- SEED — Bar La Noche (datos de ejemplo para desarrollo)
-- ============================================================

-- ── Bar ───────────────────────────────────────────────────────────────────────

INSERT INTO bars (id, name, emoji, slug, config) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bar La Noche',
  '🌙',
  'la-noche',
  '{
    "volumen_default": 75,
    "max_mesas": 15,
    "avg_song_duration": 210,
    "limite_pujas": 500,
    "creditos_por_puja_minimo": 50,
    "max_canciones_por_mesa": 3,
    "chat_habilitado": true,
    "pedidos_habilitado": true
  }'
);

-- ── Meseros ────────────────────────────────────────────────────────────────────

INSERT INTO waiters (id, bar_id, name, phone, pin, shift) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Carlos Díaz',   '3001234567', '1234', 'noche'),
  ('b1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Diana Muñoz',   '3109876543', '5678', 'tarde');

-- ── Mesas ─────────────────────────────────────────────────────────────────────
-- 6 activas (con créditos variados), 2 sin activar, 1 baneada, 1 deshabilitada

INSERT INTO tables (id, bar_id, number, label, is_active, is_banned, session_token, credits, connected_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',  1, 'Mesa 1',  TRUE,  FALSE, 'tok-mesa-01', 450, NOW() - INTERVAL '1 hour'),
  ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',  2, 'Mesa 2',  TRUE,  FALSE, 'tok-mesa-02', 200, NOW() - INTERVAL '45 min'),
  ('c1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',  3, 'Mesa 3',  TRUE,  FALSE, 'tok-mesa-03', 100, NOW() - INTERVAL '30 min'),
  ('c1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001',  4, 'Mesa 4',  TRUE,  FALSE, 'tok-mesa-04', 350, NOW() - INTERVAL '2 hours'),
  ('c1000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001',  5, 'Mesa 5',  TRUE,  FALSE, 'tok-mesa-05',  50, NOW() - INTERVAL '20 min'),
  ('c1000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001',  6, 'VIP 1',   TRUE,  FALSE, 'tok-vip-01',  800, NOW() - INTERVAL '3 hours'),
  ('c1000000-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001',  7, 'Mesa 7',  TRUE,  FALSE, NULL,            0, NULL),
  ('c1000000-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001',  8, 'Mesa 8',  TRUE,  FALSE, NULL,            0, NULL),
  ('c1000000-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001',  9, 'Mesa 9',  FALSE, FALSE, NULL,            0, NULL),
  ('c1000000-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 10, 'Mesa 10', TRUE,  TRUE,  'tok-banned',    0, NULL);

-- ── Cola de canciones ─────────────────────────────────────────────────────────

INSERT INTO queue (id, bar_id, table_id, title, artist, youtube_video_id, thumbnail_url, bid_amount, position, status, dedication) VALUES
  -- Sonando ahora
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000006', 'Tití Me Preguntó', 'Bad Bunny',
   'TDUISlqTWFI', 'https://i.ytimg.com/vi/TDUISlqTWFI/hqdefault.jpg',
   300, 0, 'playing', NULL),
  -- En cola (con pujas decrecientes)
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000004', 'Quevedo: Bzrp Music Sessions #52', 'Bizarrap & Quevedo',
   'p_4_MiKbB1k', 'https://i.ytimg.com/vi/p_4_MiKbB1k/hqdefault.jpg',
   200, 1, 'queued', '¡Para el cumple de Juanchi!'),
  ('d1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'Hawái', 'Maluma',
   'N-PFsHzQNT4', 'https://i.ytimg.com/vi/N-PFsHzQNT4/hqdefault.jpg',
   150, 2, 'queued', NULL),
  ('d1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000002', 'Dakiti', 'Bad Bunny ft. Jhay Cortez',
   'PLX3PPQ4_E5U', 'https://i.ytimg.com/vi/PLX3PPQ4_E5U/hqdefault.jpg',
   100, 3, 'queued', NULL),
  ('d1000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000003', 'La Fouine', 'Karol G',
   NULL, NULL,
   0, 4, 'queued', 'Para las chicas 🔥');

-- ── Votos en la cola ──────────────────────────────────────────────────────────

INSERT INTO votes (queue_id, table_id, vote_type) VALUES
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'keep'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'keep'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000005', 'skip'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'keep'),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000006', 'skip');

-- ── Chat ──────────────────────────────────────────────────────────────────────

INSERT INTO chat_messages (bar_id, table_id, message, message_type, is_pinned, created_at) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', NULL,
   '🎉 ¡Bienvenidos a Bar La Noche! La noche acaba de empezar.', 'admin', TRUE, NOW() - INTERVAL '3 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Qué ambiente tan bueno hoy 🔥', 'msg', FALSE, NOW() - INTERVAL '2 hours 30 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004',
   '¡Pongan reggaetón! 🎵', 'msg', FALSE, NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', NULL,
   '🎵 Próxima canción: Quevedo Bzrp Session #52', 'system', FALSE, NOW() - INTERVAL '1 hour 45 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006',
   '💃', 'reaction', FALSE, NOW() - INTERVAL '1 hour 30 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002',
   'La mesa 2 recargó 200 créditos 💰', 'system', FALSE, NOW() - INTERVAL '1 hour'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Pedimos más shots para acá plz 🥃', 'msg', FALSE, NOW() - INTERVAL '45 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   '🔥🔥🔥', 'reaction', FALSE, NOW() - INTERVAL '30 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', NULL,
   '🎧 Ahora suena: Tití Me Preguntó — Bad Bunny', 'system', FALSE, NOW() - INTERVAL '15 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004',
   'Esa la pedimos nosotros! 👏', 'msg', FALSE, NOW() - INTERVAL '10 min');

-- ── Menú ──────────────────────────────────────────────────────────────────────

-- Categorías
INSERT INTO menu_categories (id, bar_id, name, emoji, sort_order) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Bebidas',   '🍺', 1),
  ('e1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Cócteles',  '🍹', 2),
  ('e1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Comidas',   '🍔', 3);

-- Subcategorías
INSERT INTO menu_subcategories (id, category_id, name, sort_order) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Cervezas',       1),
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Licores',         2),
  ('f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Sin alcohol',     3),
  ('f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', 'Clásicos',        1),
  ('f1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'Especiales',      2),
  ('f1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000003', 'Picadas',         1),
  ('f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000003', 'Snacks & Extras', 2);

-- Items del menú (precios en COP)
INSERT INTO menu_items (subcategory_id, bar_id, name, price, sort_order) VALUES
  -- Cervezas
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Águila 330ml',     8000,  1),
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Águila Light',     8000,  2),
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Club Colombia',    9000,  3),
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Heineken',        11000,  4),
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Corona',          12000,  5),
  -- Licores
  ('f1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Shot Aguardiente',  6000, 1),
  ('f1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Shot Tequila',      8000, 2),
  ('f1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ron Medellín 50ml', 7000, 3),
  ('f1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Whisky JD 50ml',   12000, 4),
  -- Sin alcohol
  ('f1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Agua 600ml',        3000, 1),
  ('f1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jugo Natural',      6000, 2),
  ('f1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Gaseosa 350ml',     4000, 3),
  -- Cócteles clásicos
  ('f1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mojito',           18000, 1),
  ('f1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Margarita',        18000, 2),
  ('f1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Daiquiri Fresa',   18000, 3),
  ('f1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Gin Tonic',        20000, 4),
  -- Cócteles especiales
  ('f1000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'La Noche Especial', 25000, 1),
  ('f1000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Blue Moon',         28000, 2),
  ('f1000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sangría House',     22000, 3),
  -- Picadas
  ('f1000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Alitas BBQ x8',    32000, 1),
  ('f1000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Nachos con Guac',  22000, 2),
  ('f1000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tabla de Quesos',  35000, 3),
  ('f1000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Chorizo x3',       18000, 4),
  -- Snacks
  ('f1000000-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Papas Fritas',      9000, 1),
  ('f1000000-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Maní Picante',      5000, 2),
  ('f1000000-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Palomitas',         7000, 3);

-- ── Géneros musicales ──────────────────────────────────────────────────────────

INSERT INTO genres (id, bar_id, name, emoji, color) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Reggaetón',    '🔥', '#FF4500'),
  ('a3000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Salsa',        '💃', '#FFD700'),
  ('a3000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Electrónica',  '⚡', '#00E5FF'),
  ('a3000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pop Latino',   '🎤', '#D500F9'),
  ('a3000000-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Rock',         '🎸', '#FF1744'),
  ('a3000000-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Vallenato',    '🪗', '#00E676');

-- Canciones por género
INSERT INTO genre_songs (genre_id, title, artist, youtube_video_id) VALUES
  -- Reggaetón
  ('a3000000-0000-0000-0000-000000000001', 'Tití Me Preguntó',       'Bad Bunny',             'TDUISlqTWFI'),
  ('a3000000-0000-0000-0000-000000000001', 'Dakiti',                  'Bad Bunny ft. Jhay',   'PLX3PPQ4_E5U'),
  ('a3000000-0000-0000-0000-000000000001', 'Hawái',                   'Maluma',                'N-PFsHzQNT4'),
  ('a3000000-0000-0000-0000-000000000001', 'Bzrp Session #52',        'Bizarrap & Quevedo',   'p_4_MiKbB1k'),
  ('a3000000-0000-0000-0000-000000000001', 'MAMIII',                  'Becky G & Karol G',    '3hLcXmxv_qs'),
  -- Salsa
  ('a3000000-0000-0000-0000-000000000002', 'El Cantante',             'Héctor Lavoe',          'NULL'),
  ('a3000000-0000-0000-0000-000000000002', 'Valió La Pena',           'Marc Anthony',          'NULL'),
  ('a3000000-0000-0000-0000-000000000002', 'La Vida es un Carnaval',  'Celia Cruz',            'NULL'),
  ('a3000000-0000-0000-0000-000000000002', 'Mi Gente',                'J Balvin',              'mRcqpYFdxjI'),
  -- Electrónica
  ('a3000000-0000-0000-0000-000000000003', 'Blinding Lights',         'The Weeknd',            '4NRXx6U8ABQ'),
  ('a3000000-0000-0000-0000-000000000003', 'Levitating',              'Dua Lipa',              'TUVcZfQe-Kw'),
  ('a3000000-0000-0000-0000-000000000003', 'One More Time',           'Daft Punk',             'NULL'),
  -- Pop Latino
  ('a3000000-0000-0000-0000-000000000004', 'Shakira: BZRP Session #53', 'Bizarrap & Shakira', 'v1kLB5YEMxM'),
  ('a3000000-0000-0000-0000-000000000004', 'Bzrp Session #49',        'Bizarrap & Paulo Londra', 'NULL'),
  ('a3000000-0000-0000-0000-000000000004', 'Gasolina',                'Daddy Yankee',          'NULL'),
  -- Rock
  ('a3000000-0000-0000-0000-000000000005', 'Bohemian Rhapsody',       'Queen',                 'NULL'),
  ('a3000000-0000-0000-0000-000000000005', 'Livin on a Prayer',       'Bon Jovi',              'NULL'),
  ('a3000000-0000-0000-0000-000000000005', 'Sweet Child O Mine',      'Guns N Roses',          'NULL'),
  -- Vallenato
  ('a3000000-0000-0000-0000-000000000006', 'La Bicicleta',            'Carlos Vives & Shakira','NULL'),
  ('a3000000-0000-0000-0000-000000000006', 'El Amor de Mi Vida',      'Carlos Vives',          'NULL');

-- ── Favoritas del bar ─────────────────────────────────────────────────────────

INSERT INTO favorites (bar_id, title, artist, youtube_video_id, times_played) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tití Me Preguntó',  'Bad Bunny',   'TDUISlqTWFI', 42),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Hawái',             'Maluma',      'N-PFsHzQNT4', 38),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Blinding Lights',   'The Weeknd',  '4NRXx6U8ABQ', 27),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Bzrp Session #52',  'Bizarrap',    'p_4_MiKbB1k', 31);

-- ── Canciones bloqueadas ──────────────────────────────────────────────────────

INSERT INTO blocked_songs (bar_id, title, artist, blocked_by, reason) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tusa', 'Karol G & Nicki Minaj', 'Admin', 'Demasiado repetitiva esta semana'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Despacito', 'Luis Fonsi', 'Admin', 'Vetada por el DJ');

-- ── Anuncios ──────────────────────────────────────────────────────────────────

INSERT INTO ads (bar_id, emoji, title, subtitle, color, duration_seconds, is_own, company_name, sort_order) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001',
   '🎤', '¡Miércoles de Karaoke!', 'Todos los miércoles desde las 9pm. ¡Anótate!',
   '#D500F9', 10, TRUE, NULL, 1),
  ('a1b2c3d4-0000-0000-0000-000000000001',
   '🥃', '2x1 en shots hasta las 10pm', 'Tequila, Aguardiente y Ron. ¡Corre!',
   '#FF4500', 8, TRUE, NULL, 2),
  ('a1b2c3d4-0000-0000-0000-000000000001',
   '🍕', 'Pizza Bar El Vecino', 'Pide delivery mientras disfrutas la noche',
   '#FFD700', 8, FALSE, 'Pizza Bar El Vecino', 3);

-- ── Transacciones de créditos (historial) ────────────────────────────────────

INSERT INTO credits_transactions (bar_id, table_id, amount, type, reference, verified_by, created_at) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',  500, 'recharge', 'QR:RC4F8A', 'Carlos Díaz',  NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', -300, 'bid',      'Puja: Tití Me Preguntó', NULL, NOW() - INTERVAL '1 hour 50 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 1000, 'recharge', 'QR:RC9X2B', 'Diana Muñoz',  NOW() - INTERVAL '3 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', -200, 'bid',      'Puja: Bzrp #52', NULL,        NOW() - INTERVAL '2 hours 30 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004',  500, 'recharge', 'QR:RC7K3M', 'Carlos Díaz',  NOW() - INTERVAL '2 hours 10 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', -150, 'bid',      'Puja: Hawái', NULL,          NOW() - INTERVAL '1 hour 30 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002',  300, 'recharge', 'QR:RC2A9Z', 'Diana Muñoz',  NOW() - INTERVAL '1 hour'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', -100, 'bid',      'Puja: Dakiti', NULL,         NOW() - INTERVAL '50 min');

-- ── Activity log ──────────────────────────────────────────────────────────────

INSERT INTO activity_log (bar_id, actor, action, detail, created_at) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Admin',   'bar_opened',       'Bar La Noche abrió sus puertas',                    NOW() - INTERVAL '4 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sistema', 'song_started',     'Tití Me Preguntó — Bad Bunny',                      NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Mesa 6',  'song_requested',   'Bzrp Session #52 — Bizarrap & Quevedo (puja: 200)', NOW() - INTERVAL '1 hour 50 min'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Mesa 1',  'credits_recharged','Mesa recargó 500 créditos. Ref: QR:RC4F8A',         NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Carlos Díaz', 'waiter_action','Recarga validada Mesa 1 — 500 créditos',            NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Admin',   'table_banned',     'Mesa 10 bloqueada por comportamiento inapropiado',  NOW() - INTERVAL '1 hour');

-- ── Bar Stats ─────────────────────────────────────────────────────────────────

INSERT INTO bar_stats (bar_id, date, total_bids, total_songs, total_credits_sold, active_tables, peak_tables) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', CURRENT_DATE,       750, 1, 2300, 6, 8),
  ('a1b2c3d4-0000-0000-0000-000000000001', CURRENT_DATE - 1,  1200, 28, 5400, 9, 12),
  ('a1b2c3d4-0000-0000-0000-000000000001', CURRENT_DATE - 2,   980, 22, 4200, 8, 11),
  ('a1b2c3d4-0000-0000-0000-000000000001', CURRENT_DATE - 7,  1500, 35, 7100, 12, 14);
