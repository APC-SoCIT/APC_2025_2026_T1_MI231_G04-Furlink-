-- File: database/auth/02_create_admin_helper.sql
-- Latest Update: July 24, 2026

-- Setup Admin Check Helper
-- Reused by any RLS policy (storage or table) that needs to grant
-- Administrators full visibility. STABLE lets Postgres cache the result
-- once per statement instead of re-querying profiles per row.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth_module.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;