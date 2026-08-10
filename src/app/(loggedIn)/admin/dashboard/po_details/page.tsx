"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft, FaTimes, FaUser, FaHistory, FaExclamationTriangle, 
  FaPaperPlane, FaChevronDown, FaUserSlash, } from "react-icons/fa";
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

// Human-friendly labels for booking_status
const STATUS_LABELS: Record<string, string> = {
  pending_sp_response: "Pending",
  approved: "Approved",
  rejected: "Declined",
  paid: "Paid",
  cancelled: "Cancelled",
  to_rate: "To Rate",
  rated: "Rated",
};

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

  // Combines booking_date booking_timeslot into proper formating 
  const formatDateWithSlot = (dateString: string, timeslot: string) => {
    const datePart = formatDate(dateString);
    return timeslot ? `${datePart} at ${timeslot}` : datePart;
  };

  const formatStatusLabel = (status: string) =>
    STATUS_LABELS[status] || status.replace(/_/g, " ");

  const getServiceSummary = (booking: BookingRow) => {
    const names = new Set<string>();
    booking.booking_pet_info?.forEach((pet) =>
      pet.booking_service_info?.forEach((svc) => names.add(svc.booking_service_name))
    );
    return names.size > 0 ? Array.from(names).join(", ") : "-";
  };

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
        {/* Back Button */}
        <div className={styles["back-button-container"]}>
          <button
            className={styles["btn-back"]}
            onClick={() => router.push(ROUTES.ADMIN.ADMIN_DASHBOARD)}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        {/* PAGE HEADER */}
        <div className={styles["page-header"]}>
          <h1 className={styles["page-title"]}>
            {user.first_name} {user.last_name}
          </h1>
          {user.role && (
            <span className={styles["role-pill"]}>
              {user.role.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* MAIN TWO-COLUMN LAYOUT */}
        <div className={styles["details-grid"]}>
          {/* LEFT COLUMN Personal Info & Admin Actions */}
          <div className={styles["left-column"]}>
            {/* PERSONAL INFORMATION */}
            <section className={styles["info-card"]}>
              <div className={styles["card-header"]}>
                <FaUser />
                <h2>Personal Information</h2>
              </div>

              <dl className={styles["info-list"]}>
                <div className={styles["info-row"]}>
                  <dt>Role:</dt>
                  <dd>{user.role ? user.role.replace(/_/g, " ") : "-"}</dd>
                </div>

                {showEmail && (
                  <div className={styles["info-row"]}>
                    <dt>Email:</dt>
                    <dd>{businessEmail || "-"}</dd>
                  </div>
                )}

                <div className={styles["info-row"]}>
                  <dt>Mobile:</dt>
                  <dd>{user.mobile_number || "-"}</dd>
                </div>

                <div className={styles["info-row"]}>
                  <dt>Date of Birth:</dt>
                  <dd>{formatDate(user.date_of_birth)}</dd>
                </div>

                <div className={styles["info-row"]}>
                  <dt>Member Since:</dt>
                  <dd>{formatDate(user.created_at)}</dd>
                </div>
              </dl>
            </section>

            {/* ADMIN ACTIONS */}
            <section className={styles["admin-actions-card"]}>
              <div className={styles["admin-card-header"]}>
                <FaExclamationTriangle />
                <h2>Admin Actions</h2>
              </div>

              {/* Issue Warning */}
              <div className={styles["admin-block"]}>
                <div className={styles["admin-block-label-row"]}>
                  <span className={styles["admin-block-label"]}>Issue Warning</span>
                  <span className={styles["count-pill"]}>Count: 0</span>
                </div>
                <textarea
                  className={styles["warning-textarea"]}
                  placeholder="Type warning message here..."
                  rows={3}
                />
                <button className={styles["btn-send-notification"]}>
                  <FaPaperPlane /> Send Notification
                </button>
              </div>

              <hr className={styles["admin-divider"]} />

              {/* View History */}
              <button className={styles["btn-view-history"]}>
                <FaChevronDown /> View History (0)
              </button>

              <hr className={styles["admin-divider"]} />

              {/* Account Suspension */}
              <div className={styles["admin-block"]}>
                <span className={styles["admin-block-label"]}>Account Suspension</span>
                <p className={styles["admin-block-desc"]}>
                  Temporarily disable this user's access for 7 days.
                </p>
                <button className={styles["btn-suspend"]}>
                  <FaUserSlash /> Suspend for 1 Week
                </button>
              </div>
            </section>
          </div>

          {/* BOOKING HISTORY */}
          <section className={styles["info-card"]}>
            <div className={styles["card-header"]}>
              <FaHistory />
              <h2>Full Booking History</h2>
            </div>
            <p className={styles["card-subtitle"]}>
              Showing all appointments (Pending, Paid, Cancelled, Rated, etc.)
            </p>

            <div className={styles["providers-table-wrapper"]}>
              {bookingsLoading ? (
                <div className={styles["loading-state"]}>Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div className={styles["empty-state"]}>
                  No bookings found for this user.
                </div>
              ) : (
                <table className={styles["providers-table"]}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Pets</th>
                      <th>Service</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <div className={styles["date-cell-main"]}>
                            {formatDateWithSlot(booking.booking_date, booking.booking_timeslot)}
                          </div>
                          <div className={styles["date-cell-status"]}>
                            Status:{" "}
                            <span
                              className={`${styles["status-text"]} ${
                                styles[booking.booking_status] || ""
                              }`}
                            >
                              {formatStatusLabel(booking.booking_status)}
                            </span>
                          </div>
                        </td>
                        <td>{booking.booking_pet_info?.length || 0} Pet/s</td>
                        <td>{getServiceSummary(booking)}</td>
                        <td>₱{Number(booking.booking_total_amount).toFixed(2)}</td>
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
          </section>
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
                    {formatStatusLabel(selectedBooking.booking_status)}
                  </span>
                </div>
                <div className={styles["info-item"]}>
                  <span className={styles["info-label"]}>Total Amount</span>
                  <span className={styles["info-value"]}>
                    ₱{Number(selectedBooking.booking_total_amount).toFixed(2)}
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