-- File: database/audit/01_create_user_audit.sql
-- Latest Update: July 24, 2026

-- Setup User Audit Table (login/logout sessions + general activity)
-- Depends on: auth_module.profiles (database/auth/01_create_profiles.sql)

CREATE TABLE IF NOT EXISTS public.user_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_profiles_id UUID REFERENCES auth_module.profiles(id) ON DELETE SET NULL,
    login_time TIMESTAMP WITH TIME ZONE,
    logout_time TIMESTAMP WITH TIME ZONE,
    recorded_activity TEXT, -- e.g. 'booking', 'rating', 'CRUD'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (logout_time IS NULL OR login_time IS NULL OR logout_time >= login_time)
);

CREATE INDEX IF NOT EXISTS idx_user_audit_profiles_id ON public.user_audit (audit_profiles_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_created_at ON public.user_audit (created_at DESC);

-- RLS Policies
-- Rows are written by the backend (service role, which bypasses RLS), so
-- there is no INSERT policy for regular users here.
ALTER TABLE public.user_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit history" ON public.user_audit;
CREATE POLICY "Users can view their own audit history" ON public.user_audit
    FOR SELECT USING (auth.uid() = audit_profiles_id);