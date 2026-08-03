-- File: database/booking/03_create_booking_service_info.sql
-- Latest Update: August 3, 2026

-- Setup Booking Service Info Table (snapshot of chosen service + price)
-- Depends on: public.booking_pet_info, public.sp_service_options

CREATE TABLE IF NOT EXISTS public.booking_service_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_pet_info_id UUID NOT NULL REFERENCES public.booking_pet_info(id) ON DELETE CASCADE,
    booking_services_id UUID NOT NULL REFERENCES public.sp_service_options(id), -- the specific priced option chosen
    booking_service_name TEXT NOT NULL,
    booking_service_type TEXT NOT NULL CHECK (booking_service_type IN ('individual_service', 'packaged_service')),
    booking_price NUMERIC(10, 2) NOT NULL CHECK (booking_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) -- added for audit consistency; not in original sheet
);

-- RLS Policies (inherits access from the parent booking, two joins up)
ALTER TABLE public.booking_service_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking services follow parent booking access" ON public.booking_service_info;
CREATE POLICY "Booking services follow parent booking access" ON public.booking_service_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.booking_pet_info bp
            JOIN public.booking_info b ON b.id = bp.booking_info_id
            LEFT JOIN public.sp_general_info sp ON sp.id = b.sp_id
            WHERE bp.id = booking_service_info.booking_pet_info_id
              AND (b.profiles_id = auth.uid() OR sp.profiles_id = auth.uid())
        )
    );

-- =========================================================================
-- ALTER BLOCK: Add business_region to sp_general_info for PSGC API integration
-- =========================================================================
ALTER TABLE public.sp_general_info 
ADD COLUMN IF NOT EXISTS business_region TEXT;