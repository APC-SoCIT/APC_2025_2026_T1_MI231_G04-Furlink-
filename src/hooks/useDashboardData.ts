import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useDashboardData(spId: string) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    bookings: [],
    pets: [],
    services: [],
    operatingHours: [],
    generalInfo: null,
  });

  useEffect(() => {
    async function fetchBusinessData() {
      if (!spId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Fetch booking_info for this service provider
        const { data: bookings, error: bookingError } = await supabase
          .from('booking_info')
          .select('*')
          .eq('sp_id', spId);

        if (bookingError) throw bookingError;
        const bookingIds = bookings?.map((b) => b.id) || [];

        // 2. Fetch booking_pet_info using booking_info_id
        let pets = [];
        let services = [];
        
        if (bookingIds.length > 0) {
          const { data: petData, error: petError } = await supabase
            .from('booking_pet_info')
            .select('*')
            .in('booking_info_id', bookingIds);

          if (petError) throw petError;
          pets = petData || [];
          const petIds = pets.map((p) => p.id);

          // 3. Fetch booking_service_info using booking_pet_info_id
          if (petIds.length > 0) {
            const { data: serviceData, error: serviceError } = await supabase
              .from('booking_service_info')
              .select('*')
              .in('booking_pet_info_id', petIds);

            if (serviceError) throw serviceError;
            services = serviceData || [];
          }
        }

        // 4. Fetch sp_operating_hours
        const { data: operatingHours, error: hoursError } = await supabase
          .from('sp_operating_hours')
          .select('*')
          .eq('sp_id', spId);

        if (hoursError) throw hoursError;

        // 5. Fetch sp_general_info (single row for this provider)
        const { data: generalInfo, error: generalError } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('id', spId)
          .maybeSingle();

        if (generalError) throw generalError;

        setDashboardData({
          bookings: bookings || [],
          pets: pets || [],
          services: services || [],
          operatingHours: operatingHours || [],
          generalInfo: generalInfo || null,
        });
      } catch (error: any) {
        console.error(
          'Error fetching business performance data:', 
          error?.message || error, 
          error?.hint || ''
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessData();
  }, [spId]);

  return { ...dashboardData, loading };
}