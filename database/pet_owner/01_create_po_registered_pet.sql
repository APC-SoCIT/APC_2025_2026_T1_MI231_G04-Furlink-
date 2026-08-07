-- File: database/pet_owner/01_create_po_registered_pet.sql
-- Latest Update: July 24, 2026

-- Setup Pet Owner Registered Pets Table
-- Depends on: auth_module.profiles (database/auth/01_create_profiles.sql)

CREATE TABLE IF NOT EXISTS public.po_registered_pet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profiles_id UUID NOT NULL REFERENCES auth_module.profiles(id) ON DELETE CASCADE,
    pet_name TEXT NOT NULL,
    pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat')),
    pet_breed TEXT NOT NULL,
    pet_gender TEXT NOT NULL CHECK (pet_gender IN ('male', 'female')),
    pet_date_of_birth DATE NOT NULL,
    pet_weight NUMERIC(5, 2) NOT NULL CHECK (pet_weight >= 0),
    -- multi-select tags; array kept in-bounds via the <@ check below
    pet_behaviors TEXT[] NOT NULL DEFAULT '{}',
    pet_vaccine_url TEXT NOT NULL,       -- png/jpeg, max 1MB
    pet_illness_proof_url TEXT,          -- png/jpeg, max 1MB
    pet_grooming_notes VARCHAR(250),
    pet_emergency_consent BOOLEAN DEFAULT false,
    pet_ai_haircut_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (pet_behaviors <@ ARRAY['friendly', 'aggressive', 'anxious', 'energetic', 'trained']),
    CHECK (array_length(pet_behaviors, 1) > 0)
);

CREATE OR REPLACE TRIGGER update_po_registered_pet_modtime
    BEFORE UPDATE ON public.po_registered_pet
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE public.po_registered_pet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pet owners view their own pets" ON public.po_registered_pet;
CREATE POLICY "Pet owners view their own pets" ON public.po_registered_pet
    FOR SELECT USING (auth.uid() = profiles_id);

DROP POLICY IF EXISTS "Pet owners manage their own pets" ON public.po_registered_pet;
CREATE POLICY "Pet owners manage their own pets" ON public.po_registered_pet
    FOR ALL USING (auth.uid() = profiles_id);