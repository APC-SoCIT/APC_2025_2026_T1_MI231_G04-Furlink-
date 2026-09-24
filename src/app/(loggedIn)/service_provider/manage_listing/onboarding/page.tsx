/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import "./page.css";

// Extracted Components
import ConfirmationModal from "./ConfirmationModal";
import ApplicationStatusView from "./components/ApplicationStatusView";
import BusinessInfoForm from "./components/BusinessInfoForm";
import ServiceCard from "./components/ServiceCard";
import PricingTable from "./components/PricingTable";
import Footer from "@/components/Footer";

// Hooks & Constants
import { DESCRIPTION_MAX_LENGTH } from "./constants";
import { useValidation } from "./hooks/useValidation";
import { useFileUploads } from "./hooks/useFileUploads";
import { useServiceManager } from "./hooks/useServiceManager";

export default function ServiceProviderOnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // --- Flow & UI State ---
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Application Status States
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true); 
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  
  const [providerId, setProviderId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // --- Business Profile State ---
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    isBranch: false,
    branchName: "",
    description: "", 
    businessEmail: "",
    businessMobile: "", 
    socialMediaUrl: "",
    googleMapUrl: "",
    typeOfService: "Pet Grooming",
    useDefaultWaiver: false, 
    operatingHours: [{
      days: [] as string[],
      startTime: "09:00",
      endTime: "17:00",
      slotDurationHours: 1,
      slotDurationMinutes: 0,
      capacityPerSlot: 1,
    }],
    houseStreet: "", 
    region: "", 
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Philippines",
  });
  
  const [employees, setEmployees] = useState([{ firstName: "", lastName: "", position: "" }]);

  // --- External Hooks ---
  const { errors: validationErrors, setErrors: setValidationErrors, setFieldError, clearFieldError, validate } = useValidation();
  const files = useFileUploads(supabase, providerId, { setFieldError, clearFieldError });
  
  const { 
    services, setServices, addService, removeService, updateService, 
    addPricingRow, removePricingRow, updatePricing, saveServicesToSupabase 
  } = useServiceManager();

  /* -------------------------------------------------------------------- */
  /* INITIAL DATA FETCH & STATUS CHECK (WITH PRE-FILL LOGIC)              */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setProviderId(user.id);

        const { data: generalData, error } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (generalData) {
          setAppStatus(generalData.registration_status);
          setRejectionReason(generalData.registration_rejection_reason);

          if (generalData.registration_status === 'rejected') {
            
            // 1. Parse Business Name & Branch
            let bName = generalData.business_name;
            let isB = false;
            let bBranch = "";
            if (bName.includes(" - ")) {
              const parts = bName.split(" - ");
              bName = parts[0];
              bBranch = parts.slice(1).join(" - ");
              isB = true;
            }

            // 2. Parse Mobile (Remove +63)
            const mobile = generalData.business_contact.startsWith('+63')
              ? generalData.business_contact.replace('+63', '')
              : generalData.business_contact;

            setBusinessInfo(prev => ({
              ...prev,
              businessName: bName,
              isBranch: isB,
              branchName: bBranch,
              description: generalData.business_bio || "",
              businessEmail: generalData.business_email || "",
              businessMobile: mobile || "",
              socialMediaUrl: generalData.business_social_media_url || "",
              googleMapUrl: generalData.business_google_map_url || "",
              typeOfService: generalData.business_service_type || "Pet Grooming",
              useDefaultWaiver: generalData.business_waiver_url === "PLATFORM_DEFAULT_WAIVER",
              houseStreet: generalData.business_street || "",
              region: generalData.business_region || "",
              barangay: generalData.business_barangay || "",
              city: generalData.business_city || "",
              province: generalData.business_province || "",
              postalCode: generalData.business_postal_code || "",
              country: generalData.business_country || "Philippines",
            }));

            // 3. Fetch & Set Employees
            const { data: empData } = await supabase.from('sp_employees_info').select('*').eq('sp_id', generalData.id);
            if (empData && empData.length > 0) {
              setEmployees(empData.map((emp: any) => ({
                firstName: emp.employee_first_name,
                lastName: emp.employee_last_name,
                position: emp.employee_position
              })));
            }

            // 4. Fetch & Set Operating Hours
            const { data: hoursData } = await supabase.from('sp_operating_hours').select('*').eq('sp_id', generalData.id);
            if (hoursData && hoursData.length > 0) {
              const groupedHours: any[] = [];
              hoursData.forEach((row: any) => {
                const startTimeFmt = row.opening_time ? row.opening_time.substring(0, 5) : "09:00"; 
                const endTimeFmt = row.closing_time ? row.closing_time.substring(0, 5) : "17:00";
                const interval = row.slot_interval || 60;
                const capacity = row.slot_capacity || 1;
                
                const match = groupedHours.find(g =>
                  g.startTime === startTimeFmt && g.endTime === endTimeFmt &&
                  (g.slotDurationHours * 60 + g.slotDurationMinutes) === interval &&
                  g.capacityPerSlot === capacity
                );

                if (match) {
                  if (!match.days.includes(row.day_of_week)) match.days.push(row.day_of_week);
                } else {
                  groupedHours.push({
                    days: [row.day_of_week],
                    startTime: startTimeFmt,
                    endTime: endTimeFmt,
                    slotDurationHours: Math.floor(interval / 60),
                    slotDurationMinutes: interval % 60,
                    capacityPerSlot: capacity
                  });
                }
              });
              if (groupedHours.length > 0) setBusinessInfo(prev => ({ ...prev, operatingHours: groupedHours }));
            }

            // 5. Fetch & Set Services and Pricing
            const { data: srvData } = await supabase.from('sp_services').select(`*, sp_service_options (*)`).eq('sp_id', generalData.id);
            if (srvData && srvData.length > 0) {
              const loadedServices = srvData.map((s: any) => ({
                type: s.service_type,
                name: s.service_name,
                description: s.service_description,
                notes: s.service_notes || "",
                haircutIncluded: s.service_haircut_included,
                pricing: (s.sp_service_options || []).map((p: any) => ({
                  petType: p.pet_type,
                  size: p.pet_size,
                  minWeight: p.pet_min_weight_range === 0 ? "" : p.pet_min_weight_range.toString(),
                  maxWeight: p.pet_max_weight_range === 999 ? "" : p.pet_max_weight_range.toString(),
                  price: p.service_price.toString()
                }))
              }));
              setServices(loadedServices);
            }
          }
        }
      } catch (err: unknown) {
        console.error("Error checking application status:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkApplicationStatus();
  }, [supabase, setServices]);

  /* -------------------------------------------------------------------- */
  /* Input Handlers                                                       */
  /* -------------------------------------------------------------------- */
  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "description" && value.length > DESCRIPTION_MAX_LENGTH) return;
    
    if (name === "businessMobile") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 10) setBusinessInfo((prev) => ({ ...prev, [name]: numbersOnly }));
      return;
    }
    
    if (name === "postalCode") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 4) setBusinessInfo((prev) => ({ ...prev, [name]: numbersOnly }));
      return;
    }
    
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (slotIndex: number, day: string) => {
    setBusinessInfo((prev) => {
      const used = prev.operatingHours.some((s, i) => i !== slotIndex && s.days.includes(day));
      if (used) return prev;
      return {
        ...prev,
        operatingHours: prev.operatingHours.map((slot, i) =>
          i === slotIndex ? { ...slot, days: slot.days.includes(day) ? slot.days.filter((d: string) => d !== day) : [...slot.days, day] } : slot
        ),
      };
    });
  };

  const isDayDisabled = (slotIndex: number, day: string) => businessInfo.operatingHours.some((slot, i) => i !== slotIndex && slot.days.includes(day));
  const addTimeSlot = () => setBusinessInfo((prev) => ({ ...prev, operatingHours: [...prev.operatingHours, { days: [] as string[], startTime: "09:00", endTime: "17:00", slotDurationHours: 1, slotDurationMinutes: 0, capacityPerSlot: 1 }] }));
  const removeTimeSlot = (index: number) => setBusinessInfo((prev) => ({ ...prev, operatingHours: prev.operatingHours.filter((_, i) => i !== index) }));
  const handleTimeChange = (slotIndex: number, type: string, value: any) => setBusinessInfo((prev) => ({ ...prev, operatingHours: prev.operatingHours.map((slot, i) => (i === slotIndex ? { ...slot, [type]: value } : slot)) }));

  const handleEmployeeChange = (index: number, field: string, value: string) => setEmployees((prev) => prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp)));
  const addEmployee = () => setEmployees((prev) => [...prev, { firstName: "", lastName: "", position: "" }]);
  const removeEmployee = (index: number) => setEmployees((prev) => prev.filter((_, i) => i !== index));

  /* -------------------------------------------------------------------- */
  /* Flow Control: Validating & Proceeding to Review                      */
  /* -------------------------------------------------------------------- */
  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validate(supabase, providerId, businessInfo, employees, {
      facilityCount: files.facilityCount,
      paymentCount: files.paymentCount,
      hasPermit: files.hasPermit,
    });

    if (!isValid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReviewServices = () => {
    let isValid = true;
    let newErrors: Record<string, string> = { ...(validationErrors as Record<string, string>) };
    
    if (services.length === 0) {
      newErrors.general = "Please add at least one service.";
      isValid = false;
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
          }
        }
      });
    });

    setValidationErrors(newErrors);
    if (!isValid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowConfirmModal(true);
  };

  /* -------------------------------------------------------------------- */
  /* Final Data Persistence (Supabase Submission)                         */
  /* -------------------------------------------------------------------- */
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    clearFieldError("general");
    
    let currentProviderId: string | null = null; 

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const waiverUrl = businessInfo.useDefaultWaiver 
        ? "PLATFORM_DEFAULT_WAIVER" 
        : files.waiverFile 
          ? await files.uploadFileToStorage(user.id, "waivers", files.waiverFile) 
          : (files.existingWaiverUrl || null);

      const permitUrl = files.businessPermitFile ? await files.uploadFileToStorage(user.id, "permits", files.businessPermitFile) : (files.existingPermitUrl || null);
      
      const newFacilityUrls: string[] = [];
      for (const f of files.facilityImages) {
        const u = await files.uploadFileToStorage(user.id, "facilities", f);
        if (u) newFacilityUrls.push(u);
      }

      const newPaymentUrls: string[] = [];
      for (const f of files.paymentChannelFiles) {
        const u = await files.uploadFileToStorage(user.id, "payments", f);
        if (u) newPaymentUrls.push(u);
      }
      
      const finalPaymentUrl = newPaymentUrls.length > 0 ? newPaymentUrls.join(',') : ((files.existingPaymentChannels as any[])?.[0]?.file_url || null);

      const finalBusinessName = businessInfo.isBranch && businessInfo.branchName.trim() !== ""
        ? `${businessInfo.businessName.trim()} - ${businessInfo.branchName.trim()}`
        : businessInfo.businessName.trim();

      const payload = {
        profiles_id: user.id,
        business_name: finalBusinessName,
        business_bio: businessInfo.description,
        business_email: businessInfo.businessEmail,
        business_contact: `+63${businessInfo.businessMobile}`, 
        business_street: businessInfo.houseStreet,
        business_region: businessInfo.region,
        business_barangay: businessInfo.barangay,
        business_city: businessInfo.city,
        business_province: businessInfo.province,
        business_postal_code: businessInfo.postalCode,
        business_country: businessInfo.country,
        business_service_type: businessInfo.typeOfService,
        business_social_media_url: businessInfo.socialMediaUrl || null,
        business_google_map_url: businessInfo.googleMapUrl || null,
        business_waiver_url: waiverUrl,
        business_permit_url: permitUrl,
        business_payment_qr_url: finalPaymentUrl,
        registration_status: 'pending',
        registration_rejection_reason: null,
        business_latitude: 0, 
        business_longitude: 0,
        updated_at: new Date().toISOString(),
      };

      const { data: upsertData, error: upsertError } = await supabase.from("sp_general_info").upsert(payload, { onConflict: 'profiles_id' }).select().single();
      if (upsertError) throw upsertError;
      
      currentProviderId = upsertData.id;
      if (!currentProviderId) throw new Error("Failed to retrieve provider ID after saving general info.");

      await Promise.all([
        supabase.from("sp_operating_hours").delete().eq("sp_id", currentProviderId),
        supabase.from("sp_employees_info").delete().eq("sp_id", currentProviderId),
      ]);

      const hoursPayload: any[] = [];
      businessInfo.operatingHours.forEach(slot => {
        const totalMinutes = (slot.slotDurationHours * 60) + slot.slotDurationMinutes;
        slot.days.forEach(day => {
          hoursPayload.push({
            sp_id: currentProviderId, 
            day_of_week: day,
            opening_time: slot.startTime,
            closing_time: slot.endTime,
            slot_interval: totalMinutes,
            slot_capacity: slot.capacityPerSlot,
          });
        });
      });
      
      if (hoursPayload.length > 0) {
        const { error: hError } = await supabase.from("sp_operating_hours").insert(hoursPayload);
        if (hError) throw hError;
      }

      if (newFacilityUrls.length > 0) {
        const imgPayload = newFacilityUrls.map(url => ({ sp_id: currentProviderId, business_facility_images: url })); 
        const { error: imgErr } = await supabase.from("sp_img_facilities").insert(imgPayload);
        if (imgErr) throw imgErr;
      }

      const staffPayload = employees.map(emp => ({
        sp_id: currentProviderId, 
        employee_first_name: emp.firstName.trim(),
        employee_last_name: emp.lastName.trim(),
        employee_position: emp.position,
      }));
      if (staffPayload.length > 0) {
        const { error: sError } = await supabase.from("sp_employees_info").insert(staffPayload);
        if (sError) throw sError;
      }

      const serviceSaveResult = await saveServicesToSupabase(supabase, currentProviderId); 
      if (!serviceSaveResult.success) throw new Error("Services save failed: " + serviceSaveResult.message);

      setShowConfirmModal(false);
      setAppStatus('pending');
      window.scrollTo({ top: 0, behavior: "smooth" });
      // -----------------------------------------

      setShowConfirmModal(false);
      setAppStatus('pending');
      window.scrollTo({ top: 0, behavior: "smooth" });
      setShowConfirmModal(false);
      setAppStatus('pending');
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err: any) {
      console.error("SUBMISSION FAILED:", err);
      
      try {
        if (currentProviderId) {
          await Promise.all([
            supabase.from("sp_services").delete().eq("sp_id", currentProviderId),
            supabase.from("sp_employees_info").delete().eq("sp_id", currentProviderId),
            supabase.from("sp_img_facilities").delete().eq("sp_id", currentProviderId),
            supabase.from("sp_operating_hours").delete().eq("sp_id", currentProviderId)
          ]);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("sp_general_info").delete().eq("profiles_id", user.id);
            console.log("Rolled back partial database records successfully.");
          }
        }
      } catch (cleanupErr) {
        console.error("Failed to clean up orphaned records:", cleanupErr);
      }

      setFieldError("general", "Submission failed: " + (err.message || err.details || "An unexpected error occurred."));
      setShowConfirmModal(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------- */
  /* CONDITIONAL RENDERING BASED ON STATUS                                */
  /* -------------------------------------------------------------------- */
  
  if (isCheckingStatus) return <ApplicationStatusView status="loading" />;
  if (appStatus === 'pending') return <ApplicationStatusView status="pending" />;
  if (appStatus === 'approved') return <ApplicationStatusView status="approved" />;

  return (
    <>
      <div className="apply-provider-wrapper">
        <h1 className="page-title">Service Provider Application</h1>
        
        {appStatus === 'rejected' && (
          <div 
            style={{ 
              background: '#fff1f2', 
              border: '1px solid #fecdd3', 
              borderLeft: '4px solid #e11d48',
              color: '#881337', 
              marginBottom: '30px', 
              padding: '20px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
          >
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1rem', color: '#9f1239' }}>Application Requires Updates</strong>
                <span style={{ fontSize: '0.8rem', background: '#ffe4e6', color: '#be123c', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Action Required</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#4c0519', lineHeight: '1.5' }}>
                Your previous application was returned with feedback: <strong style={{ color: '#881337' }}>"{rejectionReason || "Please review our guidelines and update your application below."}"</strong> Please make the necessary adjustments to your details or documents below and resubmit for review.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
          <span style={{ fontWeight: step === 1 ? '700' : 'normal', color: step === 1 ? '#0E2679' : '#9ca3af' }}>1. Business Info</span>
          <span style={{ color: '#9ca3af' }}>&gt;</span>
          <span style={{ fontWeight: step === 2 ? '700' : 'normal', color: step === 2 ? '#0E2679' : '#9ca3af' }}>2. Services & Pricing</span>
        </div>

        {(validationErrors as any).general && (
          <div className="error-banner">
            <span>⚠️ {(validationErrors as any).general}</span>
          </div>
        )}

        {/* STEP 1: Extracted into BusinessInfoForm.tsx */}
        {step === 1 && (
          <BusinessInfoForm
            businessInfo={businessInfo}
            setBusinessInfo={setBusinessInfo}
            employees={employees}
            validationErrors={validationErrors}
            files={files}
            handleBusinessChange={handleBusinessChange}
            toggleDay={toggleDay}
            isDayDisabled={isDayDisabled}
            addTimeSlot={addTimeSlot}
            removeTimeSlot={removeTimeSlot}
            handleTimeChange={handleTimeChange}
            handleEmployeeChange={handleEmployeeChange}
            addEmployee={addEmployee}
            removeEmployee={removeEmployee}
            handleNextStep={handleNextStep}
          />
        )}

        {step === 2 && (
          <div className="apply-provider-form">
            <section className="form-section" style={{ background: 'transparent', border: 'none', padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Service Menu</h2>
                <div className="add-service-buttons" style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => addService("individual_service")} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0E2679', background: 'white', color: '#0E2679', cursor: 'pointer', fontWeight: '700' }}>+ Individual</button>
                  <button type="button" onClick={() => addService("packaged_service")} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0E2679', background: 'white', color: '#0E2679', cursor: 'pointer', fontWeight: '700' }}>+ Package</button>
                </div>
              </div>

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
                    <PricingTable
                      service={service}
                      serviceIndex={si}
                      updatePricing={updatePricing}
                      removePricingRow={removePricingRow}
                      addPricingRow={addPricingRow}
                      validationErrors={validationErrors}
                    />
                  </ServiceCard>
                ))}
              </div>
            </section>

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                disabled={isSubmitting}
              >
                Back to Business Info
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleReviewServices} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Review Application"}
              </button>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmSubmit}
          isSubmitting={isSubmitting}
          data={businessInfo}
          services={services}
          files={{
            waiverFile: files.waiverFile, existingWaiverUrl: files.existingWaiverUrl,
            facilityImages: files.facilityImages, existingFacilityImages: files.existingFacilityImages,
            paymentChannelFiles: files.paymentChannelFiles, existingPaymentChannels: files.existingPaymentChannels,
            businessPermitFile: files.businessPermitFile, existingPermitUrl: files.existingPermitUrl,
            employees,
          }}
        />
      </div>
      <Footer />
    </>
  );
}