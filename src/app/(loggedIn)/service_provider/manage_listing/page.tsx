/* src/app/(loggedIn)/service_provider/manage_listing/page.tsx */
'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import { FaStore, FaClock, FaListUl, FaImages, FaEdit } from "react-icons/fa";
import Footer from "@/components/Footer";
import "./manage_listing.css"; 

// Helper to format 24h time to 12h AM/PM
const formatTime = (timeStr: string) => {
  if (!timeStr) return "N/A";
  const [h, m] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(h), parseInt(m));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ManageListingPage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<"business" | "hours_staff" | "services" | "media">("business");
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<any>(null);

  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch General Info
        const { data: generalData } = await supabase
          .from('sp_general_info')
          .select('*')
          .eq('profiles_id', user.id)
          .single();

        if (!generalData) {
          setLoading(false);
          return;
        }

        // 2. Fetch Related Tables
        const [empRes, hoursRes, srvRes, imgRes] = await Promise.all([
          supabase.from('sp_employees_info').select('*').eq('sp_id', generalData.id),
          supabase.from('sp_operating_hours').select('*').eq('sp_id', generalData.id),
          supabase.from('sp_services').select('*, sp_service_options(*)').eq('sp_id', generalData.id),
          supabase.from('sp_img_facilities').select('*').eq('sp_id', generalData.id)
        ]);

        setProviderData({
          general: generalData,
          employees: empRes.data || [],
          hours: hoursRes.data || [],
          services: srvRes.data || [],
          images: imgRes.data || []
        });

      } catch (err) {
        console.error("Error fetching listing data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [supabase]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading your listing details...</div>;
  }

  if (!providerData?.general) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p>No active listing found. Please complete your service provider onboarding.</p>
      </div>
    );
  }

  const { general, employees, hours, services, images } = providerData;

  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        
        <div className="manage-listing-split-grid">
          {/* LEFT COLUMN: Sidebar Navigation */}
          <div className="manage-listing-sidebar">
            <h2>Manage Listing</h2>
            <div className="manage-listing-nav-list">
              <button
                onClick={() => setActiveTab("business")}
                className={`manage-listing-nav-btn ${activeTab === "business" ? "active-tab" : ""}`}
              >
                <FaStore style={{ color: "#0a217a" }} /> Business Info
              </button>
              
              <button
                onClick={() => setActiveTab("hours_staff")}
                className={`manage-listing-nav-btn ${activeTab === "hours_staff" ? "active-tab" : ""}`}
              >
                <FaClock style={{ color: "#0a217a" }} /> Operating Hours & Staff
              </button>

              <button
                onClick={() => setActiveTab("services")}
                className={`manage-listing-nav-btn ${activeTab === "services" ? "active-tab" : ""}`}
              >
                <FaListUl style={{ color: "#0a217a" }} /> Services Menu
              </button>

              <button
                onClick={() => setActiveTab("media")}
                className={`manage-listing-nav-btn ${activeTab === "media" ? "active-tab" : ""}`}
              >
                <FaImages style={{ color: "#0a217a" }} /> Documents & Media
              </button>
            </div>
          </div>

          <div className="manage-listing-divider"></div>

          {/* RIGHT COLUMN: Active Tab Content */}
          <div className="manage-listing-content-pane">
            
            {/* TAB 1: BUSINESS INFO */}
            {activeTab === "business" && (
              <div>
                <div className="manage-listing-header">
                  <h3>Business Information</h3>
                  <Link href={ROUTES.SERVICE_PROVIDER.EDIT_BUSINESS_INFO} className="edit-action-btn">
                    <FaEdit /> Edit Info
                  </Link>
                </div>
                <div className="straight-layout-container">
                  <div className="listing-field-group">
                    <label>Status</label>
                    <span className="listing-field-value" style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                      {general.registration_status}
                    </span>
                  </div>
                  <div className="listing-field-group">
                    <label>Business Name</label>
                    <span className="listing-field-value">{general.business_name}</span>
                  </div>
                  <div className="listing-field-group">
                    <label>Business Bio</label>
                    <span className="listing-field-value">{general.business_bio || "Not provided"}</span>
                  </div>
                  <div className="listing-field-group">
                    <label>Contact Email</label>
                    <span className="listing-field-value">{general.business_email}</span>
                  </div>
                  <div className="listing-field-group">
                    <label>Contact Number</label>
                    <span className="listing-field-value">{general.business_contact}</span>
                  </div>
                  <div className="listing-field-group">
                    <label>Complete Address</label>
                    <span className="listing-field-value">
                      {`${general.business_street}, ${general.business_barangay}, ${general.business_city}, ${general.business_province}, ${general.business_postal_code}, ${general.business_country}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HOURS & STAFF */}
            {activeTab === "hours_staff" && (
              <div>
                <div className="manage-listing-header">
                  <h3>Operating Hours & Staff</h3>
                  {/* Assuming editing hours/staff falls under Business Info or Listing edits */}
                  <Link href={ROUTES.SERVICE_PROVIDER.EDIT_BUSINESS_INFO} className="edit-action-btn">
                    <FaEdit /> Edit Hours/Staff
                  </Link>
                </div>
                
                <h4 style={{ marginTop: '20px', color: '#0a217a' }}>Weekly Schedule</h4>
                <div className="listing-card-grid">
                  {hours.map((h: any) => (
                    <div key={h.id} className="listing-data-card">
                      <h4 style={{ textTransform: 'capitalize' }}>{h.day_of_week}</h4>
                      <p className="listing-field-value"><strong>Open:</strong> {formatTime(h.opening_time)} - {formatTime(h.closing_time)}</p>
                      <p className="listing-field-value"><strong>Slot Duration:</strong> {h.slot_interval} mins</p>
                      <p className="listing-field-value"><strong>Capacity:</strong> {h.slot_capacity} pets/slot</p>
                    </div>
                  ))}
                  {hours.length === 0 && <p>No operating hours recorded.</p>}
                </div>

                <h4 style={{ marginTop: '30px', color: '#0a217a' }}>Registered Staff</h4>
                <div className="listing-card-grid">
                  {employees.map((emp: any) => (
                    <div key={emp.id} className="listing-data-card">
                      <h4>{emp.employee_first_name} {emp.employee_last_name}</h4>
                      <p className="listing-field-value"><strong>Position:</strong> {emp.employee_position}</p>
                    </div>
                  ))}
                  {employees.length === 0 && <p>No staff recorded.</p>}
                </div>
              </div>
            )}

            {/* TAB 3: SERVICES */}
            {activeTab === "services" && (
              <div>
                <div className="manage-listing-header">
                  <h3>Services Menu</h3>
                  <Link href={ROUTES.SERVICE_PROVIDER.EDIT_LISTING} className="edit-action-btn">
                    <FaEdit /> Edit Menu
                  </Link>
                </div>

                <div className="straight-layout-container">
                  {services.map((srv: any) => (
                    <div key={srv.id} className="listing-field-group">
                      <h4 style={{ margin: '0 0 10px 0', color: '#0a217a', fontSize: '18px' }}>
                        {srv.service_name} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>({srv.service_type})</span>
                      </h4>
                      <p className="listing-field-value" style={{ marginBottom: '10px' }}>{srv.service_description}</p>
                      
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #ddd', fontSize: '13px', color: '#0a217a' }}>
                            <th style={{ padding: '8px 4px' }}>Pet Type</th>
                            <th style={{ padding: '8px 4px' }}>Size / Weight</th>
                            <th style={{ padding: '8px 4px' }}>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {srv.sp_service_options?.map((opt: any) => (
                            <tr key={opt.id} style={{ borderBottom: '1px solid #eee', fontSize: '14px' }}>
                              <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>{opt.pet_type}</td>
                              <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>
                                {opt.pet_size === 'all' 
                                  ? 'All Sizes' 
                                  : `${opt.pet_size} (${opt.pet_min_weight_range} - ${opt.pet_max_weight_range} kg)`}
                              </td>
                              <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>₱{opt.service_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {services.length === 0 && <p>No services recorded.</p>}
                </div>
              </div>
            )}

            {/* TAB 4: MEDIA & DOCUMENTS */}
            {activeTab === "media" && (
              <div>
                <div className="manage-listing-header">
                  <h3>Documents & Media</h3>
                  <Link href={ROUTES.SERVICE_PROVIDER.EDIT_BUSINESS_INFO} className="edit-action-btn">
                    <FaEdit /> Edit Media
                  </Link>
                </div>

                <div className="straight-layout-container">
                  <div className="listing-field-group">
                    <label>Facility Images</label>
                    <div className="media-gallery">
                      {images.map((img: any) => (
                        <img key={img.id} src={img.business_facility_images} alt="Facility" />
                      ))}
                      {images.length === 0 && <span className="listing-field-value">No images uploaded.</span>}
                    </div>
                  </div>

                  <div className="listing-field-group">
                    <label>Business Documents</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <p className="listing-field-value">
                        <strong>Waiver: </strong> 
                        {general.business_waiver_url === "PLATFORM_DEFAULT_WAIVER" 
                          ? "Using Platform Default Waiver" 
                          : general.business_waiver_url 
                            ? <a href={general.business_waiver_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>View Custom Waiver</a>
                            : "None"}
                      </p>
                      <p className="listing-field-value">
                        <strong>Permit: </strong>
                        {general.business_permit_url 
                          ? <a href={general.business_permit_url} target="_blank" rel="noreferrer" style={{ color: '#0a217a', textDecoration: 'underline' }}>View Document</a>
                          : "None"}
                      </p>
                    </div>
                  </div>

                  <div className="listing-field-group">
                     <label>Payment QR Code</label>
                     {general.business_payment_qr_url ? (
                       <img 
                         src={general.business_payment_qr_url} 
                         alt="Payment QR" 
                         style={{ width: '200px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '10px' }} 
                       />
                     ) : (
                       <span className="listing-field-value">No payment QR uploaded.</span>
                     )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}