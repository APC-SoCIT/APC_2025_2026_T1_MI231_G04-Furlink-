"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft, FaTimes, FaUser, FaHistory, FaExclamationTriangle,
  FaPaperPlane, FaChevronDown, FaChevronUp, FaUserSlash, FaUserCheck, } from "react-icons/fa";
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

interface WarningRow {
  id: string;
  warning_message: string;
  created_at: string | null;
  severity: string;
  status: string; 
  expires_at: string | null;
}

interface SuspensionRow {
  id: string;
  reason: string;
  triggered_by_warning_ids: string[];
  suspended_at: string;
  suspended_until: string;
  lifted_at: string | null;
  lifted_by: string | null;
  status: string; 
}

// Roles that should have an email shown 
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

const SUSPENSION_DAYS = 7;
const WARNING_THRESHOLD = 3;

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

  // Warnings state
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(true);
  const [warningMessage, setWarningMessage] = useState("");
  const [sendingWarning, setSendingWarning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Suspension state
  const [currentSuspension, setCurrentSuspension] = useState<SuspensionRow | null>(null);
  const [suspensionLoading, setSuspensionLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [liftingSuspension, setLiftingSuspension] = useState(false);
  const [autoSuspended, setAutoSuspended] = useState(false); // drives the "auto" styling on the banner

  // Feedback for admin actions
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Confirmation modals 
  const [showSendWarningConfirm, setShowSendWarningConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showLiftConfirm, setShowLiftConfirm] = useState(false);

  // Result modal shown when a warning triggers an auto-suspension
  const [autoSuspendNotice, setAutoSuspendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchBookingHistory();
      fetchWarnings();
      fetchCurrentSuspension();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
      setBookingsLoading(false);
      setWarningsLoading(false);
      setSuspensionLoading(false);
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

  // Business email from sp_general_info, linked via profiles_id
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

  const fetchWarnings = async () => {
    try {
      setWarningsLoading(true);
      const { data, error } = await supabase
        .from("user_warnings")
        .select("id, warning_message, created_at, severity, status, expires_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWarnings(data || []);
    } catch (err: any) {
      console.error("Error fetching warnings:", err);
    } finally {
      setWarningsLoading(false);
    }
  };

  // Most recet active suspension (if any)
  const fetchCurrentSuspension = async () => {
    try {
      setSuspensionLoading(true);
      const { data, error } = await supabase
        .from("user_suspensions")
        .select(
          "id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, status"
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("suspended_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSuspension(data || null);
    } catch (err: any) {
      console.error("Error fetching suspension:", err);
    } finally {
      setSuspensionLoading(false);
    }
  };

  // Suspension
  const performSuspension = async (
    warningIds: string[],
    reason: string
  ): Promise<SuspensionRow> => {
    const suspendedUntil = new Date(
      Date.now() + SUSPENSION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("user_suspensions")
      .insert({
        user_id: userId,
        reason,
        triggered_by_warning_ids: warningIds,
        suspended_until: suspendedUntil,
        status: "active",
      })
      .select(
        "id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, status"
      )
      .single();

    if (error) throw error;

    const { error: profileError } = await supabase.rpc("suspend_user_profile", {
      target_user_id: userId,
      new_status: "suspended",
    });

    if (profileError) {
      console.error("Failed to update profile status:", profileError);
      throw profileError;
    }

    if (warningIds.length > 0) {
      const { error: updateError } = await supabase
        .from("user_warnings")
        .update({ status: "consumed" })
        .in("id", warningIds);

      if (updateError) throw updateError;

      setWarnings((prev) =>
        prev.map((w) =>
          warningIds.includes(w.id) ? { ...w, status: "consumed" } : w
        )
      );
    }

    setCurrentSuspension(data);
    return data;
  };

  // Opens the confirmation modal
  const handleSendWarning = () => {
    if (!warningMessage.trim() || !userId) return;
    setShowSendWarningConfirm(true);
  };

  // Runs insert/auto-suspend logic
  const confirmSendWarning = async () => {
    const trimmed = warningMessage.trim();
    if (!trimmed || !userId) return;

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setAutoSuspendNotice(null);
    setSendingWarning(true);
    try {
      const {
        data: { user: adminUser },
      } = await supabase.auth.getUser();

      const { data: newWarning, error } = await supabase
        .from("user_warnings")
        .insert({
          user_id: userId,
          warning_message: trimmed,
          issued_by: adminUser?.id || null,
        })
        .select("id, warning_message, created_at, severity, status, expires_at")
        .single();

      if (error) throw error;

      const updatedWarnings = [newWarning, ...warnings];
      setWarnings(updatedWarnings);
      setWarningMessage("");

      // Only auto-suspend if the user isnt already in an active suspension
      const activeWarnings = updatedWarnings.filter((w) => w.status === "active");
      const alreadySuspended =
        !!currentSuspension &&
        currentSuspension.status === "active" &&
        new Date(currentSuspension.suspended_until) > new Date();

      if (activeWarnings.length >= WARNING_THRESHOLD && !alreadySuspended) {
        const warningIds = activeWarnings.map((w) => w.id);
        await performSuspension(
          warningIds,
          `Auto-suspended: reached ${activeWarnings.length} active warnings`
        );
        setAutoSuspended(true);
        setAutoSuspendNotice(
          `This was the ${getOrdinal(
            activeWarnings.length
          )} active warning, so the user was automatically suspended for ${SUSPENSION_DAYS} days.`
        );
      } else {
        setActionSuccess("Warning issued.");
      }
    } catch (err: any) {
      console.error("Error sending warning:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        raw: err,
      });
      setActionError(err?.message || err?.details || "Failed to send warning.");
    } finally {
      setSendingWarning(false);
      setShowSendWarningConfirm(false);
    }
  };

  // Opens the confirmation modal
  const handleSuspend = () => {
    if (!userId) return;
    setShowSuspendConfirm(true);
  };

  // Runs the suspension logic
  const confirmSuspend = async () => {
    if (!userId) return;

    const activeWarnings = warnings.filter((w) => w.status === "active");

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setSuspending(true);
    try {
      const warningIds = activeWarnings.map((w) => w.id);
      await performSuspension(
        warningIds,
        warningIds.length > 0
          ? `Manual suspension by admin (${warningIds.length} active warning${
              warningIds.length === 1 ? "" : "s"
            })`
          : "Manual suspension by admin"
      );
      setActionSuccess(`User suspended for ${SUSPENSION_DAYS} days.`);
    } catch (err: any) {
      console.error("Error suspending user:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        raw: err,
      });
      setActionError(err?.message || err?.details || "Failed to suspend user.");
    } finally {
      setSuspending(false);
      setShowSuspendConfirm(false);
    }
  };

  // Opens the confirmation modal (called by the "Lift Suspension" button)
  const handleLiftSuspension = () => {
    if (!userId || !currentSuspension) return;
    setShowLiftConfirm(true);
  };

  // Runs the actual lift logic (called by the confirm modal)
  const confirmLiftSuspension = async () => {
    if (!userId || !currentSuspension) return;

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setLiftingSuspension(true);
    try {
      const {
        data: { user: adminUser },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("user_suspensions")
        .update({
          status: "lifted",
          lifted_at: new Date().toISOString(),
          lifted_by: adminUser?.id || null,
        })
        .eq("id", currentSuspension.id);

      if (error) throw error;

      const { error: profileError } = await supabase.rpc("suspend_user_profile", {
        target_user_id: userId,
        new_status: "active",
      });

      if (profileError) {
        console.error("Failed to lift profile status:", profileError);
        throw profileError;
      }

      setCurrentSuspension(null);
      setActionSuccess("Suspension lifted.");
    } catch (err: any) {
      console.error("Error lifting suspension:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        raw: err,
      });
      setActionError(err?.message || err?.details || "Failed to lift suspension.");
    } finally {
      setLiftingSuspension(false);
      setShowLiftConfirm(false);
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

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Combines booking_date booking_timeslot into proper formating
  const formatDateWithSlot = (dateString: string, timeslot: string) => {
    const datePart = formatDate(dateString);
    return timeslot ? `${datePart} at ${timeslot}` : datePart;
  };

  const formatStatusLabel = (status: string) =>
    STATUS_LABELS[status] || status.replace(/_/g, " ");

  // 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11-13 -> "th", etc.
  const getOrdinal = (n: number) => {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  const getServiceSummary = (booking: BookingRow) => {
    const names = new Set<string>();
    booking.booking_pet_info?.forEach((pet) =>
      pet.booking_service_info?.forEach((svc) => names.add(svc.booking_service_name))
    );
    return names.size > 0 ? Array.from(names).join(", ") : "-";
  };

  const showEmail = !!user?.role && ROLES_WITH_EMAIL.includes(user.role);

  const activeWarningCount = warnings.filter((w) => w.status === "active").length;

  const isSuspended =
    !!currentSuspension &&
    currentSuspension.status === "active" &&
    new Date(currentSuspension.suspended_until) > new Date();

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
          <div className={styles["header-pills"]}>
            {isSuspended && (
              <span className={styles["suspended-pill"]}>Suspended</span>
            )}
            {user.role && (
              <span className={styles["role-pill"]}>
                {user.role.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {isSuspended && currentSuspension && (
          <div
            className={`${styles["suspension-banner"]} ${
              autoSuspended ? styles["suspension-banner-auto"] : ""
            }`}
          >
            <FaUserSlash />
            <span>
              {autoSuspended && (
                <strong className={styles["auto-tag"]}>Auto-suspended — </strong>
              )}
              This user is suspended until{" "}
              <strong>{formatDateTime(currentSuspension.suspended_until)}</strong>.
              {" "}Reason: {currentSuspension.reason}
            </span>
          </div>
        )}

        {(actionError || actionSuccess) && (
          <div
            className={
              actionError ? styles["action-error"] : styles["action-success"]
            }
          >
            {actionError || actionSuccess}
          </div>
        )}

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
                  <span
                    className={`${styles["count-pill"]} ${
                      activeWarningCount >= WARNING_THRESHOLD
                        ? styles["count-pill-danger"]
                        : ""
                    }`}
                  >
                    Count: {warningsLoading ? "…" : activeWarningCount}
                  </span>
                </div>
                <textarea
                  className={styles["warning-textarea"]}
                  placeholder="Type warning message here..."
                  rows={3}
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  disabled={sendingWarning}
                />
                <button
                  className={styles["btn-send-notification"]}
                  onClick={handleSendWarning}
                  disabled={sendingWarning || !warningMessage.trim()}
                >
                  <FaPaperPlane />
                  {sendingWarning ? "Sending..." : "Send Warning"}
                </button>
                {activeWarningCount >= WARNING_THRESHOLD - 1 && !isSuspended && (
                  <p className={styles["threshold-note"]}>
                    {activeWarningCount + 1 >= WARNING_THRESHOLD
                      ? `The next warning will automatically suspend this user for ${SUSPENSION_DAYS} days.`
                      : `This user has ${activeWarningCount} active warning${
                          activeWarningCount === 1 ? "" : "s"
                        }.`}
                  </p>
                )}
              </div>

              <hr className={styles["admin-divider"]} />

              {/* View History */}
              <button
                className={styles["btn-view-history"]}
                onClick={() => setShowHistory((prev) => !prev)}
              >
                {showHistory ? <FaChevronUp /> : <FaChevronDown />}
                View History ({warningsLoading ? "…" : warnings.length})
              </button>

              {showHistory && (
                <div className={styles["warning-history-list"]}>
                  {warningsLoading ? (
                    <p className={styles["warning-history-empty"]}>Loading...</p>
                  ) : warnings.length === 0 ? (
                    <p className={styles["warning-history-empty"]}>
                      No warnings issued yet.
                    </p>
                  ) : (
                    warnings.map((w) => (
                      <div key={w.id} className={styles["warning-history-item"]}>
                        <div className={styles["warning-history-top"]}>
                          <span
                            className={`${styles["warning-status-tag"]} ${
                              styles[`warning-status-${w.status}`] || ""
                            }`}
                          >
                            {w.status}
                          </span>
                          <span className={styles["warning-history-date"]}>
                            {formatDateTime(w.created_at)}
                          </span>
                        </div>
                        <p className={styles["warning-history-message"]}>
                          {w.warning_message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              <hr className={styles["admin-divider"]} />

              {/* Account Suspension */}
              <div className={styles["admin-block"]}>
                <span className={styles["admin-block-label"]}>Account Suspension</span>
                <p className={styles["admin-block-desc"]}>
                  {isSuspended && currentSuspension
                    ? `Suspended until ${formatDateTime(currentSuspension.suspended_until)}.`
                    : `Temporarily disable this user's access for ${SUSPENSION_DAYS} days. This also happens automatically once the user reaches ${WARNING_THRESHOLD} active warnings.`}
                </p>
                {isSuspended ? (
                  <button
                    className={styles["btn-lift-suspend"]}
                    onClick={handleLiftSuspension}
                    disabled={liftingSuspension}
                  >
                    <FaUserCheck />
                    {liftingSuspension ? "Lifting..." : "Lift Suspension"}
                  </button>
                ) : (
                  <button
                    className={styles["btn-suspend"]}
                    onClick={handleSuspend}
                    disabled={suspending || suspensionLoading}
                  >
                    <FaUserSlash />
                    {suspending ? "Suspending..." : `Suspend for ${SUSPENSION_DAYS} Days`}
                  </button>
                )}
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

      {/* SEND WARNING CONFIRMATION MODAL */}
      {showSendWarningConfirm && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => !sendingWarning && setShowSendWarningConfirm(false)}
        >
          <div
            className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Confirm Warning</h3>
              <button
                className={styles["btn-close-modal"]}
                onClick={() => setShowSendWarningConfirm(false)}
                disabled={sendingWarning}
              >
                <FaTimes />
              </button>
            </div>

            <p className={styles["confirm-modal-message"]}>
              Send this warning to{" "}
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              ?
              {activeWarningCount + 1 >= WARNING_THRESHOLD && !isSuspended && (
                <>
                  {" "}
                  This will be their {activeWarningCount + 1}
                  {activeWarningCount + 1 === 1
                    ? "st"
                    : activeWarningCount + 1 === 2
                    ? "nd"
                    : activeWarningCount + 1 === 3
                    ? "rd"
                    : "th"}{" "}
                  active warning, which will automatically suspend the user
                  for {SUSPENSION_DAYS} days.
                </>
              )}
            </p>
            <p className={styles["confirm-modal-message"]}>
              <em>&ldquo;{warningMessage.trim()}&rdquo;</em>
            </p>

            <div className={styles["confirm-modal-actions"]}>
              <button
                className={styles["btn-confirm-cancel"]}
                onClick={() => setShowSendWarningConfirm(false)}
                disabled={sendingWarning}
              >
                Cancel
              </button>
              <button
                className={styles["btn-confirm-proceed"]}
                onClick={confirmSendWarning}
                disabled={sendingWarning}
              >
                {sendingWarning ? "Sending..." : "Send Warning"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND CONFIRMATION MODAL */}
      {showSuspendConfirm && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => !suspending && setShowSuspendConfirm(false)}
        >
          <div
            className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Confirm Suspension</h3>
              <button
                className={styles["btn-close-modal"]}
                onClick={() => setShowSuspendConfirm(false)}
                disabled={suspending}
              >
                <FaTimes />
              </button>
            </div>

            <p className={styles["confirm-modal-message"]}>
              Suspend{" "}
              <strong>
                {user.first_name} {user.last_name}
              </strong>{" "}
              for {SUSPENSION_DAYS} days? They will be unable to access their
              account until the suspension lifts.
            </p>

            <div className={styles["confirm-modal-actions"]}>
              <button
                className={styles["btn-confirm-cancel"]}
                onClick={() => setShowSuspendConfirm(false)}
                disabled={suspending}
              >
                Cancel
              </button>
              <button
                className={styles["btn-confirm-danger"]}
                onClick={confirmSuspend}
                disabled={suspending}
              >
                {suspending ? "Suspending..." : `Suspend for ${SUSPENSION_DAYS} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIFT SUSPENSION CONFIRMATION MODAL */}
      {showLiftConfirm && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => !liftingSuspension && setShowLiftConfirm(false)}
        >
          <div
            className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Lift Suspension</h3>
              <button
                className={styles["btn-close-modal"]}
                onClick={() => setShowLiftConfirm(false)}
                disabled={liftingSuspension}
              >
                <FaTimes />
              </button>
            </div>

            <p className={styles["confirm-modal-message"]}>
              Lift{" "}
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              &apos;s suspension early? Their account will regain access
              immediately.
            </p>

            <div className={styles["confirm-modal-actions"]}>
              <button
                className={styles["btn-confirm-cancel"]}
                onClick={() => setShowLiftConfirm(false)}
                disabled={liftingSuspension}
              >
                Cancel
              </button>
              <button
                className={styles["btn-confirm-proceed"]}
                onClick={confirmLiftSuspension}
                disabled={liftingSuspension}
              >
                {liftingSuspension ? "Lifting..." : "Lift Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AUTO-SUSPEND RESULT MODAL */}
      {autoSuspendNotice && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => setAutoSuspendNotice(null)}
        >
          <div
            className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>User Auto-Suspended</h3>
              <button
                className={styles["btn-close-modal"]}
                onClick={() => setAutoSuspendNotice(null)}
              >
                <FaTimes />
              </button>
            </div>

            <p className={styles["confirm-modal-message"]}>
              Warning issued for{" "}
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              . {autoSuspendNotice}
            </p>

            <div className={styles["confirm-modal-actions"]}>
              <button
                className={styles["btn-confirm-proceed"]}
                onClick={() => setAutoSuspendNotice(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}