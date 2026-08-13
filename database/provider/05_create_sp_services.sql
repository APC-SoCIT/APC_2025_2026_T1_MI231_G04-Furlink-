-- File: database/provider/05_create_sp_services.sql
-- Latest Update: July 27, 2026

-- Setup Service Provider Service Listings Table
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('individual_service', 'packaged_service')),
    service_name TEXT NOT NULL,
    service_description VARCHAR(250) NOT NULL,
    service_notes VARCHAR(250),
    service_haircut_included BOOLEAN NOT NULL,
    service_status TEXT NOT NULL DEFAULT 'active' CHECK (service_status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE OR REPLACE TRIGGER update_sp_services_modtime
    BEFORE UPDATE ON public.sp_services
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE public.sp_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.sp_services;
CREATE POLICY "Services are viewable by everyone" ON public.sp_services
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own services" ON public.sp_services;
CREATE POLICY "Service providers manage their own services" ON public.sp_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_services.sp_id AND sp.profiles_id = auth.uid()
        )
    );