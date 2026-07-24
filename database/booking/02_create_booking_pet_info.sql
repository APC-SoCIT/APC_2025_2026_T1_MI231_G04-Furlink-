-- File: database/booking/02_create_booking_pet_info.sql
-- Latest Update: July 24, 2026

-- Setup Booking Pet Info Table (snapshot of pet details at booking time)
-- Depends on: public.booking_info, public.po_registered_pet

CREATE TABLE IF NOT EXISTS public.booking_pet_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_info_id UUID NOT NULL REFERENCES public.booking_info(id) ON DELETE CASCADE,
    -- RESTRICT, not CASCADE: keeps booking history intact if a pet record is later removed
    registered_pet_id UUID NOT NULL REFERENCES public.po_registered_pet(id) ON DELETE RESTRICT,
    booking_pet_name TEXT NOT NULL,
    booking_pet_type TEXT NOT NULL CHECK (booking_pet_type IN ('dog', 'cat')),
    booking_breed TEXT NOT NULL,
    booking_gender TEXT NOT NULL CHECK (booking_gender IN ('male', 'female')),
    booking_date_of_birth DATE NOT NULL,
    booking_weight NUMERIC(5, 2) NOT NULL CHECK (booking_weight >= 0),
    booking_behavior TEXT[] NOT NULL DEFAULT '{}',
    booking_vaccine_url TEXT NOT NULL,
    booking_illness_proof_url TEXT,
    booking_grooming_notes VARCHAR(250),
    booking_ai_haircut_url TEXT,
    booking_emergency_consent BOOLEAN DEFAULT false,
    booking_calculated_size TEXT NOT NULL CHECK (
        booking_calculated_size IN ('all', 'extra_small', 'small', 'medium', 'large', 'extra_large', 'cat')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (booking_behavior <@ ARRAY['friendly', 'aggressive', 'anxious', 'energetic', 'trained'])
);

-- RLS Policies (inherits access from the parent booking)
ALTER TABLE public.booking_pet_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking pets follow parent booking access" ON public.booking_pet_info;
CREATE POLICY "Booking pets follow parent booking access" ON public.booking_pet_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.booking_info b
            LEFT JOIN public.sp_general_info sp ON sp.id = b.sp_id
            WHERE b.id = booking_pet_info.booking_info_id
              AND (b.profiles_id = auth.uid() OR sp.profiles_id = auth.uid())
        )
    );