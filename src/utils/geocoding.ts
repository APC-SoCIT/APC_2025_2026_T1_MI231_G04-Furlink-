/* src/utils/geocoding.ts */

// Reverse Geocode: (lat, lng) -> Address Fields
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'PetPlatformApp/1.0', // Nominatim requires a user-agent header
        },
      }
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const addr = data.address || {};

    return {
      houseStreet: [addr.house_number, addr.road].filter(Boolean).join(' ') || '',
      barangay: addr.quarter || addr.suburb || addr.neighbourhood || addr.village || '',
      city: addr.city || addr.town || addr.municipality || '',
      province: addr.state || addr.province || addr.region || '',
      postalCode: addr.postcode || '',
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

// Forward Geocode: Address Query -> (lat, lng)
export async function forwardGeocode(addressQuery: string) {
  try {
    const query = encodeURIComponent(addressQuery);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${query}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'PetPlatformApp/1.0',
        },
      }
    );
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Forward geocode error:', error);
    return null;
  }
}