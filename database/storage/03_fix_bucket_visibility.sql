-- File: database/storage/03_fix_bucket_visibility.sql
-- Latest Update: July 24, 2026

-- Fix Bucket Visibility (corrects the original 01_create_buckets.sql run)
-- Run this AFTER 01_create_buckets.sql and 02_storage_policies.sql above.
-- Safe to run even if you haven't uploaded any files yet.

-- sp-payment-qr was created public; it should be private (SP owner + Admin only)
UPDATE storage.buckets
SET public = false
WHERE id = 'sp-payment-qr';

-- Drop obsolete policies that referenced the old combined bucket
DROP POLICY IF EXISTS "SP can view own legal attachments" ON storage.objects;
DROP POLICY IF EXISTS "SP can upload own legal attachments" ON storage.objects;
DROP POLICY IF EXISTS "SP can update own legal attachments" ON storage.objects;
DROP POLICY IF EXISTS "SP can delete own legal attachments" ON storage.objects;

-- sp-legal-attachments is no longer used (split into sp-waiver / sp-permit).
-- Supabase blocks direct DELETE on storage.buckets from SQL — remove it via
-- the Dashboard (Storage > sp-legal-attachments > Delete), or the Storage API:
--   curl -X DELETE 'https://<project-ref>.supabase.co/storage/v1/bucket/sp-legal-attachments' \
--     -H "Authorization: Bearer <service-role-key>"
-- If anything was already uploaded there, move those objects into
-- sp-waiver / sp-permit first — deleting a non-empty bucket will fail.