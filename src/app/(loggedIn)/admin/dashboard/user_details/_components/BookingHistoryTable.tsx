"use client";

import Link from "next/link";
import { FaHistory, FaList } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { BookingRow, STATUS_LABELS } from "../_types";
import styles from "../page.module.css";

interface Props {
  bookings: BookingRow[];
  bookingsLoading: boolean;
  onViewDetails: (booking: BookingRow) => void;
  /** Pass the profile id to enable the "View Full History" link when the list is capped */
  userId?: string;
  /** Cap the number of rows rendered */
  limit?: number;
}

export const BookingHistoryTable = ({ bookings, bookingsLoading, onViewDetails, userId, limit }: Props) => {
  const formatDateWithSlot = (dateString: string, timeslot: string) => {
    if (!dateString) return "-";
    const datePart = new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    return timeslot ? `${datePart} at ${timeslot}` : datePart;
  };

  const formatStatusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");

  const displayedBookings = limit ? bookings.slice(0, limit) : bookings;
  const hasMore = !!limit && bookings.length > limit;

  return (
    <section className={styles["info-card"]}>
      <div className={styles["card-header"]}>
        <FaHistory />
        <h2>Full Booking History</h2>
      </div>
      <p className={styles["card-subtitle"]}>
        {limit
          ? `Showing ${Math.min(limit, bookings.length)} most recent of ${bookings.length} appointments`
          : "Showing all appointments (Pending, Paid, Cancelled, Rated, etc.)"}
      </p>

      <div className={styles["providers-table-wrapper"]}>
        {bookingsLoading ? (
          <div className={styles["loading-state"]}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className={styles["empty-state"]}>No bookings found for this user.</div>
        ) : (
          <table className={styles["providers-table"]}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Pets</th>
                <th>Service Provider</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <div className={styles["date-cell-main"]}>
                      {formatDateWithSlot(booking.booking_date, booking.booking_timeslot)}
                    </div>
                    <div className={styles["date-cell-status"]}>
                      Status:{" "}
                      <span className={`${styles["status-text"]} ${styles[booking.booking_status] || ""}`}>
                        {formatStatusLabel(booking.booking_status)}
                      </span>
                    </div>
                    <div className={styles["date-cell-status"]}>
                      Feedback: {booking.booking_review || "-"}
                    </div>
                  </td>
                  <td>{booking.booking_pet_info?.length || 0} Pet/s</td>
                  <td>{booking.sp_general_info?.business_name || "-"}</td>
                  <td>₱{Number(booking.booking_total_amount).toFixed(2)}</td>
                  <td>
                    <button className={styles["btn-view-details"]} onClick={() => onViewDetails(booking)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && userId && (
        <div className={styles["view-full-history-row"]}>
          <Link href={`${ROUTES.ADMIN.BOOKINGS}?id=${userId}`} className={styles["btn-view-full-history"]}>
            <FaList /> View Full Booking History ({bookings.length})
          </Link>
        </div>
      )}
    </section>
  );
};