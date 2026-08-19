import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define the shape of our data so TypeScript knows it won't always be empty
interface DashboardState {
  bookings: any[];
  pets: any[];
  services: any[];
  operatingHours: any[];
  generalInfo: any | null;
}

export function useDashboardData(spId: string) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Pass the DashboardState interface to useState
  const [dashboardData, setDashboardData] = useState<DashboardState>({
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
        let pets: any[] = [];
        let services: any[] = [];
        
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
  }, [spId, supabase]);

  return { ...dashboardData, loading };
}