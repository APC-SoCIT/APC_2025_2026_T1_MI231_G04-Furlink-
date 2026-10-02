/* src/app/pet_owner/book_appointment/PetOwnerMap.tsx */
'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix missing marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProviderLocationProps {
  businessName: string;
  businessCity: string;
  latitude: number;
  longitude: number;
}

export default function PetOwnerMap({ businessName, businessCity, latitude, longitude }: ProviderLocationProps) {
  const position = { lat: latitude, lng: longitude };

  return (
    <div style={{ height: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '12px' }}>
      <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        <Marker position={position}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ color: '#0a217a' }}>{businessName}</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{businessCity}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}