-- File: database/provider/06_create_sp_service_options.sql
-- Latest Update: July 27, 2026

-- Setup Service Provider Price Listing Table (per pet type / size, per service)
-- Depends on: public.sp_services (database/provider/07_create_sp_services.sql)

CREATE TABLE IF NOT EXISTS public.sp_service_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_services_id UUID NOT NULL REFERENCES public.sp_services(id) ON DELETE CASCADE,
    pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat', 'both_dog_cat')),
    pet_size TEXT NOT NULL CHECK (pet_size IN ('all', 'extra_small', 'small', 'medium', 'large', 'extra_large', 'cat')),
    pet_min_weight_range NUMERIC(5, 2) NOT NULL,
    pet_max_weight_range NUMERIC(5, 2) NOT NULL,
    service_price NUMERIC(10, 2) NOT NULL CHECK (service_price >= 0),
    option_status TEXT NOT NULL DEFAULT 'active' CHECK (option_status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (pet_min_weight_range < pet_max_weight_range),
    UNIQUE (sp_services_id, pet_type, pet_size)
);

-- Added column
ALTER TABLE public.sp_service_options
    ADD COLUMN IF NOT EXISTS option_status TEXT NOT NULL DEFAULT 'active'
    CHECK (option_status IN ('active', 'inactive'));

CREATE OR REPLACE TRIGGER update_sp_service_options_modtime
    BEFORE UPDATE ON public.sp_service_options
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE public.sp_service_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service options are viewable by everyone" ON public.sp_service_options;
CREATE POLICY "Service options are viewable by everyone" ON public.sp_service_options
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own service options" ON public.sp_service_options;
CREATE POLICY "Service providers manage their own service options" ON public.sp_service_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_services s
            JOIN public.sp_general_info sp ON sp.id = s.sp_id
            WHERE s.id = sp_service_options.sp_services_id AND sp.profiles_id = auth.uid()
        )
    );