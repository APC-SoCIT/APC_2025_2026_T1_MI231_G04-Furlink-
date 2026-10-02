import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DAYS_OF_WEEK } from '../types';

export function useSlotCapacity(
  supabase: SupabaseClient,
  spId: string,
  dateStr: string,
  initialCapacity: number,
) {
  const [slotCapacity, setSlotCapacity] = useState<number>(initialCapacity || 1);

  useEffect(() => {
    if (!spId || !dateStr) return;
    const fetchCapacity = async () => {
      const selectedDay = DAYS_OF_WEEK[new Date(dateStr).getDay()];
      const { data, error } = await supabase
        .from('sp_operating_hours')
        .select('slot_capacity')
        .eq('sp_id', spId)
        .eq('day_of_week', selectedDay)
        .single();

      if (!error && data?.slot_capacity) {
        setSlotCapacity(data.slot_capacity);
      }
    };
    fetchCapacity();
  }, [spId, dateStr, supabase]);

  return slotCapacity;
}