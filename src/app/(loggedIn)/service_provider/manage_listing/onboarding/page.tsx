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

/**
 * ServiceProviderOnboardingPage
 * ---------------------------------------------------------------------------
 * Multi-section application form for a new (or reapplying) service provider.
 * State/logic is split as follows:
 *   - businessInfo, employees, providerId, modal/loading flags -> local state here
 *   - validationErrors + validate()                            -> useValidation
 *   - all file/attachment state + upload handlers               -> useFileUploads
 *   - the read-only "review before submit" summary              -> ConfirmationModal
 *
 * The operating-hours editor and labeled form fields stay inline as JSX
 * below (by design) since they're tightly coupled to businessInfo state.
 */
export default function ServiceProviderOnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [providerId, setProviderId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);

  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    description: "",
    businessEmail: "",
    businessMobile: "",
    socialMediaUrl: "",
    googleMapUrl: "",
    typeOfService: "Pet Grooming",
    operatingHours: [{
      days: [],
      startTime: "09:00",
      endTime: "17:00",
      slotDurationHours: 1,
      slotDurationMinutes: 0,
      capacityPerSlot: 1,
    }],
    houseStreet: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Philippines",
  });

  const [employees, setEmployees] = useState([{ firstName: "", lastName: "", position: "" }]);

  const { errors: validationErrors, setErrors: setValidationErrors, setFieldError, clearFieldError, validate } = useValidation();
  const files = useFileUploads(supabase, providerId, { setFieldError, clearFieldError });

  /* -------------------------------------------------------------------- */
  /* Load existing provider data (edit mode / reapplication)               */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const loadProviderData = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: providerData } = await supabase
          .from("service_providers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (providerData) {
          setProviderId(providerData.id);
          setIsReapplying(providerData.status === 'rejected');
          localStorage.setItem("providerId", providerData.id);

          setBusinessInfo(prev => ({
            ...prev,
            businessName: providerData.business_name || "",
            description: providerData.description || "",
            businessEmail: providerData.business_email || "",
            businessMobile: providerData.business_mobile || "",
            socialMediaUrl: providerData.social_media_url || "",
            googleMapUrl: providerData.google_map_url || "",
            houseStreet: providerData.house_street || "",
            barangay: providerData.barangay || "",
            city: providerData.city || "",
            province: providerData.province || "",
            postalCode: providerData.postal_code || "",
          }));

          if (providerData.waiver_url) files.setExistingWaiverUrl(providerData.waiver_url);

          const { data: hours } = await supabase.from("service_provider_hours").select("*").eq("provider_id", providerData.id);
          if (hours && hours.length > 0) {
            const grouped = {};
            hours.forEach((h) => {
              const key = `${h.start_time}-${h.end_time}`;
              if (!grouped[key]) grouped[key] = { days: [], startTime: h.start_time, endTime: h.end_time };
              grouped[key].days.push(h.day_of_week);
            });
            setBusinessInfo((prev) => ({ ...prev, operatingHours: Object.values(grouped) }));
          }

          const { data: imgs } = await supabase.from("service_provider_images").select("*").eq("provider_id", providerData.id);
          if (imgs) files.setExistingFacilityImages(imgs);

          const { data: payments } = await supabase.from("service_provider_payments").select("*").eq("provider_id", providerData.id);
          if (payments) files.setExistingPaymentChannels(payments);

          const { data: permits } = await supabase.from("service_provider_permits").select("*").eq("provider_id", providerData.id);
          if (permits && permits.length > 0) files.setExistingPermitUrl(permits[0].file_url);

          const { data: staff } = await supabase.from("service_provider_staff").select("*").eq("provider_id", providerData.id);
          if (staff && staff.length > 0) {
            setEmployees(staff.map(s => {
              const parts = (s.full_name || "").split(" ");
              const fName = parts[0] || "";
              const lName = parts.slice(1).join(" ") || "";
              return { firstName: fName, lastName: lName, position: s.job_title };
            }));
          }
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProviderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  /* -------------------------------------------------------------------- */
  /* Business info field handlers                                         */
  /* -------------------------------------------------------------------- */
  const handleBusinessChange = (e) => {
    const { name, value } = e.target;

    if (name === "description") {
      if (value.length <= DESCRIPTION_MAX_LENGTH) setBusinessInfo((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (name === "businessMobile") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 11) setBusinessInfo((prev) => ({ ...prev, [name]: numbersOnly }));
      return;
    }
    if (name === "postalCode") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 4) setBusinessInfo((prev) => ({ ...prev, [name]: numbersOnly }));
      return;
    }
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  /* -------------------------------------------------------------------- */
  /* Operating hours helpers                                              */
  /* -------------------------------------------------------------------- */
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
  const handleTimeChange = (slotIndex, type, value) => {
    setBusinessInfo((prev) => ({ ...prev, operatingHours: prev.operatingHours.map((slot, i) => (i === slotIndex ? { ...slot, [type]: value } : slot)) }));
  };

  /* -------------------------------------------------------------------- */
  /* Employee helpers                                                      */
  /* -------------------------------------------------------------------- */
  const handleEmployeeChange = (index, field, value) => setEmployees((prev) => prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp)));
  const addEmployee = () => setEmployees((prev) => [...prev, { firstName: "", lastName: "", position: "" }]);
  const removeEmployee = (index) => setEmployees((prev) => prev.filter((_, i) => i !== index));

  /* -------------------------------------------------------------------- */
  /* Submit flow: validate -> show review modal -> confirm -> persist      */
  /* -------------------------------------------------------------------- */
  const handleFormSubmit = async (e) => {
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
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    clearFieldError("general");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const waiverUrl = files.waiverFile
        ? await files.uploadFileToStorage(user.id, "waivers", files.waiverFile)
        : (files.existingWaiverUrl || null);

      const permitUrl = files.businessPermitFile
        ? await files.uploadFileToStorage(user.id, "permits", files.businessPermitFile)
        : (files.existingPermitUrl || null);

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

      const payload = {
        user_id: user.id,
        business_name: businessInfo.businessName,
        description: businessInfo.description,
        business_email: businessInfo.businessEmail,
        business_mobile: businessInfo.businessMobile,
        house_street: businessInfo.houseStreet,
        barangay: businessInfo.barangay,
        city: businessInfo.city,
        province: businessInfo.province,
        postal_code: businessInfo.postalCode,
        country: businessInfo.country,
        type_of_service: businessInfo.typeOfService,
        social_media_url: businessInfo.socialMediaUrl,
        google_map_url: businessInfo.googleMapUrl,
        waiver_url: waiverUrl,
        status: 'incomplete',
        rejection_reasons: null,
        updated_at: new Date().toISOString(),
      };

      const { data: upsertData, error: upsertError } = await supabase
        .from("service_providers")
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      const currentProviderId = upsertData.id;
      setProviderId(currentProviderId);
      localStorage.setItem("providerId", currentProviderId);

      await Promise.all([
        supabase.from("service_provider_hours").delete().eq("provider_id", currentProviderId),
        supabase.from("service_provider_staff").delete().eq("provider_id", currentProviderId),
      ]);

      const hoursPayload = [];
      businessInfo.operatingHours.forEach(slot => {
        const totalMinutes = (slot.slotDurationHours * 60) + slot.slotDurationMinutes;
        slot.days.forEach(day => {
          hoursPayload.push({
            provider_id: currentProviderId,
            day_of_week: day,
            start_time: slot.startTime,
            end_time: slot.endTime,
            slot_interval_minutes: totalMinutes,
            slot_capacity: slot.capacityPerSlot,
          });
        });
      });

      if (hoursPayload.length > 0) {
        const { error: hError } = await supabase.from("service_provider_hours").insert(hoursPayload);
        if (hError) throw hError;
      }

      if (newFacilityUrls.length > 0) {
        const imgPayload = newFacilityUrls.map(url => ({ provider_id: currentProviderId, image_url: url }));
        const { error: imgErr } = await supabase.from("service_provider_images").insert(imgPayload);
        if (imgErr) throw imgErr;
      }

      if (newPaymentUrls.length > 0) {
        const payPayload = newPaymentUrls.map(url => ({ provider_id: currentProviderId, method_type: "QR", file_url: url }));
        const { error: payErr } = await supabase.from("service_provider_payments").insert(payPayload);
        if (payErr) throw payErr;
      }

      if (files.businessPermitFile) {
        await supabase.from("service_provider_permits").delete().eq("provider_id", currentProviderId);
        const { error: permitErr } = await supabase.from("service_provider_permits").insert({
          provider_id: currentProviderId,
          permit_type: "Business Permit",
          file_url: permitUrl,
        });
        if (permitErr) throw permitErr;
      }

      const staffPayload = employees.map(emp => ({
        provider_id: currentProviderId,
        full_name: `${emp.firstName} ${emp.lastName}`.trim(),
        job_title: emp.position,
      }));

      if (staffPayload.length > 0) {
        const { error: sError } = await supabase.from("service_provider_staff").insert(staffPayload);
        if (sError) throw sError;
      }

      setShowConfirmModal(false);
      router.push(ROUTES.SERVICE_PROVIDER.MANAGE_LISTING);

    } catch (err) {
      console.error("SUBMISSION FAILED:", err);
      setFieldError("general", "Submission failed: " + (err.message || "An unexpected error occurred."));
      setShowConfirmModal(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="loading-screen">Loading Application...</div>;

  return (
    <div className="apply-provider-wrapper">
      <h1 className="page-title">Service Provider Application</h1>

      {validationErrors.general && (
        <div className="error-banner">
          <span>⚠️ {validationErrors.general}</span>
        </div>
      )}

      <form className="apply-provider-form" onSubmit={handleFormSubmit}>

        <section className="form-section">
          <h2>Business Information</h2>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Business Name*</label>
              <input type="text" name="businessName" value={businessInfo.businessName} onChange={handleBusinessChange} />
              {validationErrors.businessName && <small className="error">{validationErrors.businessName}</small>}
            </div>
            <div className="form-group">
              <label>Email*</label>
              <input type="email" name="businessEmail" value={businessInfo.businessEmail} onChange={handleBusinessChange} />
              {validationErrors.businessEmail && <small className="error">{validationErrors.businessEmail}</small>}
            </div>
            <div className="form-group">
              <label>Mobile Number*</label>
              <input type="tel" name="businessMobile" value={businessInfo.businessMobile} onChange={handleBusinessChange} placeholder="0912 345 6789" />
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
              <input type="url" name="socialMediaUrl" value={businessInfo.socialMediaUrl} onChange={handleBusinessChange} placeholder="https://facebook.com/..." />
              {validationErrors.socialMediaUrl && <small className="error">{validationErrors.socialMediaUrl}</small>}
            </div>
            <div className="form-group">
              <label>Google Map Link</label>
              <input type="url" name="googleMapUrl" value={businessInfo.googleMapUrl} onChange={handleBusinessChange} placeholder="https://maps.google.com/..." />
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
            <textarea
              name="description"
              value={businessInfo.description}
              onChange={handleBusinessChange}
              rows={5}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder="Tell us about your business, services, and what makes you unique..."
              className={`description-textarea ${validationErrors.description ? 'error' : ''}`}
            />
            {validationErrors.description && <small className="error">{validationErrors.description}</small>}
          </div>

          {/* Operating hours + slot capacity editor (kept inline — tightly coupled to businessInfo state) */}
          <div className="form-group operating-hours-container">
            <label>Operating Hours & Slot Capacity*</label>
            {businessInfo.operatingHours.map((slot, i) => (
              <div key={i} className="operating-slot-enhanced">
                <div className="day-buttons">
                  {DAYS_OF_WEEK_FULL.map((d, idx) => (
                    <button key={d} type="button"
                      className={`day-btn ${slot.days.includes(d) ? "active" : ""} ${isDayDisabled(i, d) ? "disabled" : ""}`}
                      onClick={() => toggleDay(i, d)} disabled={isDayDisabled(i, d)}>
                      {DAYS_OF_WEEK_SHORT[idx]}
                    </button>
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
                    <button type="button" onClick={() => removeTimeSlot(i)} className="remove-inline-btn">🗑️</button>
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
            <div className="form-group"><label>Street / House No.*</label><input type="text" name="houseStreet" value={businessInfo.houseStreet} onChange={handleBusinessChange} />{validationErrors.houseStreet && <small className="error">{validationErrors.houseStreet}</small>}</div>
            <div className="form-group"><label>Barangay*</label><input type="text" name="barangay" value={businessInfo.barangay} onChange={handleBusinessChange} />{validationErrors.barangay && <small className="error">{validationErrors.barangay}</small>}</div>
            <div className="form-group"><label>City / Municipality*</label><input type="text" name="city" value={businessInfo.city} onChange={handleBusinessChange} />{validationErrors.city && <small className="error">{validationErrors.city}</small>}</div>
            <div className="form-group"><label>Province*</label><input type="text" name="province" value={businessInfo.province} onChange={handleBusinessChange} />{validationErrors.province && <small className="error">{validationErrors.province}</small>}</div>
            <div className="form-group"><label>Postal Code*</label><input type="text" name="postalCode" value={businessInfo.postalCode} onChange={handleBusinessChange} maxLength={4} />{validationErrors.postalCode && <small className="error">{validationErrors.postalCode}</small>}</div>
            <div className="form-group"><label>Country</label><input type="text" name="country" value={businessInfo.country} disabled className="input-disabled" /></div>
          </div>
        </section>

        <section className="form-section">
          <h2>Documents & Uploads</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Waiver</label>
              <label className="file-btn">📁 <span>Select File (Max 1MB)</span>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => files.handleFileSelect(files.setWaiverFile, e, 1, "waiverFile")} hidden />
              </label>
              <div className="file-preview-small">
                {files.waiverFile ? (
                  <span>{files.waiverFile.name} <span onClick={() => files.setWaiverFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>
                ) : files.existingWaiverUrl ? (
                  <span><a href={files.existingWaiverUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setWaiverFile, files.setExistingWaiverUrl)} style={{ cursor: 'pointer' }}>✕</span></span>
                ) : null}
              </div>
              {validationErrors.waiverFile && <small className="error">{validationErrors.waiverFile}</small>}
            </div>

            <div className="form-group">
              <label>Business Permit*</label>
              <label className="file-btn">📁 <span>Select File (Max 2MB)</span>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => files.handleFileSelect(files.setBusinessPermitFile, e, 2, "businessPermitFile")} hidden />
              </label>
              <div className="file-preview-small">
                {files.businessPermitFile ? (
                  <span>{files.businessPermitFile.name} <span onClick={() => files.setBusinessPermitFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>
                ) : files.existingPermitUrl ? (
                  <span><a href={files.existingPermitUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setBusinessPermitFile, files.setExistingPermitUrl)} style={{ cursor: 'pointer' }}>✕</span></span>
                ) : null}
              </div>
              {validationErrors.businessPermitFile && <small className="error">{validationErrors.businessPermitFile}</small>}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Facility Images (Max 3)*</label>
              <label className="file-btn">📁 <span>Select Images (Max 1MB each)</span>
                <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e) => files.handleMultiFileSelect(files.setFacilityImages, files.facilityImages, e, 3, "facilityImages", files.existingFacilityImages.length, 1)} hidden />
              </label>
              <div className="file-list">
                {files.existingFacilityImages.map(img => (
                  <div key={img.id} className="file-item">📄 Existing Img <button type="button" onClick={() => files.removeExistingFile("image", img.id, img.image_url)}>✕</button></div>
                ))}
                {files.facilityImages.map((f, i) => (
                  <div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setFacilityImages, i)}>✕</button></div>
                ))}
              </div>
              {validationErrors.facilityImages && <small className="error">{validationErrors.facilityImages}</small>}
            </div>

            <div className="form-group">
              <label>Payment QR (Max 2)*</label>
              <label className="file-btn">📁 <span>Select QR Images (Max 1MB each)</span>
                <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e) => files.handleMultiFileSelect(files.setPaymentChannelFiles, files.paymentChannelFiles, e, 2, "paymentChannelFiles", files.existingPaymentChannels.length, 1)} hidden />
              </label>
              <div className="file-list">
                {files.existingPaymentChannels.map(img => (
                  <div key={img.id} className="file-item">📄 Existing QR <button type="button" onClick={() => files.removeExistingFile("payment", img.id, img.file_url)}>✕</button></div>
                ))}
                {files.paymentChannelFiles.map((f, i) => (
                  <div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setPaymentChannelFiles, i)}>✕</button></div>
                ))}
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
                <div className="form-group"><label>First Name*</label><input type="text" value={emp.firstName} onChange={(e) => handleEmployeeChange(idx, "firstName", e.target.value)} />{validationErrors[`employee_${idx}_first`] && <small className="error">{validationErrors[`employee_${idx}_first`]}</small>}</div>
                <div className="form-group"><label>Last Name*</label><input type="text" value={emp.lastName} onChange={(e) => handleEmployeeChange(idx, "lastName", e.target.value)} />{validationErrors[`employee_${idx}_last`] && <small className="error">{validationErrors[`employee_${idx}_last`]}</small>}</div>
                <div className="form-group">
                  <label>Position*</label>
                  <div className="input-with-btn">
                    <select value={emp.position} onChange={(e) => handleEmployeeChange(idx, "position", e.target.value)}>
                      <option value="">Select Position</option>
                      {POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {employees.length > 1 && (<button type="button" onClick={() => removeEmployee(idx)} className="remove-btn">🗑️</button>)}
                  </div>
                  {validationErrors[`employee_${idx}_pos`] && <small className="error">{validationErrors[`employee_${idx}_pos`]}</small>}
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="add-btn" onClick={addEmployee}>+ Add Employee</button>
          {validationErrors.employees && <small className="error">{validationErrors.employees}</small>}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Review Application"}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        data={businessInfo}
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