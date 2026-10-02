import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RegisteredPet } from '../types';

export function useRegisteredPets(supabase: SupabaseClient) {
  const [userRegisteredPets, setUserRegisteredPets] = useState<RegisteredPet[]>([]);

  useEffect(() => {
    const fetchRegisteredPets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('po_registered_pet')
        .select('*')
        .eq('profiles_id', user.id);

      if (!error && data) setUserRegisteredPets(data as RegisteredPet[]);
    };
    fetchRegisteredPets();
  }, [supabase]);

  return userRegisteredPets;
}