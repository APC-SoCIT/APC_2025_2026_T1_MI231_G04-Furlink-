-- File: database/storage/02_storage_policies.sql
-- Latest Update: July 24, 2026

-- Setup Storage RLS Policies
-- Convention:
--   sp-waiver, sp-permit, sp-facility-images, sp-payment-qr  -> {auth.uid()}/{filename}
--   pet-medical-docs, ai-haircut-previews                    -> {auth.uid()}/{registered_pet_id}/{filename}
--     (the pet_id segment is what lets a booked SP be matched to the right pet)
-- Depends on: public.is_admin() (database/auth/02_create_admin_helper.sql)

-- ---------------------------------------------------------
-- sp-waiver (public read, owner write)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Waivers are viewable by everyone" ON storage.objects;
CREATE POLICY "Waivers are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'sp-waiver');

DROP POLICY IF EXISTS "SP can upload own waiver" ON storage.objects;
CREATE POLICY "SP can upload own waiver" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sp-waiver'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can update own waiver" ON storage.objects;
CREATE POLICY "SP can update own waiver" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'sp-waiver'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can delete own waiver" ON storage.objects;
CREATE POLICY "SP can delete own waiver" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sp-waiver'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------
-- sp-permit (private — SP owner + Admin)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "SP or Admin can view permit" ON storage.objects;
CREATE POLICY "SP or Admin can view permit" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'sp-permit'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );

DROP POLICY IF EXISTS "SP can upload own permit" ON storage.objects;
CREATE POLICY "SP can upload own permit" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sp-permit'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can update own permit" ON storage.objects;
CREATE POLICY "SP can update own permit" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'sp-permit'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can delete own permit" ON storage.objects;
CREATE POLICY "SP can delete own permit" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sp-permit'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------
-- sp-facility-images (public read, owner write)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Facility images are viewable by everyone" ON storage.objects;
CREATE POLICY "Facility images are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'sp-facility-images');

DROP POLICY IF EXISTS "SP can upload own facility images" ON storage.objects;
CREATE POLICY "SP can upload own facility images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sp-facility-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can delete own facility images" ON storage.objects;
CREATE POLICY "SP can delete own facility images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sp-facility-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------
-- sp-payment-qr (private — SP owner + Admin)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "SP or Admin can view payment QR" ON storage.objects;
CREATE POLICY "SP or Admin can view payment QR" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'sp-payment-qr'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );

DROP POLICY IF EXISTS "SP can upload own payment QR" ON storage.objects;
CREATE POLICY "SP can upload own payment QR" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sp-payment-qr'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "SP can delete own payment QR" ON storage.objects;
CREATE POLICY "SP can delete own payment QR" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sp-payment-qr'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------
-- pet-medical-docs (private — pet owner + booked SP + Admin)
-- Path: {owner_uid}/{registered_pet_id}/{filename}
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Owner, booked SP, or Admin can view pet documents" ON storage.objects;
CREATE POLICY "Owner, booked SP, or Admin can view pet documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'pet-medical-docs'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
            OR EXISTS (
                SELECT 1
                FROM public.booking_pet_info bp
                JOIN public.booking_info b ON b.id = bp.booking_info_id
                JOIN public.sp_general_info sp ON sp.id = b.sp_id
                WHERE bp.registered_pet_id::text = (storage.foldername(name))[2]
                  AND sp.profiles_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Pet owners can upload own pet documents" ON storage.objects;
CREATE POLICY "Pet owners can upload own pet documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'pet-medical-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Pet owners can update own pet documents" ON storage.objects;
CREATE POLICY "Pet owners can update own pet documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'pet-medical-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Pet owners can delete own pet documents" ON storage.objects;
CREATE POLICY "Pet owners can delete own pet documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'pet-medical-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ---------------------------------------------------------
-- ai-haircut-previews (private — pet owner + booked SP + Admin)
-- Path: {owner_uid}/{registered_pet_id}/{filename}
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Owner, booked SP, or Admin can view AI haircut previews" ON storage.objects;
CREATE POLICY "Owner, booked SP, or Admin can view AI haircut previews" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'ai-haircut-previews'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
            OR EXISTS (
                SELECT 1
                FROM public.booking_pet_info bp
                JOIN public.booking_info b ON b.id = bp.booking_info_id
                JOIN public.sp_general_info sp ON sp.id = b.sp_id
                WHERE bp.registered_pet_id::text = (storage.foldername(name))[2]
                  AND sp.profiles_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Pet owners can upload own AI haircut previews" ON storage.objects;
CREATE POLICY "Pet owners can upload own AI haircut previews" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'ai-haircut-previews'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Pet owners can delete own AI haircut previews" ON storage.objects;
CREATE POLICY "Pet owners can delete own AI haircut previews" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'ai-haircut-previews'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );