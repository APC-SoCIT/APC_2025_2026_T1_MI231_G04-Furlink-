"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import "./page.css"; 

const REJECTION_REASONS = [
  "Incomplete information",
  "Information cannot be verified",
  "Uploaded files are invalid or inappropriate",
  "Others",
];

export default function SPDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const providerId = searchParams.get("id");

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adminId, setAdminId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReasons, setSelectedRejectReasons] = useState<string[]>([]);
  const [otherReasonText, setOtherReasonText] = useState("");

  useEffect(() => {
    fetchAdminUser();
    if (providerId) {
      fetchProviderDetails();
    } else {
      setError("No Provider ID found in URL.");
      setLoading(false);
    }
  }, [providerId]);

  const fetchAdminUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);
  };

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("sp_general_info")
        .select(`
          *,
          sp_img_facilities (*),
          sp_employees_info (*),
          sp_operating_hours (*),
          sp_services (
            *,
            sp_service_options (*)
          )
        `)
        .eq("id", providerId)
        .single();

      if (error) throw error;
      setProvider(data);
    } catch (err: any) {
      console.error("Error fetching provider details:", err);
      setError(err.message || "Failed to load provider details.");
    } finally {
      setLoading(false);
    }
  };

  const confirmApprove = async () => {
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("sp_general_info")
        .update({
          registration_status: "approved",
          registration_approved_at: new Date().toISOString(),
          registration_response_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", providerId);

      if (error) throw error;
      setShowApproveModal(false);
      fetchProviderDetails();
    } catch (err: any) {
      alert("Error approving: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleRejectReason = (reason: string) => {
    setSelectedRejectReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const confirmReject = async () => {
    if (selectedRejectReasons.length === 0) {
      alert("Please select a reason for rejection.");
      return;
    }

    if (selectedRejectReasons.includes("Others") && !otherReasonText.trim()) {
      alert("Please specify the other reason.");
      return;
    }

    const finalReasons = selectedRejectReasons
      .filter((r) => r !== "Others")
      .concat(
        selectedRejectReasons.includes("Others") ? [otherReasonText.trim()] : []
      );

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("sp_general_info")
        .update({
          registration_status: "rejected",
          registration_rejection_reason: finalReasons.join(", "),
          registration_response_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", providerId);

      if (error) throw error;
      setShowRejectModal(false);
      setSelectedRejectReasons([]);
      setOtherReasonText("");
      fetchProviderDetails();
    } catch (err: any) {
      alert("Error rejecting: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="loading-state" style={{ padding: "40px", textAlign: "center" }}>Loading provider details...</div>;
  if (error) return <div className="empty-state" style={{ padding: "40px", textAlign: "center", color: "red" }}>Error: {error}</div>;
  if (!provider) return <div className="empty-state" style={{ padding: "40px", textAlign: "center" }}>Provider not found.</div>;

  return (
    <div className="admin-dashboard-page">
      <main className="admin-dashboard-wrapper">
        
        <div style={{ marginBottom: "20px" }}>
          <button 
            className="btn-view-details" 
            onClick={() => router.push(ROUTES.ADMIN.ADMIN_DASHBOARD)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        <div className="dashboard-list-container">
          <div className="list-header" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className="list-title">{provider.business_name} Details</h2>
              <span className={`status-pill ${provider.registration_status}`} style={{ display: "inline-block", marginTop: "10px" }}>
                {provider.registration_status}
              </span>
            </div>

            {provider.registration_status === "pending" && (
              <div className="action-buttons-container">
                <button 
                  className="btn-approve" 
                  onClick={() => setShowApproveModal(true)} 
                  disabled={isUpdating}
                >
                  <FaCheck /> Approve Listing
                </button>
                <button 
                  className="btn-reject" 
                  onClick={() => setShowRejectModal(true)} 
                  disabled={isUpdating}
                >
                  <FaTimes /> Reject
                </button>
              </div>
            )}
          </div>

          <section className="detail-section">
            <h3>General Information</h3>
            <p><strong>Email:</strong> {provider.business_email}</p>
            <p><strong>Contact:</strong> {provider.business_contact}</p>
            <p><strong>Location:</strong> {provider.business_street}, {provider.business_barangay}, {provider.business_city}, {provider.business_province} {provider.business_postal_code}</p>
            <p><strong>Service Type:</strong> {provider.business_service_type}</p>
            <p><strong>Bio:</strong> {provider.business_bio}</p>

            {provider.registration_status === "rejected" && provider.registration_rejection_reason && (
              <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px" }}>
                <p style={{ margin: 0, color: "#991b1b" }}><strong>Rejection Reason:</strong> {provider.registration_rejection_reason}</p>
              </div>
            )}
            
            <div style={{ marginTop: "15px" }}>
              {provider.business_permit_url && (
                <a href={provider.business_permit_url} target="_blank" rel="noreferrer" className="document-link">
                  View Business Permit
                </a>
              )}
              {provider.business_waiver_url && (
                <a href={provider.business_waiver_url} target="_blank" rel="noreferrer" className="document-link">
                  View Waiver
                </a>
              )}
            </div>
          </section>

          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />

          <section className="detail-section">
            <h3>Operating Hours</h3>
            {provider.sp_operating_hours && provider.sp_operating_hours.length > 0 ? (
              <ul>
                {provider.sp_operating_hours.map((hour: any) => (
                  <li key={hour.id}>
                    <strong>{hour.day_of_week}:</strong> {hour.opening_time} - {hour.closing_time} (Capacity: {hour.slot_capacity})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No operating hours set.</p>
            )}
          </section>

          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />

          <section className="detail-section">
            <h3>Employees</h3>
            {provider.sp_employees_info && provider.sp_employees_info.length > 0 ? (
              <ul>
                {provider.sp_employees_info.map((emp: any) => (
                  <li key={emp.id}>
                    <strong>{emp.employee_first_name} {emp.employee_last_name}</strong> - <span style={{textTransform: "capitalize"}}>{emp.employee_position.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No employees listed.</p>
            )}
          </section>

          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />

          <section className="detail-section">
            <h3>Services Offered</h3>
            {provider.sp_services && provider.sp_services.length > 0 ? (
              <div className="service-card-container">
                {provider.sp_services.map((service: any) => (
                  <div key={service.id} className="service-card">
                    <h4>{service.service_name} <span style={{fontSize: "0.85rem", fontWeight: "normal", color: "#6b7280", textTransform: "capitalize"}}>({service.service_type.replace('_', ' ')})</span></h4>
                    <p>{service.service_description}</p>
                    {service.service_notes && <p style={{ fontSize: "0.85rem", fontStyle: "italic" }}>Note: {service.service_notes}</p>}
                    
                    {service.sp_service_options && service.sp_service_options.length > 0 && (
                      <table className="providers-table">
                        <thead>
                          <tr>
                            <th>Pet Type</th>
                            <th>Size</th>
                            <th>Weight Range</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {service.sp_service_options.map((option: any) => (
                            <tr key={option.id}>
                              <td style={{textTransform: "capitalize"}}>{option.pet_type.replace(/_/g, ' ')}</td>
                              <td style={{textTransform: "capitalize"}}>{option.pet_size.replace(/_/g, ' ')}</td>
                              <td>{option.pet_min_weight_range} - {option.pet_max_weight_range} kg</td>
                              <td>₱{option.service_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No services registered yet.</p>
            )}
          </section>

        </div>
      </main>

      {showApproveModal && (
        <div className="modal-overlay" onClick={() => !isUpdating && setShowApproveModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Approve this provider?</h3>
            <p className="modal-text">
              This will make <strong>{provider.business_name}</strong> visible and active on the platform.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowApproveModal(false)} 
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                className="btn-approve" 
                onClick={confirmApprove} 
                disabled={isUpdating}
              >
                {isUpdating ? "Processing..." : "Yes, Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => !isUpdating && setShowRejectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Reject this provider?</h3>
            <p className="modal-text">
              Select the reason(s) for rejecting <strong>{provider.business_name}</strong>.
            </p>

            <div className="reject-options-list">
              {REJECTION_REASONS.map((reason) => (
                <label key={reason} className="reject-option">
                  <input
                    type="checkbox"
                    name="rejectReason"
                    value={reason}
                    checked={selectedRejectReasons.includes(reason)}
                    onChange={() => toggleRejectReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {selectedRejectReasons.includes("Others") && (
              <textarea
                className="reject-other-input"
                placeholder="Please specify the reason..."
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  resize: "vertical",
                }}
              />
            )}

            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRejectReasons([]);
                  setOtherReasonText("");
                }} 
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                className="btn-reject" 
                onClick={confirmReject} 
                disabled={isUpdating || selectedRejectReasons.length === 0}
              >
                {isUpdating ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}