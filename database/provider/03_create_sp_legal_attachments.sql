-- File: database/provider/03_create_sp_legal_attachments.sql
-- Latest Update: July 24, 2026

-- Setup Service Provider Legal Attachments Table (1 waiver + 1 permit per business)
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_legal_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID UNIQUE NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    business_waiver_url TEXT,          -- word/pdf, max 1MB (validate in app/storage)
    business_permit_url TEXT NOT NULL, -- word/pdf, max 2MB (validate in app/storage)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE OR REPLACE TRIGGER update_sp_legal_attachments_modtime
    BEFORE UPDATE ON public.sp_legal_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
-- Unlike most SP tables, legal documents are NOT publicly readable.
ALTER TABLE public.sp_legal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service providers view their own legal attachments" ON public.sp_legal_attachments;
CREATE POLICY "Service providers view their own legal attachments" ON public.sp_legal_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_legal_attachments.sp_id AND sp.profiles_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service providers manage their own legal attachments" ON public.sp_legal_attachments;
CREATE POLICY "Service providers manage their own legal attachments" ON public.sp_legal_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_legal_attachments.sp_id AND sp.profiles_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service providers update their own legal attachments" ON public.sp_legal_attachments;
CREATE POLICY "Service providers update their own legal attachments" ON public.sp_legal_attachments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_legal_attachments.sp_id AND sp.profiles_id = auth.uid()
        )
    );