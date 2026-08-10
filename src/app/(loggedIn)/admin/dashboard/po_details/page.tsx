"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft, FaTimes } from "react-icons/fa";
import styles from "./page.module.css";

interface BookingServiceInfo {
  id: string;
  booking_service_name: string;
  booking_service_type: string;
  booking_price: number;
}

interface BookingPetInfo {
  id: string;
  booking_pet_name: string;
  booking_pet_type: string;
  booking_breed: string;
  booking_gender: string;
  booking_weight: number;
  booking_calculated_size: string;
  booking_behavior: string[];
  booking_grooming_notes: string | null;
  booking_service_info: BookingServiceInfo[];
}

interface BookingRow {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  booking_total_amount: number;
  booking_rejection_reason: string | null;
  booking_comment: string | null;
  booking_overall_rating: number | null;
  booking_staff_rating: number | null;
  created_at: string | null;
  sp_general_info: { business_name: string } | null;
  booking_pet_info: BookingPetInfo[];
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  mobile_number: string | null;
  date_of_birth: string | null;
  role: string | null;
  created_at: string | null;
}

// Roles that should have an email shown (pulled from sp_general_info.business_email)
const ROLES_WITH_EMAIL = ["service_provider", "both"];

export default function PODetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchBookingHistory();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
      setBookingsLoading(false);
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, username, mobile_number, date_of_birth, role, created_at"
        )
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);

      // Only fetch business email if the role warrants it
      if (data?.role && ROLES_WITH_EMAIL.includes(data.role)) {
        fetchBusinessEmail();
      }
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      setError(err.message || "Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };

  // Pulls the business email from sp_general_info, linked via profiles_id
  const fetchBusinessEmail = async () => {
    try {
      const { data, error } = await supabase
        .from("sp_general_info")
        .select("business_email")
        .eq("profiles_id", userId)
        .maybeSingle();

      if (error) throw error;
      setBusinessEmail(data?.business_email || null);
    } catch (err: any) {
      console.error("Error fetching business email:", err);
    }
  };

  const fetchBookingHistory = async () => {
    try {
      setBookingsLoading(true);
      const { data, error } = await supabase
        .from("booking_info")
        .select(
          `
          id,
          booking_date,
          booking_timeslot,
          booking_status,
          booking_total_amount,
          booking_rejection_reason,
          booking_comment,
          booking_overall_rating,
          booking_staff_rating,
          created_at,
          sp_general_info ( business_name ),
          booking_pet_info (
            id,
            booking_pet_name,
            booking_pet_type,
            booking_breed,
            booking_gender,
            booking_weight,
            booking_calculated_size,
            booking_behavior,
            booking_grooming_notes,
            booking_service_info (
              id,
              booking_service_name,
              booking_service_type,
              booking_price
            )
          )
          `
        )
        .eq("profiles_id", userId)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      setBookings((data as unknown as BookingRow[]) || []);
    } catch (err: any) {
      console.error("Error fetching booking history:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ");

  const showEmail = !!user?.role && ROLES_WITH_EMAIL.includes(user.role);

  if (loading)
    return (
      <div className={styles["loading-state"]}>Loading user details...</div>
    );
  if (error)
    return <div className={styles["error-state"]}>Error: {error}</div>;
  if (!user)
    return <div className={styles["empty-state"]}>User not found.</div>;

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        {/* Header / Back Button */}
        <div className={styles["back-button-container"]}>
            <button
            className={styles["btn-back"]}
            onClick={() => {
                router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
            }}
            >
                <FaArrowLeft /> Back to Dashboard
            </button>
        </div>

        {/* PERSONAL INFORMATION */}
        <div className={styles["dashboard-list-container"]}>
          <div className={styles["list-header"]}>
            <div>
              <h2 className={styles["list-title"]}>
                {user.first_name} {user.last_name}
              </h2>
              {user.role && (
                <span className={styles["role-pill"]}>
                  {user.role.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          <section className={styles["detail-section"]}>
            <h3>Personal Information</h3>
            <div className={styles["info-grid"]}>
              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Role</span>
                <span className={styles["info-value"]}>
                  {user.role ? user.role.replace(/_/g, " ") : "-"}
                </span>
              </div>

              {showEmail && (
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Email</span>
                  <span className={styles["info-value"]}>
                    {businessEmail || "-"}
                  </span>
                </div>
              )}

              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Mobile Number</span>
                <span className={styles["info-value"]}>
                  {user.mobile_number || "-"}
                </span>
              </div>
              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Date of Birth</span>
                <span className={styles["info-value"]}>
                  {formatDate(user.date_of_birth)}
                </span>
              </div>
              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Joined</span>
                <span className={styles["info-value"]}>
                  {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* BOOKING HISTORY */}
        <div className={styles["dashboard-list-container"]}>
          <div className={styles["list-header"]}>
            <h2 className={styles["list-title"]}>Booking History</h2>
          </div>

          <div className={styles["providers-table-wrapper"]}>
            {bookingsLoading ? (
              <div className={styles["loading-state"]}>
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className={styles["empty-state"]}>
                No bookings found for this user.
              </div>
            ) : (
              <table className={styles["providers-table"]}>
                <thead>
                  <tr>
                    <th>Date of Booking</th>
                    <th>Number of Pets</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className={styles["fw-bold"]}>
                        {formatDate(booking.booking_date)}
                      </td>
                      <td>{booking.booking_pet_info?.length || 0}</td>
                      <td>
                        <span
                          className={`${styles["status-pill"]} ${
                            styles[booking.booking_status] || ""
                          }`}
                        >
                          {formatStatus(booking.booking_status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className={styles["btn-view-details"]}
                          onClick={() => setSelectedBooking(booking)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className={styles["modal-box"]}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Booking Details</h3>
              <button
                className={styles["btn-close-modal"]}
                onClick={() => setSelectedBooking(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles["modal-content"]}>
              <div className={styles["info-grid"]}>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Service Provider</span>
                  <span className={styles["info-value"]}>
                    {selectedBooking.sp_general_info?.business_name || "-"}
                  </span>
                </div>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Date</span>
                  <span className={styles["info-value"]}>
                    {formatDate(selectedBooking.booking_date)}
                  </span>
                </div>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Timeslot</span>
                  <span className={styles["info-value"]}>
                    {selectedBooking.booking_timeslot}
                  </span>
                </div>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Status</span>
                  <span
                    className={`${styles["status-pill"]} ${
                      styles[selectedBooking.booking_status] || ""
                    }`}
                  >
                    {formatStatus(selectedBooking.booking_status)}
                  </span>
                </div>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Total Amount</span>
                  <span className={styles["info-value"]}>
                    ₱{selectedBooking.booking_total_amount}
                  </span>
                </div>
              </div>

              {selectedBooking.booking_status === "rejected" &&
                selectedBooking.booking_rejection_reason && (
                  <div className={styles["rejection-note"]}>
                    <strong>Rejection Reason:</strong>{" "}
                    {selectedBooking.booking_rejection_reason}
                  </div>
                )}

              {(selectedBooking.booking_overall_rating ||
                selectedBooking.booking_comment) && (
                <div className={styles["rating-note"]}>
                  {selectedBooking.booking_overall_rating && (
                    <p>
                      <strong>Overall Rating:</strong>{" "}
                      {selectedBooking.booking_overall_rating} / 5
                    </p>
                  )}
                  {selectedBooking.booking_staff_rating && (
                    <p>
                      <strong>Staff Rating:</strong>{" "}
                      {selectedBooking.booking_staff_rating} / 5
                    </p>
                  )}
                  {selectedBooking.booking_comment && (
                    <p>
                      <strong>Comment:</strong> {selectedBooking.booking_comment}
                    </p>
                  )}
                </div>
              )}

              <hr className={styles["modal-divider"]} />

              <h4 className={styles["modal-subtitle"]}>
                Pets ({selectedBooking.booking_pet_info?.length || 0})
              </h4>

              {selectedBooking.booking_pet_info &&
              selectedBooking.booking_pet_info.length > 0 ? (
                selectedBooking.booking_pet_info.map((pet) => (
                  <div key={pet.id} className={styles["pet-card"]}>
                    <h5>
                      {pet.booking_pet_name}{" "}
                      <span className={styles["pet-meta"]}>
                        ({pet.booking_breed}, {pet.booking_gender},{" "}
                        {pet.booking_weight}kg,{" "}
                        {pet.booking_calculated_size.replace(/_/g, " ")})
                      </span>
                    </h5>

                    {pet.booking_behavior?.length > 0 && (
                      <p className={styles["pet-behavior"]}>
                        Behavior: {pet.booking_behavior.join(", ")}
                      </p>
                    )}

                    {pet.booking_grooming_notes && (
                      <p className={styles["pet-notes"]}>
                        Notes: {pet.booking_grooming_notes}
                      </p>
                    )}

                    {pet.booking_service_info &&
                      pet.booking_service_info.length > 0 && (
                        <table className={styles["services-table"]}>
                          <thead>
                            <tr>
                              <th>Service</th>
                              <th>Type</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pet.booking_service_info.map((svc) => (
                              <tr key={svc.id}>
                                <td>{svc.booking_service_name}</td>
                                <td style={{ textTransform: "capitalize" }}>
                                  {svc.booking_service_type.replace(/_/g, " ")}
                                </td>
                                <td>₱{svc.booking_price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                  </div>
                ))
              ) : (
                <p>No pets recorded for this booking.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}