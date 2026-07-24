-- File: database/storage/01_create_buckets.sql
-- Latest Update: July 24, 2026

-- Setup Storage Buckets
-- Visibility rules:
--   Public  (anyone):                  waiver, facility images
--   Private (SP owner + Admin):        permit, payment QR
--   Private (owner + booked SP + Admin): pet vaccine/illness docs, AI haircut previews
--
-- file_size_limit is in bytes. allowed_mime_types is the hard ceiling —
-- finer per-field limits still need to be checked client-side before upload.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    (
        'sp-waiver', 'sp-waiver', true, 1048576,
        ARRAY['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    ),
    (
        'sp-permit', 'sp-permit', false, 2097152,
        ARRAY['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    ),
    (
        'sp-facility-images', 'sp-facility-images', true, 1048576,
        ARRAY['image/png', 'image/jpeg']
    ),
    (
        'sp-payment-qr', 'sp-payment-qr', false, 1048576,
        ARRAY['image/png', 'image/jpeg']
    ),
    (
        'pet-medical-docs', 'pet-medical-docs', false, 1048576,
        ARRAY['image/png', 'image/jpeg']
    ),
    (
        'ai-haircut-previews', 'ai-haircut-previews', false, 1048576,
        ARRAY['image/png', 'image/jpeg']
    )
ON CONFLICT (id) DO NOTHING;