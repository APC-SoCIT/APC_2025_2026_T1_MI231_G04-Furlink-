/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/ConfirmationModal.tsx */
'use client';

import React from "react";
import { POSITION_OPTIONS } from "./constants";

/**
 * ConfirmationModal
 * ---------------------------------------------------------------------------
 * Pure "review before submit" summary. 
 * Now includes Services & Packages list + Image Previews for files.
 */
const ConfirmationModal = ({ isOpen, onClose, onConfirm, data, files, services, isSubmitting }) => {
  if (!isOpen) return null;

  /** Turns a File object OR a stored Supabase URL into a human-friendly file name. */
  const getFileName = (fileOrUrl) => {
    if (!fileOrUrl) return "None";
    if (fileOrUrl instanceof File) return fileOrUrl.name;

    if (typeof fileOrUrl === 'string') {
      try {
        const decoded = decodeURIComponent(fileOrUrl);
        const baseName = decoded.split('/').pop();
        return baseName.replace(/^\d+_/, ''); // strip the timestamp prefix
      } catch (e) { return "Existing File"; }
    }
    return "File";
  };

  /** Generates a local blob URL for new image files or passes through the existing URL for previews */
  const getPreviewUrl = (fileOrUrl) => {
    if (!fileOrUrl) return null;
    if (typeof fileOrUrl === 'string') return fileOrUrl;
    if (fileOrUrl instanceof File && fileOrUrl.type.startsWith('image/')) {
      return URL.createObjectURL(fileOrUrl);
    }
    return null;
  };

  // Merge existing + newly selected files into one display list with previews.
  const finalFacilities = [
    ...(files.existingFacilityImages || []).map(f => ({ name: getFileName(f.image_url), status: 'Existing', preview: getPreviewUrl(f.image_url) })),
    ...(files.facilityImages || []).map(f => ({ name: f.name, status: 'New', preview: getPreviewUrl(f) })),
  ];

  const finalPayments = [
    ...(files.existingPaymentChannels || []).map(f => ({ name: getFileName(f.file_url), status: 'Existing', preview: getPreviewUrl(f.file_url) })),
    ...(files.paymentChannelFiles || []).map(f => ({ name: f.name, status: 'New', preview: getPreviewUrl(f) })),
  ];

  let waiverInfo = { name: "None", status: "" };
  if (files.waiverFile) {
    waiverInfo = { name: files.waiverFile.name, status: "New" };
  } else if (files.existingWaiverUrl) {
    waiverInfo = { name: getFileName(files.existingWaiverUrl), status: "Existing" };
  }

  let permitInfo = { name: "Missing", status: "Missing" };
  if (files.businessPermitFile) {
    permitInfo = { name: files.businessPermitFile.name, status: "New" };
  } else if (files.existingPermitUrl) {
    permitInfo = { name: getFileName(files.existingPermitUrl), status: "Existing" };
  }

  const hoursDisplay = (data.operatingHours || []).map(slot =>
    `${slot.days.join(", ")} (${slot.startTime} - ${slot.endTime})`
  ).join("; ");

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ color: '#0E2679', background: '#ffffff', maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: '#0E2679', fontWeight: '800' }}>Review Application</h2>
          <button onClick={onClose} disabled={isSubmitting} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body" style={{ color: '#1f2937', maxHeight: '70vh' }}>
          <div className="review-grid">

            {/* --- BUSINESS DETAILS --- */}
            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>📍 Business Details</h4>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Name:</span> <span className="review-value">{data.businessName}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Email:</span> <span className="review-value">{data.businessEmail}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Mobile:</span> <span className="review-value">+63 {data.businessMobile}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Type:</span> <span className="review-value">{data.typeOfService}</span></div>
              <div className="review-row" style={{ display: 'block' }}>
                <span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Description:</span>
                <span className="review-value long-text">{data.description}</span>
              </div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Hours:</span> <span className="review-value">{hoursDisplay}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Location:</span> <span className="review-value">{data.houseStreet}, {data.barangay}, {data.city}, {data.province}</span></div>
            </div>

            {/* --- ATTACHMENTS WITH PREVIEWS --- */}
            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>📋 Attachments</h4>

              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Business Permit & Waiver:</span></div>
              <ul className="review-list">
                <li><span className={`review-file-tag tag-${permitInfo.status.toLowerCase()}`}>{permitInfo.status}</span> {permitInfo.name}</li>
                {waiverInfo.name !== "None" && (<li><span className={`review-file-tag tag-${waiverInfo.status.toLowerCase()}`}>{waiverInfo.status}</span> {waiverInfo.name}</li>)}
              </ul>

              <div className="review-row" style={{ marginTop: '10px' }}><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Facilities ({finalFacilities.length}):</span></div>
              <ul className="review-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {finalFacilities.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {f.preview ? (
                      <img src={f.preview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    ) : (<span style={{ fontSize: '24px' }}>📄</span>)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className={`review-file-tag tag-${f.status.toLowerCase()}`} style={{ alignSelf: 'flex-start', marginBottom: '2px' }}>{f.status}</span>
                      <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{f.name}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="review-row" style={{ marginTop: '10px' }}><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Payment QR ({finalPayments.length}):</span></div>
              <ul className="review-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {finalPayments.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {f.preview ? (
                      <img src={f.preview} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    ) : (<span style={{ fontSize: '24px' }}>📄</span>)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className={`review-file-tag tag-${f.status.toLowerCase()}`} style={{ alignSelf: 'flex-start', marginBottom: '2px' }}>{f.status}</span>
                      <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{f.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* --- NEW: SERVICES & PRICING --- */}
            <div className="review-group" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ color: '#0E2679', fontWeight: '700', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginBottom: '12px' }}>🛠️ Services & Packages</h4>
              
              {services && services.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {services.map((svc, idx) => (
                    <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <strong style={{ color: '#0E2679', fontSize: '1.05rem', display: 'block' }}>{svc.name || "Unnamed Service"}</strong>
                          {svc.description && <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>{svc.description}</span>}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', background: svc.type === 'packaged_service' ? '#dbeafe' : '#e0e7ff', color: '#1e40af', padding: '4px 8px', borderRadius: '4px' }}>
                          {svc.type === 'packaged_service' ? 'Package' : 'Individual'}
                        </span>
                      </div>

                      {/* Pricing Table Summary for this Service */}
                      <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead style={{ background: '#f3f4f6' }}>
                            <tr>
                              <th style={{ padding: '8px', color: '#4b5563', fontWeight: '600' }}>Pet Type</th>
                              <th style={{ padding: '8px', color: '#4b5563', fontWeight: '600' }}>Size / Weight</th>
                              <th style={{ padding: '8px', color: '#4b5563', fontWeight: '600' }}>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {svc.pricing.map((p, pIdx) => (
                              <tr key={pIdx} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', textTransform: 'capitalize' }}>{p.petType}</td>
                                <td style={{ padding: '8px' }}>
                                  {p.size === 'cat' || p.size === 'all' 
                                    ? (p.size === 'cat' ? 'Cat' : 'All Sizes') 
                                    : `${p.size} (${p.minWeight}kg - ${p.maxWeight}kg)`}
                                </td>
                                <td style={{ padding: '8px', fontWeight: '700', color: '#0E2679' }}>₱{p.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>No services added.</p>
              )}
            </div>

          </div>

          <div className="review-note" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fbbf24', padding: '12px', borderRadius: '8px', marginTop: '20px' }}>
            <span>⚠️ Please double-check all details. You cannot edit this form after submitting.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} disabled={isSubmitting} className="btn-cancel">Go Back & Edit</button>
          <button onClick={onConfirm} disabled={isSubmitting} className="btn-confirm">
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;