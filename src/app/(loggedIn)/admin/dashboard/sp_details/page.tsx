"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft } from "react-icons/fa";
import "./page.css";

export default function SPDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const providerId = searchParams.get("id");

  const [provider, setProvider] = useState<ServiceProviderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    } else {
      setError("No Provider ID found in URL.");
      setLoading(false);
    }
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      
      //Fetching parent and all nested child
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

  if (loading) return <div className="loading-state">Loading provider details...</div>;
  if (error) return <div className="empty-state">Error: {error}</div>;
  if (!provider) return <div className="empty-state">Provider not found.</div>;

  return (
    <div className="admin-dashboard-page">
      <main className="admin-dashboard-wrapper">
        
        {/* Header / Back Button */}
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
          <div className="list-header">
            <h2 className="list-title">{provider.business_name} Details</h2>
            <span className={`status-pill ${provider.registration_status}`}>
              {provider.registration_status}
            </span>
          </div>

          {/* GENERAL INFO SECTION */}
          <section className="detail-section">
            <h3>General Information</h3>
            <p><strong>Email:</strong> {provider.business_email}</p>
            <p><strong>Contact:</strong> {provider.business_contact}</p>
            <p><strong>Location:</strong> {provider.business_city}, {provider.business_province}</p>
            <p><strong>Service Type:</strong> {provider.business_service_type}</p>
            
            {/* Document Links */}
            <div style={{ marginTop: "15px" }}>
              {provider.business_permit_url && (
                <a href={provider.business_permit_url} target="_blank" rel="noreferrer" style={{ marginRight: "15px", color: "blue" }}>
                  View Business Permit
                </a>
              )}
              {provider.business_waiver_url && (
                <a href={provider.business_waiver_url} target="_blank" rel="noreferrer" style={{ color: "blue" }}>
                  View Waiver
                </a>
              )}
            </div>
          </section>

          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />

          {/* OPERATING HOURS SECTION */}
          <section className="detail-section">
            <h3>Operating Hours</h3>
            {provider.sp_operating_hours.length > 0 ? (
              <ul>
                {provider.sp_operating_hours.map((hour) => (
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

          {/* EMPLOYEES SECTION */}
          <section className="detail-section">
            <h3>Employees</h3>
            {provider.sp_employees_info.length > 0 ? (
              <ul>
                {provider.sp_employees_info.map((emp) => (
                  <li key={emp.id}>
                    {emp.employee_first_name} {emp.employee_last_name} - <span style={{textTransform: "capitalize"}}>{emp.employee_position.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No employees listed.</p>
            )}
          </section>

          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />

          {/* SERVICES & OPTIONS SECTION */}
          <section className="detail-section">
            <h3>Services Offered</h3>
            {provider.sp_services.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {provider.sp_services.map((service) => (
                  <div key={service.id} style={{ padding: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                    <h4>{service.service_name} ({service.service_type.replace('_', ' ')})</h4>
                    <p>{service.service_description}</p>
                    
                    {/* Nested Service Options */}
                    {service.sp_service_options && service.sp_service_options.length > 0 && (
                      <table className="providers-table" style={{ marginTop: "10px" }}>
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
                              <td style={{textTransform: "capitalize"}}>{option.pet_type.replace('_', ' ')}</td>
                              <td style={{textTransform: "capitalize"}}>{option.pet_size.replace('_', ' ')}</td>
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
    </div>
  );
}