CREATE SCHEMA IF NOT EXISTS auth_module;

CREATE TABLE IF NOT EXISTS auth_module.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Custom User Details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, 
    mobile_number TEXT NOT NULL,  
    city_location TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    
    role TEXT CHECK (role IN ('pet_owner', 'service_provider', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'suspended')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

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