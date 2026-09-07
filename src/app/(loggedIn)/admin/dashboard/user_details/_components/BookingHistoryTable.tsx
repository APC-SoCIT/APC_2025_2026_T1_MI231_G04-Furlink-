"use client";

import { FaHistory } from "react-icons/fa";
import { BookingRow, STATUS_LABELS } from "../_types";
import styles from "../page.module.css";

interface Props {
  bookings: BookingRow[];
  bookingsLoading: boolean;
  onViewDetails: (booking: BookingRow) => void;
}

export const BookingHistoryTable = ({ bookings, bookingsLoading, onViewDetails }: Props) => {
  const formatDateWithSlot = (dateString: string, timeslot: string) => {
    if (!dateString) return "-";
    const datePart = new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    return timeslot ? `${datePart} at ${timeslot}` : datePart;
  };

  const formatStatusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");

  const getServiceSummary = (booking: BookingRow) => {
    const names = new Set<string>();
    booking.booking_pet_info?.forEach((pet) =>
      pet.booking_service_info?.forEach((svc) => names.add(svc.booking_service_name))
    );
    return names.size > 0 ? Array.from(names).join(", ") : "-";
  };

  return (
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
          <div className={styles["empty-state"]}>No bookings found for this user.</div>
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
                      <span className={`${styles["status-text"]} ${styles[booking.booking_status] || ""}`}>
                        {formatStatusLabel(booking.booking_status)}
                      </span>
                    </div>
                  </td>
                  <td>{booking.booking_pet_info?.length || 0} Pet/s</td>
                  <td>{getServiceSummary(booking)}</td>
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
    </section>
  );
};