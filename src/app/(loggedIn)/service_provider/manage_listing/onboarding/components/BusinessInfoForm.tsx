/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/components/BusinessInfoForm.tsx */
import React from "react";
import { POSITION_OPTIONS, DAYS_OF_WEEK_SHORT, DAYS_OF_WEEK_FULL, DESCRIPTION_MAX_LENGTH } from "../constants";

// Define the exact MIME types for the inputs here to keep the main page clean
const DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const IMG_TYPES = ["image/jpeg", "image/png"];

interface BusinessInfoFormProps {
  businessInfo: any;
  setBusinessInfo: React.Dispatch<React.SetStateAction<any>>;
  employees: any[];
  validationErrors: any;
  files: any; // Passes down the full useFileUploads object
  handleBusinessChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  toggleDay: (slotIndex: number, day: string) => void;
  isDayDisabled: (slotIndex: number, day: string) => boolean;
  addTimeSlot: () => void;
  removeTimeSlot: (index: number) => void;
  handleTimeChange: (slotIndex: number, type: string, value: any) => void;
  handleEmployeeChange: (index: number, field: string, value: string) => void;
  addEmployee: () => void;
  removeEmployee: (index: number) => void;
  handleNextStep: (e: React.FormEvent) => Promise<void>;
}

export default function BusinessInfoForm({
  businessInfo, setBusinessInfo, employees, validationErrors, files,
  handleBusinessChange, toggleDay, isDayDisabled, addTimeSlot, removeTimeSlot, handleTimeChange,
  handleEmployeeChange, addEmployee, removeEmployee, handleNextStep
}: BusinessInfoFormProps) {
  return (
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
                onChange={(e) => setBusinessInfo((prev: any) => ({ ...prev, isBranch: e.target.checked, branchName: e.target.checked ? prev.branchName : "" }))}
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
          {businessInfo.operatingHours.map((slot: any, i: number) => (
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
                setBusinessInfo((prev: any) => ({ ...prev, useDefaultWaiver: e.target.checked }));
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
              📁 <span>{businessInfo.useDefaultWaiver ? "Using Platform Waiver" : "Select File (.pdf, .doc, .docx | Max 1MB)"}</span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e: any) => files.handleFileSelect(files.setWaiverFile, e, 1, "waiverFile", DOC_TYPES)} hidden disabled={businessInfo.useDefaultWaiver} />
            </label>
            
            <div className="file-preview-small" style={{ opacity: businessInfo.useDefaultWaiver ? 0.5 : 1 }}>
              {files.waiverFile ? (<span>{files.waiverFile.name} <span onClick={() => !businessInfo.useDefaultWaiver && files.setWaiverFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>) : files.existingWaiverUrl && !businessInfo.useDefaultWaiver ? (<span><a href={files.existingWaiverUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setWaiverFile, files.setExistingWaiverUrl)} style={{ cursor: 'pointer' }}>✕</span></span>) : null}
            </div>
            {validationErrors.waiverFile && !businessInfo.useDefaultWaiver && <small className="error">{validationErrors.waiverFile}</small>}
          </div>

          <div className="form-group">
            <label>Business Permit*</label>
            <label className={`file-btn ${validationErrors.businessPermitFile ? "input-error" : ""}`}>
              📁 <span>Select File (.pdf, .doc, .docx | Max 2MB)</span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e: any) => files.handleFileSelect(files.setBusinessPermitFile, e, 2, "businessPermitFile", DOC_TYPES)} hidden />
            </label>
            <div className="file-preview-small">
              {files.businessPermitFile ? (<span>{files.businessPermitFile.name} <span onClick={() => files.setBusinessPermitFile(null)} style={{ cursor: 'pointer' }}>✕</span></span>) : files.existingPermitUrl ? (<span><a href={files.existingPermitUrl} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeSingleFile(files.setBusinessPermitFile, files.setExistingPermitUrl)} style={{ cursor: 'pointer' }}>✕</span></span>) : null}
            </div>
            {validationErrors.businessPermitFile && <small className="error">{validationErrors.businessPermitFile}</small>}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>Facility Images (Max 3)*</label>
            <label className={`file-btn ${validationErrors.facilityImages ? "input-error" : ""}`}>
              📁 <span>Select Images (.jpg, .png | Max 1MB each)</span>
              <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e: any) => files.handleMultiFileSelect(files.setFacilityImages, files.facilityImages, e, 3, "facilityImages", IMG_TYPES, files.existingFacilityImages.length, 1)} hidden />
            </label>
            <div className="file-list">
              {files.existingFacilityImages.map((img: any) => (
                <div key={img.id} className="file-item">
                  <span><a href={img.image_url} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeExistingFile("image", img.id, img.image_url)} style={{ cursor: 'pointer' }}>✕</span></span>
                </div>
              ))}
              {files.facilityImages.map((f: File, i: number) => (<div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setFacilityImages, i)}>✕</button></div>))}
            </div>
            {validationErrors.facilityImages && <small className="error">{validationErrors.facilityImages}</small>}
          </div>

          <div className="form-group">
            <label>Payment QR (Max 2)*</label>
            <label className={`file-btn ${validationErrors.paymentChannelFiles ? "input-error" : ""}`}>
              📁 <span>Select QR Images (.jpg, .png | Max 1MB each)</span>
              <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={(e: any) => files.handleMultiFileSelect(files.setPaymentChannelFiles, files.paymentChannelFiles, e, 2, "paymentChannelFiles", IMG_TYPES, files.existingPaymentChannels.length, 1)} hidden />
            </label>
            <div className="file-list">
              {files.existingPaymentChannels.map((img: any) => (
                <div key={img.id} className="file-item">
                  <span><a href={img.file_url} target="_blank" rel="noreferrer">View Existing</a> <span onClick={() => files.removeExistingFile("payment", img.id, img.file_url)} style={{ cursor: 'pointer' }}>✕</span></span>
                </div>
              ))}
              {files.paymentChannelFiles.map((f: File, i: number) => (<div key={i} className="file-item">📄 {f.name}<button type="button" onClick={() => files.removeFile(files.setPaymentChannelFiles, i)}>✕</button></div>))}
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
  );
}