-- File: database/auth/01_create_profiles.sql
-- Latest Update: July 18, 2026

CREATE SCHEMA IF NOT EXISTS auth_module;

CREATE TABLE IF NOT EXISTS auth_module.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User Details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, 
    -- Note: Email Address is handled by Supabase auth.users table automatically
    mobile_number TEXT NOT NULL,  
    date_of_birth DATE NOT NULL,
    
    role TEXT CHECK (role IN ('pet_owner', 'service_provider', 'both_sp_po', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'suspended')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Trigger Function to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON auth_module.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auth_module.profiles (
      id, first_name, last_name, username, mobile_number, date_of_birth, role
  )
  VALUES (
      new.id, 
      new.raw_user_meta_data->>'first_name', 
      new.raw_user_meta_data->>'last_name', 
      new.raw_user_meta_data->>'username', 
      new.raw_user_meta_data->>'mobile_number', 
      (new.raw_user_meta_data->>'date_of_birth')::date,
      (new.raw_user_meta_data->>'role')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS Policies
ALTER TABLE auth_module.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON auth_module.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON auth_module.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON auth_module.profiles
    FOR UPDATE USING (auth.uid() = id);