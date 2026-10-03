import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import { FaMapMarkerAlt, FaClock, FaExternalLinkAlt } from "react-icons/fa";
import BookingWidget from "./booking_widget";
import ServiceLocationMap from "./ServiceLocationMap";
import "./book_appointment.css";

type PageProps = {
  searchParams: Promise<{ sp_id?: string }>;
};

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function BookAppointmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const spId = params.sp_id;

  if (!spId) {
    redirect("/pet_owner");
  }

  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // 1. Fetch SP General Info
  const { data: spInfo, error: spError } = await supabase
    .from("sp_general_info")
    .select("*")
    .eq("id", spId)
    .single();

  if (spError || !spInfo) {
    return (
      <div className="book-appointment-container">
        <main className="book-appointment-main">
          <h2>Service provider not found</h2>
        </main>
      </div>
    );
  }

  // 2. Fetch Facility Images
  const { data: facilityImages } = await supabase
    .from("sp_img_facilities")
    .select("business_facility_images")
    .eq("sp_id", spId);

  // 3. Fetch Operating Hours
  const { data: operatingHours } = await supabase
    .from("sp_operating_hours")
    .select("*")
    .eq("sp_id", spId);

  // 4. Fetch Services & Service Options
  const { data: services } = await supabase
    .from("sp_services")
    .select(`
      id,
      service_type,
      service_name,
      service_description,
      service_notes,
      service_haircut_included,
      service_status,
      sp_service_options (
        id,
        pet_type,
        pet_size,
        pet_min_weight_range,
        pet_max_weight_range,
        service_price,
        option_status
      )
    `)
    .eq("sp_id", spId)
    .eq("service_status", "active");

  // 5. Fetch Active Bookings across ALL users with profiles_id to track global capacity & user-specific warnings
  const { data: rawBookings } = await supabase
    .from("booking_info")
    .select(`
      id,
      profiles_id,
      booking_date,
      booking_timeslot,
      booking_status,
      booking_pet_info (
        id
      )
    `)
    .eq("sp_id", spId)
    .in("booking_status", [
      "pending_sp_response",
      "to pay",
      "approved",
      "paid",
      "processing"
    ]);

  const existingBookings = (rawBookings || []).map((b) => ({
    id: b.id,
    profiles_id: b.profiles_id,
    booking_date: b.booking_date,
    booking_timeslot: b.booking_timeslot,
    booking_status: b.booking_status,
    pet_count: Array.isArray(b.booking_pet_info) ? b.booking_pet_info.length : 1,
  }));

  // Format full street address
  const fullAddress = [
    spInfo.business_street,
    spInfo.business_barangay,
    spInfo.business_city,
    spInfo.business_province,
    spInfo.business_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const coverImage =
    facilityImages && facilityImages.length > 0
      ? facilityImages[0].business_facility_images
      : "/placeholder-salon.png";

  const hoursMap = new Map();
  operatingHours?.forEach((oh) => {
    hoursMap.set(oh.day_of_week, oh);
  });

  return (
    <div className="book-appointment-container">
      <main className="book-appointment-main">
        <nav className="tab-nav">
          <a href="#overview" className="tab-item active">Overview</a>
          <a href="#prices" className="tab-item">Prices</a>
          <a href="#location" className="tab-item">Location</a>
          <a href="#reviews" className="tab-item">Reviews</a>
        </nav>

        <div className="booking-layout">
          <div className="main-details-col">
            <div id="overview" className="gallery-card">
              <img src={coverImage} alt={spInfo.business_name} className="main-facility-img" />
            </div>

            <div className="business-header-card">
              <h1 className="business-title">{spInfo.business_name}</h1>
              <p className="business-address">
                <FaMapMarkerAlt className="pin-icon" /> {fullAddress}{" "}
                {spInfo.business_google_map_url && (
                  <a
                    href={spInfo.business_google_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    <FaExternalLinkAlt />
                  </a>
                )}
              </p>
              {spInfo.business_bio && (
                <p className="business-bio">{spInfo.business_bio}</p>
              )}
            </div>

            <div id="location" className="section-block">
              <h2 className="section-title">Operating Hours</h2>
              <div className="hours-grid" style={{ marginBottom: '20px' }}>
                {ALL_DAYS.map((day) => {
                  const dayData = hoursMap.get(day);
                  return (
                    <div key={day} className={`hours-card ${!dayData ? "closed" : ""}`}>
                      <div className="day-header">
                        <FaClock className="clock-icon" /> {day}
                      </div>
                      <div className="time-range">
                        {dayData
                          ? `${dayData.opening_time.slice(0, 5)} - ${dayData.closing_time.slice(0, 5)}`
                          : "Closed"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {spInfo.business_latitude && spInfo.business_longitude ? (
                <ServiceLocationMap
                  businessName={spInfo.business_name}
                  businessCity={spInfo.business_city}
                  latitude={spInfo.business_latitude}
                  longitude={spInfo.business_longitude}
                />
              ) : (
                <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  Map coordinates are not provided for this business yet.
                </p>
              )}
            </div>

            <div id="prices" className="section-block">
              <h2 className="section-title">Service Prices</h2>
              <span className="vat-text">* VAT inclusive</span>

              {!services || services.length === 0 ? (
                <p className="no-services-text">No active services listed yet.</p>
              ) : (
                services.map((service) => {
                  const activeOptions =
                    service.sp_service_options?.filter(
                      (opt: any) => opt.option_status === "active"
                    ) || [];

                  return (
                    <div key={service.id} className="service-group-card">
                      <div className="service-group-header">
                        <h3 className="service-name">{service.service_name}</h3>
                        <span className="service-type-badge">
                          {service.service_type === "individual_service" ? "Individual" : "Package"}
                        </span>
                      </div>

                      <p className="service-desc">
                        {service.service_description || "No description"}
                      </p>

                      {activeOptions.length > 0 && (
                        <div className="table-responsive">
                          <table className="options-table">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Size</th>
                                <th>Weight (kg)</th>
                                <th>Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOptions.map((opt: any) => (
                                <tr key={opt.id}>
                                  <td className="capitalize">{opt.pet_type}</td>
                                  <td className="capitalize">{opt.pet_size.replace("_", " ")}</td>
                                  <td>{`${opt.pet_min_weight_range}-${opt.pet_max_weight_range}`}</td>
                                  <td className="price-cell">₱{parseFloat(opt.service_price).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <aside className="booking-sidebar-col">
            <BookingWidget
              spId={spId}
              operatingHours={operatingHours || []}
              existingBookings={userBookings || []}
              waiverUrl={spInfo.business_waiver_url}
              currentUserId={session.user.id}
            />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}