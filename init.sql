-- ============================================================================
-- Cardápio Digital (Projeto Ei-001) — Script de inicialização PostgreSQL
-- Compatível com PostgreSQL 14+
-- ============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- busca textual (opcional)

-- ============================================================================
-- TABELAS
-- ============================================================================

-- Usuários (gerentes / admins)
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    name            VARCHAR(120)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('admin', 'manager', 'customer')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tags dinâmicas (Vegano, Sem Glúten, etc.)
-- name é JSONB com chaves de idioma: {"pt": "...", "en": "...", "es": "..."}
CREATE TABLE IF NOT EXISTS tags (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            JSONB           NOT NULL,
    color           VARCHAR(7)      NOT NULL DEFAULT '#A0522D',
    icon            VARCHAR(50)     NOT NULL DEFAULT 'tag',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Produtos (pratos)
-- name e description são JSONB i18n
CREATE TABLE IF NOT EXISTS produtos (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            JSONB           NOT NULL,
    description     JSONB           NOT NULL DEFAULT '{}'::jsonb,
    category        VARCHAR(120)    NOT NULL,
    available       BOOLEAN         NOT NULL DEFAULT TRUE,
    image_path      TEXT,
    images          TEXT[]          NOT NULL DEFAULT '{}',
    prep_time       INTEGER,        -- minutos
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Preço (relação 1:N com produto, permite histórico)
CREATE TABLE IF NOT EXISTS preco (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    valor           NUMERIC(10,2)   NOT NULL CHECK (valor >= 0),
    promo           BOOLEAN         NOT NULL DEFAULT FALSE,
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    valid_to        TIMESTAMPTZ,
    UNIQUE (produto_id, valid_from)
);

-- Tamanhos de porção (Individual / Para compartilhar) com preços diferentes
CREATE TABLE IF NOT EXISTS portion_sizes (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    label           JSONB           NOT NULL,    -- i18n
    price           NUMERIC(10,2)   NOT NULL CHECK (price >= 0),
    sort_order      INTEGER         NOT NULL DEFAULT 0
);

-- Ingredientes principais (i18n)
CREATE TABLE IF NOT EXISTS ingredients (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    name            JSONB           NOT NULL,    -- i18n
    sort_order      INTEGER         NOT NULL DEFAULT 0
);

-- Relação N:N produto <-> tag
CREATE TABLE IF NOT EXISTS produto_tag (
    produto_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tag_id          UUID            NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (produto_id, tag_id)
);

-- Harmonização sugerida (auto-relacionamento N:N entre produtos)
CREATE TABLE IF NOT EXISTS produto_pairing (
    produto_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    pairing_id      UUID            NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    PRIMARY KEY (produto_id, pairing_id),
    CHECK (produto_id <> pairing_id)
);

-- Uploads (para tracking de imagens armazenadas)
CREATE TABLE IF NOT EXISTS uploads (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path        TEXT            NOT NULL UNIQUE,
    original_filename   TEXT,
    content_type        VARCHAR(100),
    size_bytes          BIGINT,
    is_deleted          BOOLEAN         NOT NULL DEFAULT FALSE,
    uploaded_by         UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_produtos_category   ON produtos (category);
CREATE INDEX IF NOT EXISTS idx_produtos_available  ON produtos (available);
CREATE INDEX IF NOT EXISTS idx_produtos_name_gin   ON produtos USING GIN (name jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_produtos_desc_gin   ON produtos USING GIN (description jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_tags_name_gin       ON tags     USING GIN (name jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_preco_produto       ON preco (produto_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_portion_produto     ON portion_sizes (produto_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ingredients_produto ON ingredients   (produto_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_uploads_active      ON uploads (is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- TRIGGER: updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated     ON users;
DROP TRIGGER IF EXISTS trg_produtos_updated  ON produtos;
CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_produtos_updated  BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- VIEW de leitura: produto com preço atual
-- ============================================================================
CREATE OR REPLACE VIEW v_produtos_atuais AS
SELECT
    p.id, p.name, p.description, p.category, p.available,
    p.image_path, p.images, p.prep_time, p.created_at, p.updated_at,
    pr.valor   AS price,
    pr.promo   AS promo,
    COALESCE(
      (SELECT array_agg(pt.tag_id) FROM produto_tag pt WHERE pt.produto_id = p.id),
      ARRAY[]::UUID[]
    ) AS tag_ids,
    COALESCE(
      (SELECT array_agg(pp.pairing_id) FROM produto_pairing pp WHERE pp.produto_id = p.id),
      ARRAY[]::UUID[]
    ) AS pairing_ids
FROM produtos p
LEFT JOIN LATERAL (
    SELECT valor, promo
    FROM preco
    WHERE produto_id = p.id
      AND valid_from <= NOW()
      AND (valid_to IS NULL OR valid_to > NOW())
    ORDER BY valid_from DESC
    LIMIT 1
) pr ON TRUE;

-- ============================================================================
-- SEED: admin + tags + produtos demo
-- senha "admin123" → bcrypt hash gerado pelo backend (substitua se quiser)
-- ============================================================================
INSERT INTO users (email, password_hash, name, role)
VALUES (
    'admin@cardapio.com',
    '$2b$12$KIXuhxTQdF1Oqx/VeBXkRO7BQ8Yj1LhQF0w5K9hCaQ6V4F8M9Yc0e',  -- placeholder; use o hash real
    'Gerente',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Tags
WITH inserted_tags AS (
  INSERT INTO tags (id, name, color, icon) VALUES
    (gen_random_uuid(), '{"pt":"Vegano","en":"Vegan","es":"Vegano"}'::jsonb,                    '#205427', 'leaf'),
    (gen_random_uuid(), '{"pt":"Sem Lactose","en":"Lactose-Free","es":"Sin Lactosa"}'::jsonb,    '#A0522D', 'milk-off'),
    (gen_random_uuid(), '{"pt":"Sem Glúten","en":"Gluten-Free","es":"Sin Gluten"}'::jsonb,       '#303226', 'wheat-off'),
    (gen_random_uuid(), '{"pt":"Picante","en":"Spicy","es":"Picante"}'::jsonb,                   '#DC2626', 'flame'),
    (gen_random_uuid(), '{"pt":"Novo","en":"New","es":"Nuevo"}'::jsonb,                          '#D97706', 'sparkles')
  RETURNING id, name
) SELECT * FROM inserted_tags;

-- Produto exemplo: Hambúrguer Artesanal
WITH p AS (
  INSERT INTO produtos (name, description, category, available, image_path, prep_time)
  VALUES (
    '{"pt":"Hambúrguer Artesanal da Casa","en":"House Artisan Burger","es":"Hamburguesa Artesanal de la Casa"}'::jsonb,
    '{"pt":"Pão brioche, blend 180g, queijo cheddar, bacon crocante e molho especial.","en":"Brioche bun, 180g blend, cheddar, crispy bacon, and house sauce.","es":"Pan brioche, blend 180g, queso cheddar, tocino crujiente y salsa de la casa."}'::jsonb,
    'Burgers',
    TRUE,
    'https://images.unsplash.com/photo-1550547660-d9450f859349?q=85&w=900',
    20
  ) RETURNING id
)
INSERT INTO preco (produto_id, valor, promo)
SELECT id, 42.90, TRUE FROM p;

-- Exemplo de produto com porções e ingredientes (Salada Buddha Vegana)
WITH p AS (
  INSERT INTO produtos (name, description, category, available, prep_time)
  VALUES (
    '{"pt":"Salada Buddha Vegana","en":"Vegan Buddha Bowl","es":"Buddha Bowl Vegano"}'::jsonb,
    '{"pt":"Quinoa, grão-de-bico, abacate, pepino e tahine de limão.","en":"Quinoa, chickpea, avocado, cucumber, and lemon tahini.","es":"Quinoa, garbanzos, aguacate, pepino y tahini de limón."}'::jsonb,
    'Saladas', TRUE, 12
  ) RETURNING id
), pr AS (
  INSERT INTO preco (produto_id, valor, promo)
  SELECT id, 36.00, FALSE FROM p
)
INSERT INTO portion_sizes (produto_id, label, price, sort_order)
SELECT id, '{"pt":"Individual","en":"Individual","es":"Individual"}'::jsonb,    36.00, 1 FROM p
UNION ALL
SELECT id, '{"pt":"Para compartilhar","en":"To share","es":"Para compartir"}'::jsonb, 62.00, 2 FROM p;

-- Vincular tags Vegan + Gluten-Free ao Buddha Bowl
INSERT INTO produto_tag (produto_id, tag_id)
SELECT pr.id, t.id
FROM produtos pr
CROSS JOIN tags t
WHERE pr.name->>'en' = 'Vegan Buddha Bowl'
  AND t.name->>'en' IN ('Vegan','Gluten-Free');

-- ============================================================================
-- EXEMPLOS DE QUERIES ÚTEIS
-- ============================================================================
-- 1) Buscar pratos disponíveis na categoria "Saladas" com tag "Vegan":
-- SELECT v.* FROM v_produtos_atuais v
-- JOIN produto_tag pt ON pt.produto_id = v.id
-- JOIN tags t        ON t.id = pt.tag_id
-- WHERE v.available AND v.category = 'Saladas' AND t.name->>'en' = 'Vegan';
--
-- 2) Busca textual i18n no nome (PT) usando GIN:
-- SELECT * FROM produtos
-- WHERE name @> '{"pt":"Hambúrguer Artesanal da Casa"}';
--
-- 3) Promoções ativas:
-- SELECT * FROM v_produtos_atuais WHERE promo IS TRUE;
