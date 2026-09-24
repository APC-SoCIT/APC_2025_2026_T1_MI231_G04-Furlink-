/* src/app/(loggedIn)/service_provider/manage_listing/edit_media/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";
import "../manage_listing.css";

export default function EditMediaPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [spId, setSpId] = useState<string | null>(null);
  const [generalData, setGeneralData] = useState<any>(null);
  
  // Existing Facilities State
  const [existingFacilities, setExistingFacilities] = useState<any[]>([]);
  const [facilitiesToDelete, setFacilitiesToDelete] = useState<string[]>([]);

  // New File Uploads State
  const [newWaiver, setNewWaiver] = useState<File | null>(null);
  const [newPermit, setNewPermit] = useState<File | null>(null);
  const [newPaymentQr, setNewPaymentQr] = useState<File | null>(null);
  const [newFacilities, setNewFacilities] = useState<File[]>([]);

  // 1. Fetch current media and document URLs on load
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: generalInfo, error: genError } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .single();

        if (genError) throw genError;

        if (generalInfo) {
          setSpId(generalInfo.id);
          setGeneralData(generalInfo);

          const { data: imgData } = await supabase
            .from('sp_img_facilities')
            .select('*')
            .eq('sp_id', generalInfo.id);

          setExistingFacilities(imgData || []);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load media.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [supabase]);

  // 2. Dynamic Helper to upload a file to a SPECIFIC Supabase Storage bucket
  const uploadFile = async (userId: string, bucketName: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    
    // Use the userId as a sub-folder to keep things organized per user
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // 3. Process all uploads and database updates
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !spId) throw new Error("Authentication error.");

      // Upload new single documents if provided, targeting their specific buckets
      const waiverUrl = newWaiver ? await uploadFile(user.id, "sp-waiver", newWaiver) : generalData.business_waiver_url;
      const permitUrl = newPermit ? await uploadFile(user.id, "sp-permit", newPermit) : generalData.business_permit_url;
      const paymentUrl = newPaymentQr ? await uploadFile(user.id, "sp-payment-qr", newPaymentQr) : generalData.business_payment_qr_url;

      // Update sp_general_info with the final URLs
      const { error: genUpdateError } = await supabase
        .from('sp_general_info')
        .update({
          business_waiver_url: waiverUrl,
          business_permit_url: permitUrl,
          business_payment_qr_url: paymentUrl,
        })
        .eq('id', spId);

      if (genUpdateError) throw genUpdateError;

      // Clean up removed facility images from the database
      if (facilitiesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('sp_img_facilities')
          .delete()
          .in('id', facilitiesToDelete);
        
        if (deleteError) throw deleteError;
      }

      // Upload new facility images targeting the sp-facility-images bucket
      if (newFacilities.length > 0) {
        const newFacilityUrls: string[] = [];
        for (const file of newFacilities) {
          const url = await uploadFile(user.id, "sp-facility-images", file);
          newFacilityUrls.push(url);
        }

        const facilityPayload = newFacilityUrls.map(url => ({
          sp_id: spId,
          business_facility_images: url
        }));

        const { error: facilityInsertError } = await supabase
          .from('sp_img_facilities')
          .insert(facilityPayload);

        if (facilityInsertError) throw facilityInsertError;
      }

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save media updates.");
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading media...</div>;
  if (!generalData) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading provider data...</div>;
  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <h2 style={{ color: '#0a217a', marginBottom: '20px' }}>Edit Documents & Media</h2>

          {errorMessage && <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{errorMessage}</div>}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Documents Section */}
            <div>
              <h3 style={{ color: '#0a217a', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Business Documents</h3>
              
              <div className="listing-field-group" style={{ marginBottom: '15px' }}>
                <label>Waiver Document</label>
                <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                  Current: {generalData.business_waiver_url === "PLATFORM_DEFAULT_WAIVER" ? "Platform Default" : <a href={generalData.business_waiver_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a' }}>View Document</a>}
                </div>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setNewWaiver(e.target.files?.[0] || null)} style={{ fontSize: '13px' }} />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Upload a new file to replace the current waiver.</span>
              </div>

              <div className="listing-field-group" style={{ marginBottom: '15px' }}>
                <label>Business Permit</label>
                <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                  Current: {generalData.business_permit_url ? <a href={generalData.business_permit_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a' }}>View Document</a> : "None"}
                </div>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setNewPermit(e.target.files?.[0] || null)} style={{ fontSize: '13px' }} />
              </div>

              <div className="listing-field-group">
                <label>Payment QR Code</label>
                <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                  Current: {generalData.business_payment_qr_url ? <a href={generalData.business_payment_qr_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a' }}>View QR</a> : "None"}
                </div>
                <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setNewPaymentQr(e.target.files?.[0] || null)} style={{ fontSize: '13px' }} />
              </div>
            </div>

            {/* Facility Images Section */}
            <div>
              <h3 style={{ color: '#0a217a', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Facility Images</h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                {existingFacilities.filter(f => !facilitiesToDelete.includes(f.id)).map(f => (
                  <div key={f.id} style={{ position: 'relative' }}>
                    <img src={f.business_facility_images} alt="Facility" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <button 
                      type="button" 
                      onClick={() => setFacilitiesToDelete([...facilitiesToDelete, f.id])}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <div className="listing-field-group">
                <label>Add New Images</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".png,.jpg,.jpeg" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewFacilities(Array.from(e.target.files));
                    }
                  }} 
                  style={{ fontSize: '13px' }} 
                />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Select multiple files to upload new facility images.</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => router.push("/service_provider/manage_listing")} style={{ background: '#e0ded6', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ background: '#0a217a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isSaving ? "Saving Media..." : "Save Changes"}</button>
            </div>
          </form>

        </div>
      </div>
      <Footer />
    </div>
  );
}