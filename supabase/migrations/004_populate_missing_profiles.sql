-- ============================================================================
-- MIGRATION 004 — Populate Missing Profiles
-- ============================================================================

-- Insert profiles for any auth.users that don't have a profile yet
INSERT INTO profiles (id, full_name, avatar_url, is_active)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.raw_user_meta_data->>'avatar_url',
  true
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
AND au.deleted_at IS NULL;

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO _migrations (filename) VALUES ('004_populate_missing_profiles.sql')
ON CONFLICT DO NOTHING;
