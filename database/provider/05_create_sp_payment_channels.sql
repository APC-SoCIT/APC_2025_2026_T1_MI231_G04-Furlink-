-- File: database/provider/05_create_sp_payment_channels.sql
-- Latest Update: July 24, 2026

-- Setup Service Provider Payment Channels Table (1-2 QR images per business)
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_payment_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    business_payment_qr_url TEXT NOT NULL, -- png/jpeg, max 1MB (validate in app/storage)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE OR REPLACE TRIGGER update_sp_payment_channels_modtime
    BEFORE UPDATE ON public.sp_payment_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Enforce max 2 uploads per business (see note in 04_create_sp_img_facilities.sql
-- about why "at least 1" isn't enforced here).
CREATE OR REPLACE FUNCTION public.enforce_max_payment_qrs()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.sp_payment_channels WHERE sp_id = NEW.sp_id) >= 2 THEN
        RAISE EXCEPTION 'A business can upload at most 2 payment QR images';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_limit_payment_qrs
    BEFORE INSERT ON public.sp_payment_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_max_payment_qrs();

-- RLS Policies
-- Assumed public-readable since a payment QR is meant to be shown to
-- customers at checkout, like the rest of a business's public profile.
-- Tighten to owner-only SELECT if that assumption is wrong.
ALTER TABLE public.sp_payment_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payment QR codes are viewable by everyone" ON public.sp_payment_channels;
CREATE POLICY "Payment QR codes are viewable by everyone" ON public.sp_payment_channels
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own payment channels" ON public.sp_payment_channels;
CREATE POLICY "Service providers manage their own payment channels" ON public.sp_payment_channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_payment_channels.sp_id AND sp.profiles_id = auth.uid()
        )
    );