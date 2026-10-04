/* src/app/(loggedIn)/service_provider/manage_listing/edit_media/page.tsx */
'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Footer from "@/components/Footer";
import "../manage_listing.css";

// Match Onboarding Validation Constants
const DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const IMG_TYPES = ["image/jpeg", "image/png", "image/jpg"];

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

  // Input Refs for clearing values when the user clicks "Remove" (TS Fix: Added | null)
  const waiverRef = useRef<HTMLInputElement | null>(null);
  const permitRef = useRef<HTMLInputElement | null>(null);
  const qrRef = useRef<HTMLInputElement | null>(null);
  const facilitiesRef = useRef<HTMLInputElement | null>(null);

  // Image Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required.");

        const { data: generalInfo, error: genError } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .single();

        if (genError || !generalInfo) throw new Error("Could not fetch provider profile data.");

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
        setErrorMessage(err?.message || "Failed to load media.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [supabase]);

  // Reusable File Validation Helper (Matches Onboarding)
  const validateFile = (file: File, type: 'doc' | 'img', maxMb: number): string | null => {
    const maxSize = maxMb * 1024 * 1024;
    if (type === 'doc' && !DOC_TYPES.includes(file.type)) return "Invalid document type. Please upload a PDF or Word document.";
    if (type === 'img' && !IMG_TYPES.includes(file.type)) return "Invalid image type. Please upload a JPG or PNG.";
    if (file.size > maxSize) return `File is too large. Maximum size is ${maxMb}MB.`;
    return null;
  };

  // Handler for Single File Uploads (Waiver, Permit, QR)
  const handleSingleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setFileState: React.Dispatch<React.SetStateAction<File | null>>, 
    type: 'doc' | 'img', 
    maxMb: number
  ) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file, type, maxMb);
    if (error) {
      setErrorMessage(error);
      e.target.value = ""; // Clear invalid file from input
      setFileState(null);
      return;
    }
    
    setFileState(file);
  };

  // Handler for Multiple Facility Images with strict Max 3 Limit Check
  const handleFacilitySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = Array.from(e.target.files || []);
    
    // Calculate total images: Existing - Scheduled for Deletion + Already Staged + Newly Selected
    const currentCount = existingFacilities.length - facilitiesToDelete.length;
    
    if (currentCount + newFacilities.length + files.length > 3) {
      setErrorMessage("You can only have a maximum of 3 facility images in total.");
      if (facilitiesRef.current) facilitiesRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file, 'img', 1); // 1MB Max for facilities
      if (error) {
        setErrorMessage(error);
        if (facilitiesRef.current) facilitiesRef.current.value = "";
        return;
      }
      validFiles.push(file);
    }

    setNewFacilities(prev => [...prev, ...validFiles]);
    if (facilitiesRef.current) facilitiesRef.current.value = ""; // Clear input to allow accumulating more clicks
  };

  // Helper to remove a single file from state and reset its corresponding input (TS Fix: Added | null)
  const clearSingleFile = (setFileState: React.Dispatch<React.SetStateAction<File | null>>, ref: React.MutableRefObject<HTMLInputElement | null> | React.RefObject<HTMLInputElement | null>) => {
    setFileState(null);
    if (ref.current) ref.current.value = "";
  };

  // Dynamic Helper to upload a file to a SPECIFIC Supabase Storage bucket
  const uploadFile = async (userId: string, bucketName: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
    if (uploadError) throw new Error(`Failed to upload file to ${bucketName}.`);

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrl;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !spId) throw new Error("Authentication error. Please log in again.");

      const waiverUrl = newWaiver ? await uploadFile(user.id, "sp-waiver", newWaiver) : generalData.business_waiver_url;
      const permitUrl = newPermit ? await uploadFile(user.id, "sp-permit", newPermit) : generalData.business_permit_url;
      const paymentUrl = newPaymentQr ? await uploadFile(user.id, "sp-payment-qr", newPaymentQr) : generalData.business_payment_qr_url;

      const { error: genUpdateError } = await supabase
        .from('sp_general_info')
        .update({
          business_waiver_url: waiverUrl,
          business_permit_url: permitUrl,
          business_payment_qr_url: paymentUrl,
        })
        .eq('id', spId);

      if (genUpdateError) throw new Error("Failed to update general business documents.");

      if (facilitiesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('sp_img_facilities')
          .delete()
          .in('id', facilitiesToDelete);
        
        if (deleteError) throw new Error("Failed to remove selected facility images.");
      }

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

        if (facilityInsertError) throw new Error("Failed to save new facility images.");
      }

      router.push("/service_provider/manage_listing");
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while saving media updates.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading media...</div>;
  if (!generalData) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading provider data...</div>;
  
  return (
    <div className="manage-listing-page-layout">
      {/* Lightbox / Modal for enlarged image view */}
      {selectedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={selectedImage} alt="Enlarged Facility" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
            <button type="button" onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#fff', color: '#333', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>&times;</button>
          </div>
        </div>
      )}

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
                <div style={{ fontSize: '13px', marginBottom: '10px', wordBreak: 'break-all' }}>
                  Current: {' '}
                  {generalData.business_waiver_url === "PLATFORM_DEFAULT_WAIVER" || generalData.business_waiver_url?.includes('furlink-standard-waiver.pdf') ? (
                    <a href="/service_provider/waiver" target="_blank" rel="noopener noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>Platform Default</a>
                  ) : (
                    <a href={generalData.business_waiver_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>View Document</a>
                  )}
                </div>
                <input type="file" ref={waiverRef} accept=".pdf,.doc,.docx" onChange={(e) => handleSingleFileSelect(e, setNewWaiver, 'doc', 1)} style={{ fontSize: '13px', width: '100%' }} />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>Upload a new file to replace the current waiver (.pdf, .doc, .docx | Max 1MB).</span>
                {newWaiver && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#0E2679', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📄 {newWaiver.name}
                    <button type="button" onClick={() => clearSingleFile(setNewWaiver, waiverRef)} style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold' }}>✕ Remove</button>
                  </div>
                )}
              </div>

              <div className="listing-field-group" style={{ marginBottom: '15px' }}>
                <label>Business Permit</label>
                <div style={{ fontSize: '13px', marginBottom: '10px', wordBreak: 'break-all' }}>
                  Current: {generalData.business_permit_url ? <a href={generalData.business_permit_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>View Document</a> : "None"}
                </div>
                <input type="file" ref={permitRef} accept=".pdf,.doc,.docx" onChange={(e) => handleSingleFileSelect(e, setNewPermit, 'doc', 2)} style={{ fontSize: '13px', width: '100%' }} />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>Upload a new file to replace the current business permit (.pdf, .doc, .docx | Max 2MB).</span>
                {newPermit && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#0E2679', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📄 {newPermit.name}
                    <button type="button" onClick={() => clearSingleFile(setNewPermit, permitRef)} style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold' }}>✕ Remove</button>
                  </div>
                )}
              </div>

              <div className="listing-field-group">
                <label>Payment QR Code</label>
                <div style={{ fontSize: '13px', marginBottom: '10px', wordBreak: 'break-all' }}>
                  Current: {generalData.business_payment_qr_url ? <a href={generalData.business_payment_qr_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>View QR</a> : "None"}
                </div>
                <input type="file" ref={qrRef} accept=".png,.jpg,.jpeg" onChange={(e) => handleSingleFileSelect(e, setNewPaymentQr, 'img', 1)} style={{ fontSize: '13px', width: '100%' }} />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>Upload a new file to replace the current payment QR code (.jpg, .png | Max 1MB).</span>
                {newPaymentQr && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#0E2679', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🖼️ {newPaymentQr.name}
                    <button type="button" onClick={() => clearSingleFile(setNewPaymentQr, qrRef)} style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold' }}>✕ Remove</button>
                  </div>
                )}
              </div>
            </div>

            {/* Facility Images Section */}
            <div>
              <h3 style={{ color: '#0a217a', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Facility Images (Max 3)</h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                {existingFacilities.filter(f => !facilitiesToDelete.includes(f.id)).map(f => (
                  <div key={f.id} style={{ position: 'relative' }}>
                    <img 
                      src={f.business_facility_images} 
                      alt="Facility" 
                      onClick={() => setSelectedImage(f.business_facility_images)}
                      style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }} 
                      title="Click to view larger"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFacilitiesToDelete([...facilitiesToDelete, f.id])}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                      title="Remove image"
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
                  ref={facilitiesRef}
                  multiple 
                  accept=".png,.jpg,.jpeg" 
                  onChange={handleFacilitySelect} 
                  style={{ fontSize: '13px', width: '100%' }} 
                />
                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>Select multiple files to upload new facility images (.jpg, .png | Max 1MB each).</span>
                
                {/* List of newly staged facility images */}
                {newFacilities.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '12px', color: '#333' }}>Staged for Upload:</strong>
                    {newFacilities.map((f, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#0E2679', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🖼️ {f.name}
                        <button 
                          type="button" 
                          onClick={() => setNewFacilities(prev => prev.filter((_, index) => index !== i))} 
                          style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
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