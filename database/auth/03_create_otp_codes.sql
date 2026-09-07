-- File: database/auth/03_create_otp_codes.sql
-- Latest Update: August 6, 2026

truncate table otp_codes;

alter table otp_codes
  add column if not exists resend_count int not null default 1,
  add column if not exists first_requested_at timestamptz not null default now(),
  add column if not exists last_sent_at timestamptz not null default now(),
  add column if not exists verified_at timestamptz;

alter table otp_codes
  add constraint otp_codes_email_key unique (email);