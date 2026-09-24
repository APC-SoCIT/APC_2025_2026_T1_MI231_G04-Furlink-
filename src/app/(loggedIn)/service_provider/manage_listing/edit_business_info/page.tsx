/* src/app/(loggedIn)/service_provider/manage_listing/edit_business_info/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";
import "../manage_listing.css";

export default function EditBusinessInfoPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchListingData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const mobile = data.business_contact.startsWith('+63')
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
        }
      } catch (err: any) {
        setErrorMessage("Failed to load business info.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingData();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");

      const { error } = await supabase
        .from('sp_general_info')
        .update({
          business_name: formData.businessName,
          business_bio: formData.description,
          business_email: formData.businessEmail,
          business_contact: `+63${formData.businessMobile}`,
          business_street: formData.houseStreet,
          business_barangay: formData.barangay,
          business_city: formData.city,
          business_province: formData.province,
          business_postal_code: formData.postalCode,
          updated_at: new Date().toISOString(),
        })
        .eq('profiles_id', user.id);

      if (error) throw error;

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update business information.");
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
        <div style={{ maxWidth: '700px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
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
              <input type="text" name="businessMobile" value={formData.businessMobile} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div className="listing-field-group">
              <label>Street Address</label>
              <input type="text" name="houseStreet" value={formData.houseStreet} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="listing-field-group" style={{ flex: 1 }}>
                <label>Barangay</label>
                <input type="text" name="barangay" value={formData.barangay} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
              <div className="listing-field-group" style={{ flex: 1 }}>
                <label>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="listing-field-group" style={{ flex: 1 }}>
                <label>Province</label>
                <input type="text" name="province" value={formData.province} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
              <div className="listing-field-group" style={{ flex: 1 }}>
                <label>Postal Code</label>
                <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} />
              </div>
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