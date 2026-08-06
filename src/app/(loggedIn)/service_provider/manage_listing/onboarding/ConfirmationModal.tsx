/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/ConfirmationModal.tsx */
'use client';

import React from "react";
import { POSITION_OPTIONS } from "./constants";

/**
 * ConfirmationModal
 * ---------------------------------------------------------------------------
 * Pure "review before submit" summary. Takes the already-collected form
 * state + file state as props and renders a read-only recap, tagging each
 * attachment as "New" (freshly selected) or "Existing" (already on record
 * from a previous save / reapplication).
 *
 * No state of its own beyond the early `isOpen` return — all data comes
 * from the parent (page.tsx), so it can be swapped out or reused freely.
 */
const ConfirmationModal = ({ isOpen, onClose, onConfirm, data, files, isSubmitting }) => {
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

  // Merge existing + newly selected files into one display list per category.
  const finalFacilities = [
    ...(files.existingFacilityImages || []).map(f => ({ name: getFileName(f.image_url), status: 'Existing' })),
    ...(files.facilityImages || []).map(f => ({ name: f.name, status: 'New' })),
  ];

  const finalPayments = [
    ...(files.existingPaymentChannels || []).map(f => ({ name: getFileName(f.file_url), status: 'Existing' })),
    ...(files.paymentChannelFiles || []).map(f => ({ name: f.name, status: 'New' })),
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
      {/* Explicit style override ensuring high text contrast and legibility */}
      <div className="modal-container" style={{ color: '#0E2679', background: '#ffffff' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: '#0E2679', fontWeight: '800' }}>Review Application</h2>
          <button onClick={onClose} disabled={isSubmitting} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body" style={{ color: '#1f2937' }}>
          <div className="review-grid">

            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>📍 Business Details</h4>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Name:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.businessName}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Email:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.businessEmail}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Mobile:</span> <span className="review-value" style={{ color: '#1f2937' }}>+63 {data.businessMobile}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Type:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.typeOfService}</span></div>

              <div className="review-row" style={{ display: 'block' }}>
                <span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Description:</span>
                <span className="review-value long-text" style={{ color: '#1f2937' }}>{data.description}</span>
              </div>

              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Hours:</span> <span className="review-value" style={{ color: '#1f2937' }}>{hoursDisplay}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Social:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.socialMediaUrl || "N/A"}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Map Link:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.googleMapUrl || "N/A"}</span></div>
            </div>

            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>📍 Location</h4>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Street:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.houseStreet}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Barangay:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.barangay}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>City:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.city}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Province:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.province}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Postal:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.postalCode}</span></div>
              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Country:</span> <span className="review-value" style={{ color: '#1f2937' }}>{data.country}</span></div>
            </div>

            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>👥 Employees ({(files.employees || []).length})</h4>
              <ul className="review-list">
                {(files.employees || []).map((emp, idx) => {
                  const posLabel = POSITION_OPTIONS.find(p => p.value === emp.position)?.label || emp.position;
                  return (
                    <li key={idx} style={{ color: '#1f2937' }}>
                      <strong style={{ color: '#0E2679' }}>{emp.firstName} {emp.lastName}</strong> — <span style={{ color: '#4b5563' }}>{posLabel}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="review-group">
              <h4 style={{ color: '#0E2679', fontWeight: '700' }}>📋 Attachments</h4>

              <div className="review-row"><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Business Permit:</span></div>
              <ul className="review-list">
                <li style={{ color: '#1f2937' }}>
                  <span className={`review-file-tag tag-${permitInfo.status.toLowerCase()}`}>{permitInfo.status}</span>
                  {permitInfo.name}
                </li>
              </ul>

              <div className="review-row" style={{ marginTop: '10px' }}><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Waiver:</span></div>
              <ul className="review-list">
                {waiverInfo.name !== "None" ? (
                  <li style={{ color: '#1f2937' }}>
                    <span className={`review-file-tag tag-${waiverInfo.status.toLowerCase()}`}>{waiverInfo.status}</span>
                    {waiverInfo.name}
                  </li>
                ) : (
                  <li style={{ fontStyle: 'italic', color: '#6b7280' }}>No waiver provided</li>
                )}
              </ul>

              <div className="review-row" style={{ marginTop: '10px' }}><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Facilities ({finalFacilities.length}):</span></div>
              <ul className="review-list">
                {finalFacilities.map((f, i) => (
                  <li key={i} style={{ color: '#1f2937' }}>
                    <span className={`review-file-tag tag-${f.status.toLowerCase()}`}>{f.status}</span>
                    {f.name}
                  </li>
                ))}
              </ul>

              <div className="review-row" style={{ marginTop: '10px' }}><span className="review-label" style={{ fontWeight: '600', color: '#0E2679' }}>Payment QR ({finalPayments.length}):</span></div>
              <ul className="review-list">
                {finalPayments.map((f, i) => (
                  <li key={i} style={{ color: '#1f2937' }}>
                    <span className={`review-file-tag tag-${f.status.toLowerCase()}`}>{f.status}</span>
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="review-note" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fbbf24', padding: '12px', borderRadius: '8px' }}>
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