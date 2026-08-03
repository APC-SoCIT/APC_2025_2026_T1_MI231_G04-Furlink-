-- File: database/provider/04_create_sp_img_facilities.sql
-- Latest Update: July 24, 2026

-- Setup Service Provider Facility Images Table (1-3 images per business)
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_img_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    business_facility_images TEXT NOT NULL, -- png/jpeg, max 1MB (validate in app/storage)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE OR REPLACE TRIGGER update_sp_img_facilities_modtime
    BEFORE UPDATE ON public.sp_img_facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Enforce max 3 uploads per business.
-- The "at least 1 required" side of this rule has to be gated in the
-- registration flow instead — a table constraint can't require a row
-- to exist before the business itself has been submitted.
CREATE OR REPLACE FUNCTION public.enforce_max_facility_images()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.sp_img_facilities WHERE sp_id = NEW.sp_id) >= 3 THEN
        RAISE EXCEPTION 'A business can upload at most 3 facility images';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_limit_facility_images
    BEFORE INSERT ON public.sp_img_facilities
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_max_facility_images();

-- RLS Policies
ALTER TABLE public.sp_img_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facility images are viewable by everyone" ON public.sp_img_facilities;
CREATE POLICY "Facility images are viewable by everyone" ON public.sp_img_facilities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own facility images" ON public.sp_img_facilities;
CREATE POLICY "Service providers manage their own facility images" ON public.sp_img_facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_img_facilities.sp_id AND sp.profiles_id = auth.uid()
        )
    );