/* src/app/(loggedIn)/service_provider/manage_listing/edit_listing/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";

import "../manage_listing.css";
import "../onboarding/services.css";
import "../onboarding/page.css";

import ServiceCard from "../onboarding/components/ServiceCard";
import PricingTable from "../onboarding/components/PricingTable";
import { useServiceManager } from "../onboarding/hooks/useServiceManager";

export default function EditListingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spId, setSpId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { 
    services, setServices, addService, removeService, updateService, 
    addPricingRow, removePricingRow, updatePricing
  } = useServiceManager();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: generalData, error: generalError } = await supabase
          .from('sp_general_info')
          .select('id')
          .eq('profiles_id', user.id)
          .single();

        if (generalError || !generalData) {
          throw new Error("Could not fetch provider profile.");
        }

        setSpId(generalData.id);

        const { data: srvData, error } = await supabase
          .from('sp_services')
          .select(`*, sp_service_options(*)`)
          .eq('sp_id', generalData.id)
          .eq('is_archived', false); 

        if (error) throw new Error("Failed to load services data.");

        if (srvData && srvData.length > 0) {
          const loadedServices = srvData.map((s: any) => {
            const activeOptions = (s.sp_service_options || []).filter((p: any) => p.is_archived !== true);
            
            return {
              id: s.id,
              type: s.service_type,
              name: s.service_name,
              description: s.service_description,
              notes: s.service_notes || "",
              haircutIncluded: s.service_haircut_included,
              pricing: activeOptions.map((p: any) => ({
                id: p.id,
                petType: p.pet_type,
                size: p.pet_size,
                minWeight: p.pet_min_weight_range != null ? p.pet_min_weight_range.toString() : "",
                maxWeight: p.pet_max_weight_range === 999 ? "" : (p.pet_max_weight_range != null ? p.pet_max_weight_range.toString() : ""),
                price: p.service_price.toString()
              }))
            };
          });
          setServices(loadedServices);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "An unexpected error occurred while loading services.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [supabase, setServices]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationErrors({});

    let isValid = true;
    let newErrors: Record<string, string> = {};
    
    if (services.length === 0) {
      setErrorMessage("Please add at least one service.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    services.forEach((s: any, si: number) => {
      if (!s.name.trim()) { newErrors[`service_${si}_name`] = "Required"; isValid = false; }
      s.pricing.forEach((p: any, pi: number) => {
        if (!p.price || parseFloat(p.price) <= 0) { newErrors[`service_${si}_pricing_${pi}_price`] = "Required"; isValid = false; }
        if (p.size !== "all") {
          if (p.minWeight === "" || p.maxWeight === "") {
            newErrors[`service_${si}_pricing_${pi}_weight`] = "Required"; isValid = false;
          } else if (parseFloat(p.minWeight) >= parseFloat(p.maxWeight)) {
            newErrors[`service_${si}_pricing_${pi}_weight`] = "Min < Max"; isValid = false;
          } else if (parseFloat(p.minWeight) < 0 || parseFloat(p.maxWeight) < 0) { // Fix: Blocks negative weights server-side
            newErrors[`service_${si}_pricing_${pi}_weight`] = "Cannot be negative"; isValid = false;
          }
        }
      });
    });

    if (!isValid) {
      setValidationErrors(newErrors);
      setErrorMessage("Please fix the errors in your services before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);

    try {
      if (!spId) throw new Error("Provider profile ID is missing. Cannot save changes.");

      const currentServiceIds = services.map((s: any) => s.id).filter(Boolean);
      const currentOptionIds = services.flatMap((s: any) => s.pricing.map((p: any) => p.id)).filter(Boolean);

      const { data: dbServices } = await supabase
        .from('sp_services')
        .select('id')
        .eq('sp_id', spId)
        .eq('is_archived', false);
        
      const dbServiceIds = dbServices?.map(s => s.id) || [];
      
      let dbOptions: any[] = [];
      if (dbServiceIds.length > 0) {
        const { data: optData } = await supabase
          .from('sp_service_options')
          .select('id')
          .in('sp_services_id', dbServiceIds)
          .eq('is_archived', false);
          
        dbOptions = optData || [];
      }

      const servicesToDelete = dbServiceIds.filter(id => !currentServiceIds.includes(id));
      const optionsToDelete = dbOptions.map(o => o.id).filter(id => !currentOptionIds.includes(id));

      if (optionsToDelete.length > 0) {
        const { error: optDelErr } = await supabase
          .from('sp_service_options')
          .update({ is_archived: true })
          .in('id', optionsToDelete);
          
        if (optDelErr) {
          throw new Error("Failed to archive removed pricing options.");
        }
      }

      if (servicesToDelete.length > 0) {
        const { error: srvDelErr } = await supabase
          .from('sp_services')
          .update({ is_archived: true })
          .in('id', servicesToDelete);
          
        if (srvDelErr) {
          throw new Error("Failed to archive removed services.");
        }
      }

      for (const service of services) {
        const srvId = (service as any).id;
        const srvPayload = {
          ...(srvId ? { id: srvId } : {}), 
          sp_id: spId,
          service_type: service.type,
          service_name: service.name,
          service_description: service.description,
          service_notes: service.notes,
          service_haircut_included: service.haircutIncluded,
        };

        const { data: savedSrv, error: srvErr } = await supabase
          .from('sp_services')
          .upsert(srvPayload, { onConflict: 'id' })
          .select()
          .single();

        if (srvErr) throw new Error(`Failed to save service: ${service.name}`);

        for (const opt of (service as any).pricing) {
          const optId = (opt as any).id;
          const optPayload = {
            ...(optId ? { id: optId } : {}),
            sp_services_id: savedSrv.id,
            pet_type: opt.petType,
            pet_size: opt.size,
            pet_min_weight_range: parseFloat(opt.minWeight) || 0,
            pet_max_weight_range: parseFloat(opt.maxWeight) || 999,
            service_price: parseFloat(opt.price),
          };

          const { error: optErr } = await supabase
            .from('sp_service_options')
            .upsert(optPayload, { onConflict: 'id' });

          if (optErr) throw new Error("Failed to save pricing options.");
        }
      }

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during save.");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ color: '#0a217a', margin: 0 }}>Edit Services Menu</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => addService("individual_service")} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0E2679', background: 'white', color: '#0E2679', cursor: 'pointer', fontWeight: '700' }}>+ Individual</button>
              <button type="button" onClick={() => addService("packaged_service")} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0E2679', background: 'white', color: '#0E2679', cursor: 'pointer', fontWeight: '700' }}>+ Package</button>
            </div>
          </div>

          {errorMessage && (
            <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="services-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {services.map((service: any, si: number) => (
                <ServiceCard
                  key={si}
                  service={service}
                  serviceIndex={si}
                  updateService={updateService}
                  removeService={removeService}
                  validationErrors={validationErrors}
                >
                  <div style={{ flex: 1, minWidth: 0, width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
                    <div style={{ minWidth: '650px', paddingRight: '10px' }}>
                      <PricingTable
                        service={service}
                        serviceIndex={si}
                        updatePricing={updatePricing}
                        removePricingRow={removePricingRow}
                        addPricingRow={addPricingRow}
                        validationErrors={validationErrors}
                      />
                    </div>
                  </div>
                </ServiceCard>
              ))}
              
              {services.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b' }}>No services added yet. Click "+ Individual" or "+ Package" above to get started.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
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