'use client';

import dynamic from 'next/dynamic';

const PetOwnerMap = dynamic(() => import('./PetOwnerMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '350px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', marginTop: '12px' }}>
      Loading map...
    </div>
  ),
});

interface ServiceLocationMapProps {
  businessName: string;
  businessCity: string;
  latitude: number;
  longitude: number;
}

export default function ServiceLocationMap(props: ServiceLocationMapProps) {
  return <PetOwnerMap {...props} />;
}