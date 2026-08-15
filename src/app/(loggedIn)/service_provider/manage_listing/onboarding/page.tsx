/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import "./page.css";

import ConfirmationModal from "./ConfirmationModal";
import { POSITION_OPTIONS, DAYS_OF_WEEK_SHORT, DAYS_OF_WEEK_FULL, DESCRIPTION_MAX_LENGTH } from "./constants";
import { useValidation } from "./hooks/useValidation";
import { useFileUploads } from "./hooks/useFileUploads";

// Modularized Service Management Hooks & Components
import { useServiceManager } from "./hooks/useServiceManager";
import ServiceCard from "./components/ServiceCard";
import PricingTable from "./components/PricingTable";

export default function ServiceProviderOnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // --- Flow & UI State ---
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // NEW: Application Status States
  const [isCheckingStatus, setIsCheckingStatus] = useState(true); 
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  
  const [providerId, setProviderId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // --- Business Profile State ---
  // Note: These start blank, giving rejected users the "fresh form" experience they need.
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
      days: [],
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
    services, addService, removeService, updateService, 
    addPricingRow, removePricingRow, updatePricing, saveServicesToSupabase 
  } = useServiceManager();

  /* -------------------------------------------------------------------- */
  /* INITIAL DATA FETCH & STATUS CHECK                                    */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // We set this so useValidation knows the user's ID to prevent them from flagging their own duplicate business name
        setProviderId(user.id);

        const { data, error } = await supabase
          .from('sp_general_info')
          .select('registration_status, registration_rejection_reason')
          .eq('profiles_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // Ignore no rows error (new user)

        if (data) {
          setAppStatus(data.registration_status);
          setRejectionReason(data.registration_rejection_reason);
        }
      } catch (err) {
        console.error("Error checking application status:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkApplicationStatus();
  }, [supabase]);

  /* -------------------------------------------------------------------- */
  /* Input Handlers                                                       */
  /* -------------------------------------------------------------------- */
  const handleBusinessChange = (e) => {
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

  const toggleDay = (slotIndex, day) => {
    setBusinessInfo((prev) => {
      const used = prev.operatingHours.some((s, i) => i !== slotIndex && s.days.includes(day));
      if (used) return prev;
      return {
        ...prev,
        operatingHours: prev.operatingHours.map((slot, i) =>
          i === slotIndex ? { ...slot, days: slot.days.includes(day) ? slot.days.filter((d) => d !== day) : [...slot.days, day] } : slot
        ),
      };
    });
  };

  const isDayDisabled = (slotIndex, day) => businessInfo.operatingHours.some((slot, i) => i !== slotIndex && slot.days.includes(day));
  const addTimeSlot = () => setBusinessInfo((prev) => ({ ...prev, operatingHours: [...prev.operatingHours, { days: [], startTime: "09:00", endTime: "17:00" }] }));
  const removeTimeSlot = (index) => setBusinessInfo((prev) => ({ ...prev, operatingHours: prev.operatingHours.filter((_, i) => i !== index) }));
  const handleTimeChange = (slotIndex, type, value) => setBusinessInfo((prev) => ({ ...prev, operatingHours: prev.operatingHours.map((slot, i) => (i === slotIndex ? { ...slot, [type]: value } : slot)) }));

  const handleEmployeeChange = (index, field, value) => setEmployees((prev) => prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp)));
  const addEmployee = () => setEmployees((prev) => [...prev, { firstName: "", lastName: "", position: "" }]);
  const removeEmployee = (index) => setEmployees((prev) => prev.filter((_, i) => i !== index));

  /* -------------------------------------------------------------------- */
  /* Flow Control: Validating & Proceeding to Review                      */
  /* -------------------------------------------------------------------- */
  const handleNextStep = async (e) => {
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
    let newErrors = { ...validationErrors };
    
    if (services.length === 0) {
      newErrors.general = "Please add at least one service.";
      isValid = false;
    }

    services.forEach((s, si) => {
      if (!s.name.trim()) { newErrors[`service_${si}_name`] = "Required"; isValid = false; }
      s.pricing.forEach((p, pi) => {
        if (!p.price || parseFloat(p.price) <= 0) { newErrors[`service_${si}_pricing_${pi}_price`] = "Required"; isValid = false; }
        if (p.size !== "cat" && p.size !== "all") {
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const waiverUrl = businessInfo.useDefaultWaiver 
        ? "PLATFORM_DEFAULT_WAIVER" 
        : files.waiverFile 
          ? await files.uploadFileToStorage(user.id, "waivers", files.waiverFile) 
          : (files.existingWaiverUrl || null);

      const permitUrl = files.businessPermitFile ? await files.uploadFileToStorage(user.id, "permits", files.businessPermitFile) : (files.existingPermitUrl || null);
      
      const newFacilityUrls = [];
      for (const f of files.facilityImages) {
        const u = await files.uploadFileToStorage(user.id, "facilities", f);
        if (u) newFacilityUrls.push(u);
      }

      const newPaymentUrls = [];
      for (const f of files.paymentChannelFiles) {
        const u = await files.uploadFileToStorage(user.id, "payments", f);
        if (u) newPaymentUrls.push(u);
      }
      
      const finalPaymentUrl = newPaymentUrls.length > 0 ? newPaymentUrls.join(',') : (files.existingPaymentChannels?.[0]?.file_url || null);

      const finalBusinessName = businessInfo.isBranch && businessInfo.branchName.trim() !== ""
        ? `${businessInfo.businessName.trim()} - ${businessInfo.branchName.trim()}`
        : businessInfo.businessName.trim();

      // 2. Upsert Core Business Profile (sp_general_info)
      // Because profiles_id is UNIQUE, this safely overwrites the rejected record and resets status back to pending.
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
      const currentProviderId = upsertData.id;

      // 3. Clear and replace nested relation data (Hours & Employees only)
      await Promise.all([
        supabase.from("sp_operating_hours").delete().eq("sp_id", currentProviderId),
        supabase.from("sp_employees_info").delete().eq("sp_id", currentProviderId),
      ]);

      const hoursPayload = [];
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

      // 4. Save Services & Pricing
      const serviceSaveResult = await saveServicesToSupabase(supabase, currentProviderId);
      if (!serviceSaveResult.success) throw new Error("Services save failed: " + serviceSaveResult.message);

      // 5. Completion
      setShowConfirmModal(false);
      setAppStatus('pending'); // Manually trigger the pending UI screen
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error("SUBMISSION FAILED:", JSON.stringify(err, null, 2), err);
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
  
  if (isCheckingStatus) {
    return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#0E2679', fontWeight: 'bold' }}>Loading Application...</div>;
  }

  // BLOCK: Already Pending
  if (appStatus === 'pending') {
    return (
      <div className="apply-provider-wrapper" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 className="page-title">Application Under Review</h1>
        <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#0E2679', marginBottom: '16px' }}>Your application is currently pending admin approval.</h2>
          <p style={{ color: '#4b5563', lineHeight: '1.6' }}>We will notify you once your business has been reviewed. You cannot submit another application while one is actively under review. Please check back later.</p>
        </div>
      </div>
    );
  }

  // BLOCK: Already Approved (They shouldn't theoretically hit this page, but as a safeguard)
  if (appStatus === 'approved') {
    return (
      <div className="apply-provider-wrapper" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#ecfdf5', padding: '40px', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#059669', marginBottom: '16px' }}>You are already an approved Service Provider!</h2>
          <button onClick={() => router.push(ROUTES.SERVICE_PROVIDER.DASHBOARD)} className="btn-primary" style={{ marginTop: '20px' }}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  // ALLOW: 'rejected' or null (New Users)
  return (
    <div className="apply-provider-wrapper">
      <h1 className="page-title">Service Provider Application</h1>
      
      {/* NEW: Rejection Banner Alert */}
      {appStatus === 'rejected' && (
        <div className="error-banner" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', marginBottom: '25px', padding: '16px', borderRadius: '8px' }}>
          <strong>Your previous application was rejected.</strong>
          <p style={{ margin: '8px 0 0 0' }}><strong>Reason:</strong> {rejectionReason || "Please review our guidelines and try submitting a new application."}</p>
        </div>
      )}

      {/* Dynamic Wizard Progress Indicator */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
        <span style={{ fontWeight: step === 1 ? '700' : 'normal', color: step === 1 ? '#0E2679' : '#9ca3af' }}>1. Business Info</span>
        <span style={{ color: '#9ca3af' }}>&gt;</span>
        <span style={{ fontWeight: step === 2 ? '700' : 'normal', color: step === 2 ? '#0E2679' : '#9ca3af' }}>2. Services & Pricing</span>
      </div>

      {validationErrors.general && (
        <div className="error-banner">
          <span>⚠️ {validationErrors.general}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 1: BUSINESS INFO, DOCS, STAFF & HOURS */}
      {/* ========================================== */}
      {step === 1 && (
        <form className="apply-provider-form" onSubmit={handleNextStep}>
          
          <section className="form-section">
            <h2>Business Information</h2>
            <div className="form-grid-3">
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Business Name*</label>
                <input type="text" name="businessName" value={businessInfo.businessName} onChange={handleBusinessChange} className={validationErrors.businessName ? "input-error" : ""} />
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginTop: '6px', fontSize: '0.8rem', fontWeight: 'normal', color: '#4b5563', cursor: 'pointer', width: 'fit-content' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                    checked={businessInfo.isBranch} 
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, isBranch: e.target.checked, branchName: e.target.checked ? prev.branchName : "" }))}
                  />
                  This is a specific branch/location
                </label>
                {validationErrors.businessName && <small className="error">{validationErrors.businessName}</small>}
              </div>

              {businessInfo.isBranch && (
                <div className="form-group fade-in-fast">
                  <label>Branch Name / Location*</label>
                  <input 
                    type="text" 
                    name="branchName" 
                    value={businessInfo.branchName} 
                    onChange={handleBusinessChange} 
                    placeholder="e.g., SM Mall of Asia"
                    className={validationErrors.branchName ? "input-error" : ""} 
                  />
                  {validationErrors.branchName && <small className="error">{validationErrors.branchName}</small>}
                </div>
              )}

              <div className="form-group">
                <label>Email*</label>
                <input type="email" name="businessEmail" value={businessInfo.businessEmail} onChange={handleBusinessChange} className={validationErrors.businessEmail ? "input-error" : ""} />
                {validationErrors.businessEmail && <small className="error">{validationErrors.businessEmail}</small>}
              </div>
              
              <div className="form-group">
                <label>Mobile Number*</label>
                <div className={`phone-input-wrapper ${validationErrors.businessMobile ? "input-error" : ""}`}>
                  <span className="phone-prefix">+63</span>
                  <input 
                    type="tel" 
                    name="businessMobile" 
                    value={businessInfo.businessMobile} 
                    onChange={handleBusinessChange} 
                    placeholder="920 667 2166" 
                    maxLength={10}
                    className="phone-input-field"
                  />
                </div>
                {validationErrors.businessMobile && <small className="error">{validationErrors.businessMobile}</small>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Service Type</label>
                <input type="text" name="typeOfService" value={businessInfo.typeOfService} disabled className="input-disabled" />
              </div>
              <div className="form-group">
                <label>Social Media URL</label>
                <input type="url" name="socialMediaUrl" value={businessInfo.socialMediaUrl} onChange={handleBusinessChange} placeholder="https://facebook.com/..." className={validationErrors.socialMediaUrl ? "input-error" : ""} />
                {validationErrors.socialMediaUrl && <small className="error">{validationErrors.socialMediaUrl}</small>}
              </div>
              <div className="form-group">
                <label>Google Map Link</label>
                <input type="url" name="googleMapUrl" value={businessInfo.googleMapUrl} onChange={handleBusinessChange} placeholder="https://maps.google.com/..." className={validationErrors.googleMapUrl ? "input-error" : ""} />
                {validationErrors.googleMapUrl && <small className="error">{validationErrors.googleMapUrl}</small>}
              </div>
            </div>

            <div className="form-group description-container">
              <div className="description-label-row">
                <label>Business Description*</label>
                <span className={`description-char-count ${businessInfo.description.length >= DESCRIPTION_MAX_LENGTH ? 'limit' : 'normal'}`}>
                  {businessInfo.description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <textarea name="description" value={businessInfo.description} onChange={handleBusinessChange} rows={5} maxLength={DESCRIPTION_MAX_LENGTH} placeholder="Tell us about your business, services, and what makes you unique..." className={`description-textarea ${validationErrors.description ? 'input-error' : ''}`} />
              {validationErrors.description && <small className="error">{validationErrors.description}</small>}
            </div>

            <div className="form-group operating-hours-container">
              <label>Operating Hours & Slot Capacity*</label>
              {businessInfo.operatingHours.map((slot, i) => (
                <div key={i} className="operating-slot-enhanced">
                  <div className="day-buttons">
                    {DAYS_OF_WEEK_FULL.map((d, idx) => (
                      <button key={d} type="button" className={`day-btn ${slot.days.includes(d) ? "active" : ""} ${isDayDisabled(i, d) ? "disabled" : ""}`} onClick={() => toggleDay(i, d)} disabled={isDayDisabled(i, d)}>{DAYS_OF_WEEK_SHORT[idx]}</button>
                    ))}
                  </div>

                  <div className="time-config-row-single">
                    <div className="input-unit">
                      <label>Hours:</label>
                      <div className="time-inputs-compact">
                        <input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(i, "startTime", e.target.value)} />
                        <span>-</span>
                        <input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(i, "endTime", e.target.value)} />
                      </div>
                    </div>
                    <div className="input-unit">
                      <label>Slot Every:</label>
                      <div className="duration-inputs-compact">
                        <input type="number" min="0" value={slot.slotDurationHours} onChange={(e) => handleTimeChange(i, "slotDurationHours", parseInt(e.target.value) || 0)} />
                        <span>hr</span>
                        <input type="number" min="0" value={slot.slotDurationMinutes} onChange={(e) => handleTimeChange(i, "slotDurationMinutes", parseInt(e.target.value) || 0)} />
                        <span>min</span>
                      </div>
                    </div>
                    <div className="input-unit">
                      <label>Capacity:</label>
                      <div className="capacity-input-compact">
                        <input type="number" min="1" value={slot.capacityPerSlot} onChange={(e) => handleTimeChange(i, "capacityPerSlot", parseInt(e.target.value) || 1)} />
                        <span>pets</span>
                      </div>
                    </div>
                    {businessInfo.operatingHours.length > 1 && (
                      <button type="button" onClick={() => removeTimeSlot(i)} className="remove-inline-btn" title="Remove Schedule">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addTimeSlot}>+ Add Different Schedule</button>
            </div>
          </section>

          <section className="form-section">
            <h2>Business Address</h2>
            <div className="form-grid-3">
              <div className="form-group"><label>Street / House No.*</label><input type="text" name="houseStreet" value={businessInfo.houseStreet} onChange={handleBusinessChange} className={validationErrors.houseStreet ? "input-error" : ""} />{validationErrors.houseStreet && <small className="error">{validationErrors.houseStreet}</small>}</div>
              <div className="form-group"><label>Region*</label><input type="text" name="region" value={businessInfo.region} onChange={handleBusinessChange} className={validationErrors.region ? "input-error" : ""} />{validationErrors.region && <small className="error">{validationErrors.region}</small>}</div>
              <div className="form-group"><label>Province*</label><input type="text" name="province" value={businessInfo.province} onChange={handleBusinessChange} className={validationErrors.province ? "input-error" : ""} />{validationErrors.province && <small className="error">{validationErrors.province}</small>}</div>
              <div className="form-group"><label>City / Municipality*</label><input type="text" name="city" value={businessInfo.city} onChange={handleBusinessChange} className={validationErrors.city ? "input-error" : ""} />{validationErrors.city && <small className="error">{validationErrors.city}</small>}</div>
              <div className="form-group"><label>Barangay*</label><input type="text" name="barangay" value={businessInfo.barangay} onChange={handleBusinessChange} className={validationErrors.barangay ? "input-error" : ""} />{validationErrors.barangay && <small className="error">{validationErrors.barangay}</small>}</div>
              <div className="form-group"><label>Postal Code*</label><input type="text" name="postalCode" value={businessInfo.postalCode} onChange={handleBusinessChange} maxLength={4} className={validationErrors.postalCode ? "input-error" : ""} />{validationErrors.postalCode && <small className="error">{validationErrors.postalCode}</small>}</div>
              <div className="form-group"><label>Country</label><input type="text" name="country" value={businessInfo.country} disabled className="input-disabled" /></div>
            </div>
          </section>

          <section className="form-section">
            <h2>Documents & Uploads</h2>
            
            <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', color: '#0E2679', display: 'block', marginBottom: '8px' }}>📄 Liability Waiver Guidelines</span>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                <strong>Purpose:</strong> This waiver protects both your establishment and the pet owners by outlining liability terms during grooming services. <br/>
                <strong>Instructions:</strong> Please upload your own signed waiver. If you don't have a waiver, the platform has a standard <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#0E2679', textDecoration: 'underline', fontWeight: '600' }}>waiver</a> you can use.
              </p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#0E2679', fontWeight: '600', cursor: 'pointer', width: 'fit-content' }}>
                <input 
                  type="checkbox" 
                  checked={businessInfo.useDefaultWaiver} 
                  onChange={(e) => {
                    setBusinessInfo(prev => ({ ...prev, useDefaultWaiver: e.target.checked }));
                    if (e.target.checked && files.waiverFile) files.setWaiverFile(null);
                  }} 
                  style={{ cursor: 'pointer', margin: 0, width: 'auto' }}
                />
                I will use the platform's standard waiver
              </label>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Waiver</label>
                <label className="file-btn" style={{ pointerEvents: businessInfo.useDefaultWaiver ? 'none' : 'auto', opacity: businessInfo.useDefaultWaiver ? 0.6 : 1, background: businessInfo.useDefaultWaiver ? '#f1f5f9' : '' }}>
                  📁 <span>{businessInfo.useDefaultWaiver ? "Using Platform Waiver" : "Select File (Max 1MB)"}</span>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => files.handleFileSelect(files.setWaiverFile, e, 1, "waiverFile")} hidden disabled={businessInfo.useDefaultWaiver} />
                </label>
                
                <div className="file-preview-small" style={{ opacity: businessInfo.useDefaultWaiver ? 0.5 : 1 }}>
                  {files.waiverFile ? (<span>{files.waiverFile.name} <span onClick={() => !businessInfo.useDefaultWaiver && files.setWaiverFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>) : files.existingWaiverUrl && !businessInfo.useDefaultWaiver ? (<span><a href={files.existingWaiverUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setWaiverFile, files.setExistingWaiverUrl)} style={{ cursor: 'pointer' }}>✕</span></span>) : null}
                </div>
                {validationErrors.waiverFile && !businessInfo.useDefaultWaiver && <small className="error">{validationErrors.waiverFile}</small>}
              </div>

              <div className="form-group">
                <label>Business Permit*</label>
                <label className={`file-btn ${validationErrors.businessPermitFile ? "input-error" : ""}`}>📁 <span>Select File (Max 2MB)</span><input type="file" accept=".pdf,.doc,.docx" onChange={(e) => files.handleFileSelect(files.setBusinessPermitFile, e, 2, "businessPermitFile")} hidden /></label>
                <div className="file-preview-small">
                  {files.businessPermitFile ? (<span>{files.businessPermitFile.name} <span onClick={() => files.setBusinessPermitFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>) : files.existingPermitUrl ? (<span><a href={files.existingPermitUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setBusinessPermitFile, files.setExistingPermitUrl)} style={{ cursor: 'pointer' }}>✕</span></span>) : null}
                </div>
                {validationErrors.businessPermitFile && <small className="error">{validationErrors.businessPermitFile}</small>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Facility Images (Max 3)*</label>
                <label className={`file-btn ${validationErrors.facilityImages ? "input-error" : ""}`}>📁 <span>Select Images (Max 1MB each)</span><input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e) => files.handleMultiFileSelect(files.setFacilityImages, files.facilityImages, e, 3, "facilityImages", files.existingFacilityImages.length, 1)} hidden /></label>
                <div className="file-list">
                  {files.existingFacilityImages.map(img => (<div key={img.id} className="file-item">📄 Existing Img <button type="button" onClick={() => files.removeExistingFile("image", img.id, img.image_url)}>✕</button></div>))}
                  {files.facilityImages.map((f, i) => (<div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setFacilityImages, i)}>✕</button></div>))}
                </div>
                {validationErrors.facilityImages && <small className="error">{validationErrors.facilityImages}</small>}
              </div>

              <div className="form-group">
                <label>Payment QR (Max 2)*</label>
                <label className={`file-btn ${validationErrors.paymentChannelFiles ? "input-error" : ""}`}>📁 <span>Select QR Images (Max 1MB each)</span><input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e) => files.handleMultiFileSelect(files.setPaymentChannelFiles, files.paymentChannelFiles, e, 2, "paymentChannelFiles", files.existingPaymentChannels.length, 1)} hidden /></label>
                <div className="file-list">
                  {files.existingPaymentChannels.map(img => (<div key={img.id} className="file-item">📄 Existing QR <button type="button" onClick={() => files.removeExistingFile("payment", img.id, img.file_url)}>✕</button></div>))}
                  {files.paymentChannelFiles.map((f, i) => (<div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setPaymentChannelFiles, i)}>✕</button></div>))}
                </div>
                {validationErrors.paymentChannelFiles && <small className="error">{validationErrors.paymentChannelFiles}</small>}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Employee Information</h2>
            {employees.map((emp, idx) => (
              <div className="employee-row" key={idx}>
                <div className="form-grid-3">
                  <div className="form-group"><label>First Name*</label><input type="text" value={emp.firstName} onChange={(e) => handleEmployeeChange(idx, "firstName", e.target.value)} className={validationErrors[`employee_${idx}_first`] ? "input-error" : ""} />{validationErrors[`employee_${idx}_first`] && <small className="error">{validationErrors[`employee_${idx}_first`]}</small>}</div>
                  <div className="form-group"><label>Last Name*</label><input type="text" value={emp.lastName} onChange={(e) => handleEmployeeChange(idx, "lastName", e.target.value)} className={validationErrors[`employee_${idx}_last`] ? "input-error" : ""} />{validationErrors[`employee_${idx}_last`] && <small className="error">{validationErrors[`employee_${idx}_last`]}</small>}</div>
                  <div className="form-group">
                    <label>Position*</label>
                    <div className="input-with-btn">
                      <select value={emp.position} onChange={(e) => handleEmployeeChange(idx, "position", e.target.value)} className={validationErrors[`employee_${idx}_pos`] ? "input-error" : ""}>
                        <option value="">Select Position</option>
                        {POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      {employees.length > 1 && (<button type="button" onClick={() => removeEmployee(idx)} className="remove-btn" title="Remove Employee">🗑️</button>)}
                    </div>
                    {validationErrors[`employee_${idx}_pos`] && <small className="error">{validationErrors[`employee_${idx}_pos`]}</small>}
                  </div>
                </div>
              </div>
            ))}
            <div className="employee-actions-container">
              <button type="button" className="add-btn" onClick={addEmployee}>+ Add Employee</button>
              {validationErrors.employees && <small className="error employee-global-error">{validationErrors.employees}</small>}
            </div>
          </section>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary">Next: Add Services</button>
          </div>
        </form>
      )}


      {/* ========================================== */}
      {/* STEP 2: SERVICES & PRICING                 */}
      {/* ========================================== */}
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
              {services.map((service, si) => (
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

      {/* --- Confirmation / Review Modal --- */}
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
  );
}