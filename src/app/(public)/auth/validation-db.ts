import { supabase } from "@/lib/supabase";

export const checkFieldExists = async (
  field: 'username' | 'email' | 'mobile_number',
  value: string
): Promise<boolean> => {
  try {
    // Target the profiles table for username and mobile_number, and auth.users for email
    const table = field === 'email' ? 'auth.users' : 'auth_module.profiles';
    const column = field === 'username' ? 'username' : field === 'email' ? 'email' : 'mobile_number';

    const { data, error } = await supabase
      .rpc('check_field_exists', {
        table_name: table,      
        column_name: column,    
        value_to_check: field === 'email' ? value.toLowerCase() : value
      });

    if (error) {
      console.error("RPC Error:", error);
      return false; 
    }

    return !!data;
  } catch (err) {
    return false;
  }
};