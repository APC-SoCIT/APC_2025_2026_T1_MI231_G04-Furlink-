/* src/app/(loggedIn)/service_provider/manage_listing/edit_listing/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";
import "../manage_listing.css";

export default function EditListingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [spId, setSpId] = useState<string | null>(null);

  // 1. Fetch Existing Services & Pricing
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the provider's general info ID first
        const { data: generalData } = await supabase
          .from('sp_general_info')
          .select('id')
          .eq('profiles_id', user.id)
          .single();

        if (generalData) {
          setSpId(generalData.id);

          // Fetch services and their nested options
          const { data: srvData, error } = await supabase
            .from('sp_services')
            .select(`*, sp_service_options(*)`)
            .eq('sp_id', generalData.id);

          if (error) throw error;
          setServices(srvData || []);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load services.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [supabase]);

  // 2. Handle Input Changes for Services
  const handleServiceChange = (index: number, field: string, value: string) => {
    const updatedServices = [...services];
    updatedServices[index][field] = value;
    setServices(updatedServices);
  };

  // 3. Handle Input Changes for Pricing Options
  const handleOptionChange = (serviceIndex: number, optionIndex: number, value: string) => {
    const updatedServices = [...services];
    updatedServices[serviceIndex].sp_service_options[optionIndex].service_price = parseFloat(value) || 0;
    setServices(updatedServices);
  };

  // 4. Save Updates to Supabase
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!spId) throw new Error("Provider ID not found.");

      // Loop through and update each service and its options
      for (const service of services) {
        // Update the main service details
        const { error: srvError } = await supabase
          .from('sp_services')
          .update({
            service_name: service.service_name,
            service_description: service.service_description,
          })
          .eq('id', service.id);

        if (srvError) throw srvError;

        // Update the pricing options for this service
        for (const option of service.sp_service_options) {
          const { error: optError } = await supabase
            .from('sp_service_options')
            .update({
              service_price: option.service_price
            })
            .eq('id', option.id);
          
          if (optError) throw optError;
        }
      }

      // Route back to the dashboard on success
      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update services.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading services...</div>;
  }

  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <h2 style={{ color: '#0a217a', marginBottom: '20px' }}>Edit Services Menu</h2>

          {errorMessage && (
            <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {services.map((srv, sIndex) => (
              <div key={srv.id} style={{ border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px', background: '#fdfdfd' }}>
                
                <div className="listing-field-group" style={{ marginBottom: '12px' }}>
                  <label>Service Name ({srv.service_type})</label>
                  <input 
                    type="text" 
                    value={srv.service_name} 
                    onChange={(e) => handleServiceChange(sIndex, 'service_name', e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} 
                  />
                </div>

                <div className="listing-field-group" style={{ marginBottom: '16px' }}>
                  <label>Description</label>
                  <textarea 
                    value={srv.service_description} 
                    onChange={(e) => handleServiceChange(sIndex, 'service_description', e.target.value)} 
                    rows={2} 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #0a217a' }} 
                  />
                </div>

                <h4 style={{ fontSize: '14px', color: '#0a217a', marginBottom: '10px' }}>Pricing Options</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {srv.sp_service_options.map((opt: any, oIndex: number) => (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #eee' }}>
                      
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize' }}>{opt.pet_type}</span>
                        <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>
                          {opt.pet_size === 'all' ? 'All Sizes' : `${opt.pet_size} (${opt.pet_min_weight_range}-${opt.pet_max_weight_range}kg)`}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#0a217a' }}>₱</span>
                        <input 
                          type="number" 
                          value={opt.service_price} 
                          onChange={(e) => handleOptionChange(sIndex, oIndex, e.target.value)}
                          style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}

            {services.length === 0 && <p>No services found to edit.</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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