-- File: database/provider/01_create_sp_general_info.sql
-- Latest Update: July 27, 2026

-- Setup Service Provider Business Profile Table
-- Depends on: auth_module.profiles (database/auth/01_create_profiles.sql)

CREATE TABLE IF NOT EXISTS public.sp_general_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profiles_id UUID UNIQUE NOT NULL REFERENCES auth_module.profiles(id) ON DELETE CASCADE,
 
    business_name TEXT NOT NULL,
    business_bio VARCHAR(250) NOT NULL,
    business_email TEXT NOT NULL CHECK (business_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    business_contact TEXT NOT NULL CHECK (business_contact ~ '^(\+63|0)9\d{9}$'),
 
    business_street TEXT NOT NULL,
    business_barangay TEXT NOT NULL,
    business_city TEXT NOT NULL,
    business_province TEXT NOT NULL,
    business_country TEXT NOT NULL DEFAULT 'Philippines' CHECK (business_country = 'Philippines'),
    business_postal_code TEXT NOT NULL CHECK (business_postal_code ~ '^\d{4}$'),
 
    business_service_type TEXT NOT NULL DEFAULT 'Pet Grooming' CHECK (business_service_type = 'Pet Grooming'),
 
    business_latitude NUMERIC(9, 6) NOT NULL,
    business_longitude NUMERIC(9, 6) NOT NULL,
 
    business_social_media_url TEXT CHECK (business_social_media_url IS NULL OR business_social_media_url ~* '^https?://'),
    business_google_map_url TEXT CHECK (business_google_map_url IS NULL OR business_google_map_url ~* '^https?://'),
 
    registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
    registration_response_by UUID REFERENCES auth.users(id),
    registration_approved_at TIMESTAMP WITH TIME ZONE,
    registration_rejection_reason VARCHAR(250),
 
    business_profile_view_count BIGINT NOT NULL DEFAULT 0,
 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
 
CREATE OR REPLACE TRIGGER update_sp_general_info_modtime
    BEFORE UPDATE ON public.sp_general_info
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
 
ALTER TABLE public.sp_general_info ENABLE ROW LEVEL SECURITY;
 
DROP POLICY IF EXISTS "Business profiles are viewable by everyone" ON public.sp_general_info;
CREATE POLICY "Business profiles are viewable by everyone" ON public.sp_general_info
    FOR SELECT USING (true);
 
DROP POLICY IF EXISTS "Service providers can insert their own business" ON public.sp_general_info;
CREATE POLICY "Service providers can insert their own business" ON public.sp_general_info
    FOR INSERT WITH CHECK (auth.uid() = profiles_id);
 
DROP POLICY IF EXISTS "Service providers can update their own business" ON public.sp_general_info;
CREATE POLICY "Service providers can update their own business" ON public.sp_general_info
    FOR UPDATE USING (auth.uid() = profiles_id);

-- Added columns
ALTER TABLE public.sp_general_info
    ADD COLUMN IF NOT EXISTS business_waiver_url TEXT,
    ADD COLUMN IF NOT EXISTS business_permit_url TEXT,
    ADD COLUMN IF NOT EXISTS business_payment_qr_url TEXT;