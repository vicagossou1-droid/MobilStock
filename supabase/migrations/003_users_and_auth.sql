-- ============================================================================
-- MIGRATION 003 — Users & Auth
-- MobilStock SaaS — Supabase/PostgreSQL
-- ⚠️  Dépend de : 001, 002
--
-- IMPORTANT SUPABASE:
-- On NE crée PAS de table "users" custom avec password_hash.
-- Supabase Auth gère l'auth nativement via auth.users.
-- Notre table "profiles" étend auth.users avec nos métadonnées métier.
-- ============================================================================

-- ============================================================================
-- PROFILES (Extension de auth.users de Supabase)
-- Créé automatiquement via trigger quand un user s'inscrit
-- ============================================================================

CREATE TABLE profiles (
  -- Même UUID que auth.users (pas de PK séparée)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- USER_BOUTIQUE_ROLES (Relation User ↔ Boutique avec rôle)
-- Clé du multi-tenant : un user peut appartenir à plusieurs boutiques
-- ============================================================================

CREATE TABLE user_boutique_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Dénormalisé pour perf (mis à jour par trigger)
  sales_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, boutique_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_boutique ON user_boutique_roles(boutique_id, role)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_user ON user_boutique_roles(user_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGER: Créer un profil automatiquement à l'inscription Supabase Auth
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_user_roles_updated_at
  BEFORE UPDATE ON user_boutique_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO _migrations (filename) VALUES ('003_users_and_auth.sql')
ON CONFLICT DO NOTHING;
