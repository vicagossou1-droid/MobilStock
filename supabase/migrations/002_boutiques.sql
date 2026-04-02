-- ============================================================================
-- MIGRATION 002 — Boutiques (Tenants)
-- MobilStock SaaS — Supabase/PostgreSQL
-- ⚠️  Dépend de : 001
-- ============================================================================

-- ============================================================================
-- BOUTIQUES (Tenants principaux)
-- ============================================================================

CREATE TABLE boutiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  stock_threshold INT NOT NULL DEFAULT 5,
  logo_url VARCHAR(500),
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- free, basic, pro, enterprise
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- BOUTIQUE CONFIG (Paramètres extensibles clé/valeur)
-- ============================================================================

CREATE TABLE boutique_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(boutique_id, config_key)
);

-- ============================================================================
-- SHOP ANNEXES (Succursales / annexes d'une boutique)
-- ============================================================================

CREATE TABLE shop_annexes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  manager_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_boutiques_active ON boutiques(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_boutique_config_key ON boutique_config(boutique_id, config_key);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_boutiques_updated_at
  BEFORE UPDATE ON boutiques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_boutique_config_updated_at
  BEFORE UPDATE ON boutique_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO _migrations (filename) VALUES ('002_boutiques.sql')
ON CONFLICT DO NOTHING;
