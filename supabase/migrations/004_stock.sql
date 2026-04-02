-- ============================================================================
-- MIGRATION 004 — Stock & Inventaire
-- MobilStock SaaS — Supabase/PostgreSQL
-- ⚠️  Dépend de : 001, 002, 003
-- ============================================================================

-- ============================================================================
-- ENUM: inventory_reason (Raisons des mouvements de stock)
-- ============================================================================

CREATE TYPE inventory_reason AS ENUM (
  'initial_entry',      -- Entrée initiale
  'purchase',           -- Achat fournisseur
  'sale',               -- Vente
  'adjustment',         -- Ajustement/Correction
  'damage',             -- Dégât/Perte
  'return',             -- Retour client
  'repair',             -- Réparation/Remplacement
  'inventory_check',    -- Inventaire physique
  'other'               -- Autre
);

-- ============================================================================
-- STOCK_ITEMS (Articles en stock)
-- ============================================================================

CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,

  -- Infos produit
  brand VARCHAR(100) NOT NULL,          -- marque (Apple, Samsung...)
  series VARCHAR(100),                   -- série (iPhone, Galaxy S...)
  model VARCHAR(100) NOT NULL,           -- modèle (iPhone 13, S21...)
  part_type VARCHAR(100) NOT NULL,       -- typePiece (Écran, Batterie...)
  name VARCHAR(255) NOT NULL,            -- nom descriptif complet
  sku VARCHAR(100),                      -- code article interne

  -- Double tarification
  price_client DECIMAL(10, 2) NOT NULL,
  price_technician DECIMAL(10, 2) NOT NULL,

  -- Inventaire
  quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  location_code VARCHAR(50),             -- emplacement physique (A1-03...)

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- STOCK_ADJUSTMENTS (Traçabilité de tous les mouvements de stock)
-- ============================================================================

CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,

  quantity_delta INT NOT NULL,           -- +10 entrée, -3 vente, etc.
  reason inventory_reason NOT NULL,
  notes TEXT,

  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_stock_boutique ON stock_items(boutique_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stock_sku ON stock_items(boutique_id, sku);
CREATE INDEX idx_stock_model ON stock_items(boutique_id, model);
CREATE INDEX idx_stock_brand ON stock_items(boutique_id, brand);
CREATE INDEX idx_adjustments_boutique ON stock_adjustments(boutique_id);
CREATE INDEX idx_adjustments_item ON stock_adjustments(stock_item_id);
CREATE INDEX idx_adjustments_date ON stock_adjustments(created_at);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE TRIGGER tr_stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO _migrations (filename) VALUES ('004_stock.sql')
ON CONFLICT DO NOTHING;
