-- File: database/provider/02_create_sp_operating_hours.sql
-- Latest Update: July 24, 2026

-- Setup Service Provider Operating Hours Table
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    slot_interval INTEGER NOT NULL CHECK (slot_interval > 0),   -- minutes
    slot_capacity INTEGER NOT NULL CHECK (slot_capacity > 0),   -- pets per slot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (closing_time > opening_time),
    UNIQUE (sp_id, day_of_week) -- one hours block per day; drop this if split shifts are needed
);

CREATE OR REPLACE TRIGGER update_sp_operating_hours_modtime
    BEFORE UPDATE ON public.sp_operating_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE public.sp_operating_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operating hours are viewable by everyone" ON public.sp_operating_hours;
CREATE POLICY "Operating hours are viewable by everyone" ON public.sp_operating_hours
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own operating hours" ON public.sp_operating_hours;
CREATE POLICY "Service providers manage their own operating hours" ON public.sp_operating_hours
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_operating_hours.sp_id AND sp.profiles_id = auth.uid()
        )
    );