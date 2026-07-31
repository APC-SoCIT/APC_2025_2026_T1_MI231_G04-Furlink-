import { supabase } from "@/lib/supabase";

export const checkFieldExists = async (
  field: 'username' | 'email',
  value: string
): Promise<boolean> => {
  try {
    // Pass the full schema-qualified name
    const table = field === 'username' ? 'auth_module.profiles' : 'auth.users';
    const column = field === 'username' ? 'username' : 'email';

    const { data, error } = await supabase
      .rpc('check_field_exists', {
        table_name: table,      // e.g., 'auth.users'
        column_name: column,    // e.g., 'email'
        value_to_check: value.toLowerCase()
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