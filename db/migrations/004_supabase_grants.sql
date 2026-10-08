-- Migration 004: Supabase-specific grants — revoke access from anon/authenticated roles.
-- Guarded by IF EXISTS so this is a no-op on plain Postgres (RDS, Cloud SQL, self-hosted).

DO $$
BEGIN
  -- Revoke from 'anon' role if it exists (Supabase creates this)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon';
  END IF;

  -- Revoke from 'authenticated' role if it exists (Supabase creates this)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated';
  END IF;
END
$$;
