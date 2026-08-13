-- File: database/provider/06_create_sp_employees_info.sql
-- Latest Update: July 24, 2026

-- Setup Service Provider Employees Table
-- Depends on: public.sp_general_info (database/provider/01_create_sp_general_info.sql)

CREATE TABLE IF NOT EXISTS public.sp_employees_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sp_id UUID NOT NULL REFERENCES public.sp_general_info(id) ON DELETE CASCADE,
    employee_first_name TEXT NOT NULL,
    employee_last_name TEXT NOT NULL,
    employee_position TEXT NOT NULL CHECK (employee_position IN ('pet_stylist', 'business_owner', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE OR REPLACE TRIGGER update_sp_employees_info_modtime
    BEFORE UPDATE ON public.sp_employees_info
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE public.sp_employees_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee info is viewable by everyone" ON public.sp_employees_info;
CREATE POLICY "Employee info is viewable by everyone" ON public.sp_employees_info
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service providers manage their own employees" ON public.sp_employees_info;
CREATE POLICY "Service providers manage their own employees" ON public.sp_employees_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sp_general_info sp
            WHERE sp.id = sp_employees_info.sp_id AND sp.profiles_id = auth.uid()
        )
    );