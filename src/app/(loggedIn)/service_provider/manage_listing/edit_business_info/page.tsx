/* src/app/(loggedIn)/service_provider/manage_listing/edit_business_info/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from 'next/dynamic';
import Footer from "@/components/Footer";
import { reverseGeocode, forwardGeocode } from "@/utils/geocoding";
import "../manage_listing.css";

// Dynamically import LocationPicker without SSR
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '380px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      Loading map...
    </div>
  ),
});

export default function EditBusinessInfoPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Guard state to prevent Leaflet's "appendChild" and instance reuse errors during React Strict Mode / HMR
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    businessEmail: "",
    businessMobile: "",
    houseStreet: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setIsMounted(true); // Signal that the component is fully painted in the browser DOM

    const fetchListingData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data, error } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .single();

        if (error) throw new Error("Could not fetch business information.");

        if (data) {
          const mobile = data.business_contact?.startsWith('+63')
            ? data.business_contact.replace('+63', '')
            : data.business_contact;

          setFormData({
            businessName: data.business_name || "",
            description: data.business_bio || "",
            businessEmail: data.business_email || "",
            businessMobile: mobile || "",
            houseStreet: data.business_street || "",
            barangay: data.business_barangay || "",
            city: data.business_city || "",
            province: data.business_province || "",
            postalCode: data.business_postal_code || "",
          });

          // Populate coordinates from database
          const lat = data.business_latitude ?? data.latitude;
          const lng = data.business_longitude ?? data.longitude;
          if (lat && lng) {
            setLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to load business info.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingData();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Prevent accidental input of letters in the mobile field to keep data clean
    if (name === "businessMobile") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 10) setFormData(prev => ({ ...prev, [name]: numbersOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 1. Map Pin / Coords -> Autofill Address Fields (Reverse Geocode)
  const handleLocationSelect = async (coords: { lat: number; lng: number }) => {
    setLocation(coords);
    setIsGeocoding(true);
    const resolvedAddress = await reverseGeocode(coords.lat, coords.lng);
    setIsGeocoding(false);

    if (resolvedAddress) {
      setFormData(prev => ({
        ...prev,
        houseStreet: resolvedAddress.houseStreet || prev.houseStreet,
        barangay: resolvedAddress.barangay || prev.barangay,
        city: resolvedAddress.city || prev.city,
        province: resolvedAddress.province || prev.province,
        postalCode: resolvedAddress.postalCode || prev.postalCode,
      }));
    }
  };

  // 2. Manual Latitude/Longitude Input Handlers
  const handleCoordInputChange = (type: 'lat' | 'lng', value: string) => {
    const num = parseFloat(value);
    setLocation(prev => {
      const baseLat = prev?.lat ?? 0;
      const baseLng = prev?.lng ?? 0;
      return {
        lat: type === 'lat' ? (isNaN(num) ? 0 : num) : baseLat,
        lng: type === 'lng' ? (isNaN(num) ? 0 : num) : baseLng,
      };
    });
  };

  // 3. Address Fields -> Map Pin & Coords (Forward Geocode)
  const handleLocateFromAddress = async () => {
    const queryParts = [formData.houseStreet, formData.barangay, formData.city, formData.province, "Philippines"].filter(Boolean);
    if (queryParts.length <= 1) {
      setErrorMessage("Please fill in at least a city, province, or street address to sync the map.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrorMessage(null);
    setIsGeocoding(true);
    const coords = await forwardGeocode(queryParts.join(", "));
    setIsGeocoding(false);

    if (coords) {
      setLocation(coords);
    } else {
      setErrorMessage("Address not found on map. You can still pinpoint your location by clicking directly on the map.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found. Please log in again.");

      // Ensure the number is stripped of any accidental formatting before prepending the strict +63 required by the database constraint
      const cleanedMobile = formData.businessMobile.replace(/^\+63/, '').replace(/\D/g, '');

      const { error } = await supabase
        .from('sp_general_info')
        .update({
          business_name: formData.businessName,
          business_bio: formData.description,
          business_email: formData.businessEmail,
          business_contact: `+63${cleanedMobile}`, // Fixes the sp_general_info_business_contact_check constraint violation
          business_street: formData.houseStreet,
          business_barangay: formData.barangay,
          business_city: formData.city,
          business_province: formData.province,
          business_postal_code: formData.postalCode,
          business_latitude: location?.lat || null,
          business_longitude: location?.lng || null,
          updated_at: new Date().toISOString(),
        })
        .eq('profiles_id', user.id);

      // Now correctly passes the exact database error message up to the UI if a constraint fails
      if (error) throw new Error(error.message || "Failed to save update, kindly re-check your input.");

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      // Translate raw network fetch errors into friendly UI guidance
      const friendlyMessage = err?.message === 'Failed to fetch'
        ? 'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        : (err?.message || 'An unexpected error occurred while saving.');

      setErrorMessage(friendlyMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading business info...</div>;
  }

  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        <div style={{ maxWidth: '720px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <h2 style={{ color: '#0a217a', marginBottom: '20px' }}>Edit Business Information</h2>

          {errorMessage && (
            <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="listing-field-group">
              <label>Business Name</label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div className="listing-field-group">
              <label>Business Bio</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div className="listing-field-group">
              <label>Business Email</label>
              <input type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div className="listing-field-group">
              <label>Business Mobile</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#666', fontWeight: 600 }}>+63</span>
                <input 
                  type="tel" 
                  name="businessMobile" 
                  value={formData.businessMobile} 
                  onChange={handleChange} 
                  required 
                  maxLength={10}
                  placeholder="920 667 2166"
                  style={{ width: '100%', padding: '10px 10px 10px 42px', borderRadius: '6px', border: '1px solid #0a217a' }} 
                />
              </div>
            </div>

            <div className="listing-field-group">
              <label>Street Address</label>
              <input type="text" name="houseStreet" value={formData.houseStreet} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div className="listing-field-group" style={{ flex: '1 1 200px' }}>
                <label>Barangay</label>
                <input type="text" name="barangay" value={formData.barangay} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
              <div className="listing-field-group" style={{ flex: '1 1 200px' }}>
                <label>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div className="listing-field-group" style={{ flex: '1 1 200px' }}>
                <label>Province</label>
                <input type="text" name="province" value={formData.province} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
              <div className="listing-field-group" style={{ flex: '1 1 200px' }}>
                <label>Postal Code</label>
                <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
            </div>

            {/* Address-to-Map Sync Trigger */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handleLocateFromAddress}
                disabled={isGeocoding}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #0a217a',
                  background: '#f4f6fb',
                  color: '#0a217a',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isGeocoding ? 'not-allowed' : 'pointer',
                }}
              >
                {isGeocoding ? "Syncing location..." : "📍 Locate Address on Map"}
              </button>
            </div>

            {/* Map & Coordinate Inputs */}
            <div className="listing-field-group">
              <label>Pin Your Location</label>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                Click anywhere on the map or type coordinates below to automatically resolve the address.
              </p>

              {/* Manual Coordinate Inputs */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 14.5995"
                    value={location?.lat ?? ''}
                    onChange={(e) => handleCoordInputChange('lat', e.target.value)}
                    onBlur={() => location && handleLocationSelect(location)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 120.9842"
                    value={location?.lng ?? ''}
                    onChange={(e) => handleCoordInputChange('lng', e.target.value)}
                    onBlur={() => location && handleLocationSelect(location)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              {/* Only render the MapContainer when the DOM is fully ready to prevent SSR hydration crashes */}
              {isMounted && (
                <LocationPicker position={location} setPosition={handleLocationSelect} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => router.push("/service_provider/manage_listing")} 
                style={{ background: '#e0ded6', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSaving} 
                style={{ background: '#0a217a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

        </div>
      </div>
      <Footer />
    </div>
  );
}