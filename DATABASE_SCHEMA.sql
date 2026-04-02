-- ============================================================================
-- MOBILSTOCK - PostgreSQL SaaS Database Schema
-- Multi-Tenant Architecture with Role-Based Access Control
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ============================================================================
-- 1. ENUMS (Roles, Statuses)
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',    -- Platform administrator (system-wide)
  'proprietaire',   -- Shop owner
  'gerant',         -- Manager
  'vendeur',        -- Sales associate
  'technicien'      -- Technician
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'mobile'
);

CREATE TYPE payment_operator AS ENUM (
  'Mixx',
  'Flooz',
  'custom'
);

CREATE TYPE sale_type AS ENUM (
  'catalogue',
  'libre'
);

CREATE TYPE client_type AS ENUM (
  'simple',
  'technicien'
);

CREATE TYPE inventory_reason AS ENUM (
  'initial_stock',
  'purchase',
  'sale',
  'adjustment',
  'damage',
  'loss',
  'return'
);

-- ============================================================================
-- 2. CORE PLATFORM TABLES
-- ============================================================================

-- Super admins (platform-level)
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Boutiques (Shops / Tenants)
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
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES super_admins(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- SaaS metadata
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- free, basic, pro, enterprise
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Boutique configuration (extensible settings)
CREATE TABLE boutique_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(boutique_id, config_key)
);

-- Shop annexes / branches
CREATE TABLE shop_annexes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  manager_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- ============================================================================
-- 3. USERS & AUTHENTICATION
-- ============================================================================

-- Users (can belong to multiple shops with different roles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Super admin flag (can manage platform)
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- User password credentials
CREATE TABLE user_passwords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  
  -- Password reset flow
  reset_token VARCHAR(255),
  reset_expires_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- User-to-Boutique role mapping (multi-tenant relationship)
CREATE TABLE user_boutique_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  
  -- Specific to role (e.g., not active for technicien)
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Sales count (denormalized for performance; kept in sync via triggers)
  sales_count INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(user_id, boutique_id)
);

-- User sessions (for multi-device support)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  ip_address INET,
  user_agent VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX user_sessions_user_id (user_id)
);

-- ============================================================================
-- 4. INVENTORY MANAGEMENT
-- ============================================================================

-- Stock items
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  
  -- Product info
  brand VARCHAR(100) NOT NULL,        -- marque (Apple, Samsung, etc.)
  series VARCHAR(100),                 -- série (iPhone, Galaxy S, etc.)
  model VARCHAR(100) NOT NULL,         -- modèle (iPhone 13, S21, etc.)
  part_type VARCHAR(100) NOT NULL,     -- typePiece (Écran, Batterie, etc.)
  name VARCHAR(255) NOT NULL,          -- nom descriptif
  sku VARCHAR(100),
  
  -- Pricing (dual tier)
  price_client DECIMAL(10, 2) NOT NULL,           -- prixClient
  price_technician DECIMAL(10, 2) NOT NULL,       -- prixTechnicien
  
  -- Inventory
  quantity_on_hand INT NOT NULL DEFAULT 0,
  location_code VARCHAR(50),           -- emplacement (A1-03, B2-01, etc.)
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_stock_boutique (boutique_id),
  INDEX idx_stock_sku (boutique_id, sku),
  INDEX idx_stock_model (boutique_id, model)
);

-- Stock adjustments (audit trail for inventory changes)
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  
  quantity_delta INT NOT NULL,           -- +10, -5, etc.
  reason inventory_reason NOT NULL,      -- why changed
  notes TEXT,
  
  -- Who made the change
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_adjustments_boutique (boutique_id),
  INDEX idx_adjustments_stock_item (stock_item_id),
  INDEX idx_adjustments_date (created_at)
);

-- ============================================================================
-- 5. SALES TRACKING
-- ============================================================================

-- Sales (transactions header)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  
  -- Sale metadata
  sale_number VARCHAR(50),              -- humanized: 2025-00001, etc.
  sale_type sale_type NOT NULL,         -- 'catalogue' or 'libre'
  client_type client_type NOT NULL,     -- 'simple' or 'technicien'
  
  -- Vendor
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Financial
  total_amount DECIMAL(12, 2) NOT NULL,
  
  -- Timestamps
  sale_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_sales_boutique (boutique_id),
  INDEX idx_sales_vendor (vendor_id),
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_type (sale_type)
);

-- Sale items (line items linking sales to stock)
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,    -- price at time of sale
  subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_sale_items_sale (sale_id),
  INDEX idx_sale_items_stock (stock_item_id)
);

-- Sale payments (payment method tracking)
CREATE TABLE sale_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  
  payment_method payment_method NOT NULL,    -- 'cash' or 'mobile'
  operator payment_operator,                  -- 'Mixx', 'Flooz' if mobile
  reference_number VARCHAR(100),              -- transaction ID
  
  amount DECIMAL(12, 2) NOT NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_payments_sale (sale_id),
  INDEX idx_payments_operator (operator)
);

-- ============================================================================
-- 6. PAYMENT ACCOUNTS (Mobile money / Bank accounts)
-- ============================================================================

CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  
  operator payment_operator NOT NULL,         -- Mixx, Flooz, custom
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(255),
  account_type VARCHAR(100),                  -- 'personnel', 'commercial'
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(boutique_id, operator, account_number),
  INDEX idx_accounts_boutique (boutique_id)
);

-- ============================================================================
-- 7. COMPATIBILITY SYSTEM (Shared knowledge, isolated by boutique)
-- ============================================================================

CREATE TABLE compatibilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  
  -- Master piece info
  piece_name VARCHAR(255) NOT NULL,
  piece_type VARCHAR(100),
  
  -- Supported models (JSON array or separate table - see below)
  -- e.g., ["iPhone 11", "iPhone 12", "iPhone 13"]
  supported_models TEXT[] NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(boutique_id, piece_name),
  INDEX idx_compat_boutique (boutique_id),
  INDEX idx_compat_piece (piece_name)
);

-- Alternative: Normalized compatibility mapping (if many models per piece)
CREATE TABLE compatibility_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compatibility_id UUID NOT NULL REFERENCES compatibilities(id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(compatibility_id, model_name)
);

-- ============================================================================
-- 8. AUDIT LOG (Change tracking for compliance)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID REFERENCES boutiques(id) ON DELETE SET NULL,
  
  -- Entity being changed
  entity_type VARCHAR(100) NOT NULL,    -- 'stock_item', 'sale', 'user', etc.
  entity_id UUID NOT NULL,
  
  -- What happened
  action VARCHAR(50) NOT NULL,          -- 'CREATE', 'UPDATE', 'DELETE'
  old_values JSONB,                     -- previous state (for updates)
  new_values JSONB,                     -- new state
  
  -- Who did it
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_audit_boutique (boutique_id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_user (changed_by),
  INDEX idx_audit_date (created_at)
);

-- ============================================================================
-- 9. ANALYTICS & REPORTING (Denormalized tables for performance)
-- ============================================================================

-- Daily sales summary (updated via triggers or scheduled job)
CREATE TABLE daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  
  total_sales INT NOT NULL DEFAULT 0,           -- number of transactions
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cash_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  mobile_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  items_sold INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(boutique_id, sale_date),
  INDEX idx_summary_boutique (boutique_id),
  INDEX idx_summary_date (sale_date)
);

-- ============================================================================
-- 10. CONSTRAINTS & TRIGGERS
-- ============================================================================

-- Trigger: Auto-update user_boutique_roles.sales_count after each sale
CREATE OR REPLACE FUNCTION update_vendor_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_boutique_roles
  SET sales_count = (
    SELECT COUNT(*) FROM sales
    WHERE vendor_id = NEW.vendor_id
    AND boutique_id = NEW.boutique_id
    AND deleted_at IS NULL
  ),
  updated_at = NOW()
  WHERE user_id = NEW.vendor_id
  AND boutique_id = NEW.boutique_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_sales_count
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_vendor_sales_count();

-- Trigger: Auto-decrement stock when sale_item is created
CREATE OR REPLACE FUNCTION decrement_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stock_items
  SET quantity_on_hand = quantity_on_hand - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.stock_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_decrement_stock
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION decrement_stock_on_sale();

-- Trigger: Record audit log on stock_items changes
CREATE OR REPLACE FUNCTION audit_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    boutique_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values,
    changed_by,
    created_at
  ) VALUES (
    NEW.boutique_id,
    'stock_item',
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    NULL,  -- Set by application
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_stock
AFTER INSERT OR UPDATE ON stock_items
FOR EACH ROW
EXECUTE FUNCTION audit_stock_changes();

-- Trigger: Update daily_sales_summary on new sale
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_sales_summary (
    boutique_id,
    sale_date,
    total_sales,
    total_amount,
    items_sold
  ) VALUES (
    NEW.boutique_id,
    DATE(NEW.sale_date),
    1,
    NEW.total_amount,
    (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = NEW.id)
  )
  ON CONFLICT (boutique_id, sale_date)
  DO UPDATE SET
    total_sales = total_sales + 1,
    total_amount = total_amount + NEW.total_amount,
    items_sold = items_sold + (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = NEW.id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_summary
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_daily_summary();

-- ============================================================================
-- 11. INDEXES (Performance optimization)
-- ============================================================================

-- User lookups
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- Boutique lookups
CREATE INDEX idx_boutiques_active ON boutiques(is_active) WHERE deleted_at IS NULL;

-- Role-based queries
CREATE INDEX idx_user_roles_active ON user_boutique_roles(boutique_id, role)
WHERE deleted_at IS NULL;

-- Session cleanup queries
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Date-range queries (common in reporting)
CREATE INDEX idx_sales_date_range ON sales(boutique_id, sale_date)
WHERE deleted_at IS NULL;

CREATE INDEX idx_adjustments_date_range ON stock_adjustments(boutique_id, created_at);

-- Payment lookups
CREATE INDEX idx_payments_method ON sale_payments(payment_method);

-- Soft delete filters
CREATE INDEX idx_stock_active ON stock_items(boutique_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_active ON sale_items(sale_id);
CREATE INDEX idx_compat_active ON compatibilities(boutique_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 12. PERMISSIONS (Row-Level Security - Optional, requires pg_row_security)
-- ============================================================================

-- Example: Enforce boutique isolation
-- ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY boutique_isolation ON stock_items
--   USING (boutique_id = current_setting('app.current_boutique_id')::uuid);

-- ============================================================================
-- 13. INITIAL DATA (Optional seed)
-- ============================================================================

-- Insert super admin (change password immediately in production)
INSERT INTO super_admins (email, full_name, password_hash, salt, is_active)
VALUES (
  'admin@mobilstock.com',
  'Platform Admin',
  'TODO_HASH_WITH_BCRYPT',
  'TODO_SALT',
  true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
