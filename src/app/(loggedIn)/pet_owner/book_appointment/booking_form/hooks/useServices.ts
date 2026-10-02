import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceOption, ServiceWeightOption } from '../types';

export function useServices(supabase: SupabaseClient, spId: string) {
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [serviceWeightOptions, setServiceWeightOptions] = useState<ServiceWeightOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (!spId) return;
    const fetchServicesAndOptions = async () => {
      setLoadingServices(true);
      const { data: svcData, error: svcErr } = await supabase
        .from('sp_services')
        .select('id, sp_id, service_name, service_type, service_status')
        .eq('sp_id', spId)
        .eq('service_status', 'active');

      if (!svcErr && svcData) {
        setAvailableServices(svcData as ServiceOption[]);
        const serviceIds = svcData.map((s) => s.id);
        if (serviceIds.length > 0) {
          const { data: optData } = await supabase
            .from('sp_service_options')
            .select('*')
            .in('sp_services_id', serviceIds)
            .eq('option_status', 'active');

          if (optData) setServiceWeightOptions(optData as ServiceWeightOption[]);
        }
      }
      setLoadingServices(false);
    };
    fetchServicesAndOptions();
  }, [spId, supabase]);

  return { availableServices, serviceWeightOptions, loadingServices };
}