-- File: database/auth/01_create_profiles.sql
-- Latest Update: July 18, 2026

-- Setup Auth Module & Profiles Table
CREATE SCHEMA IF NOT EXISTS auth_module;

CREATE TABLE IF NOT EXISTS auth_module.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, 
    mobile_number TEXT NOT NULL,  
    date_of_birth DATE NOT NULL,
    role TEXT CHECK (role IN ('pet_owner', 'service_provider', 'both_sp_po', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Trigger Function for Timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON auth_module.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger Function for Auto-Profile Creation
-- Remove the requirement for the city location column in the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auth_module.profiles (
      id, first_name, last_name, username, mobile_number, date_of_birth, role
  )
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'first_name', 'Unknown'), 
      COALESCE(new.raw_user_meta_data->>'last_name', 'Unknown'), 
      COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)), 
      COALESCE(new.raw_user_meta_data->>'mobile_number', '0000000000'), 
      COALESCE((new.raw_user_meta_data->>'date_of_birth')::date, '2000-01-01'),
      COALESCE(new.raw_user_meta_data->>'role', 'pet_owner')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS Policies
ALTER TABLE auth_module.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON auth_module.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON auth_module.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON auth_module.profiles;
CREATE POLICY "Users can insert their own profile" ON auth_module.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON auth_module.profiles;
CREATE POLICY "Users can update their own profile" ON auth_module.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Helper Function for Validation
CREATE OR REPLACE FUNCTION check_field_exists(
  table_name TEXT,
  column_name TEXT,
  value_to_check TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  exists_var BOOLEAN;
BEGIN
  IF table_name = 'auth.users' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM auth.users WHERE %I = $1)', column_name)
    USING value_to_check
    INTO exists_var;
  ELSE
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE %I = $1)', table_name, column_name)
    USING value_to_check
    INTO exists_var;
  END IF;
  
  RETURN exists_var;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;