-- File: database/booking/04_create_booking_feedback.sql
-- Latest Update: July 24, 2026

-- Setup Booking Feedback Table
-- Depends on: public.booking_info, public.sp_general_info, auth_module.profiles

CREATE TABLE IF NOT EXISTS public.booking_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_info_id UUID UNIQUE NOT NULL REFERENCES public.booking_info(id) ON DELETE CASCADE, -- one review per booking
    booking_sp_general_info UUID NOT NULL REFERENCES public.sp_general_info(id),
    booking_profiles_id UUID NOT NULL REFERENCES auth_module.profiles(id), -- the reviewer
    booking_overall_rating INTEGER NOT NULL CHECK (booking_overall_rating BETWEEN 1 AND 5),
    booking_staff_rating INTEGER NOT NULL CHECK (booking_staff_rating BETWEEN 1 AND 5),
    booking_comment VARCHAR(250),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS Policies
ALTER TABLE public.booking_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.booking_feedback;
CREATE POLICY "Reviews are viewable by everyone" ON public.booking_feedback
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pet owners can leave a review for their own booking" ON public.booking_feedback;
CREATE POLICY "Pet owners can leave a review for their own booking" ON public.booking_feedback
    FOR INSERT WITH CHECK (auth.uid() = booking_profiles_id);

DROP POLICY IF EXISTS "Pet owners can edit their own review" ON public.booking_feedback;
CREATE POLICY "Pet owners can edit their own review" ON public.booking_feedback
    FOR UPDATE USING (auth.uid() = booking_profiles_id);