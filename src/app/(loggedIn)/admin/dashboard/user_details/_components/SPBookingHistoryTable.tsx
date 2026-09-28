"use client";

import Link from "next/link";
import { FaConciergeBell, FaList } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { SpBookingRow, STATUS_LABELS } from "../_types";
import styles from "../page.module.css";

interface Props {
  bookings: SpBookingRow[];
  loading: boolean;
  onViewDetails: (booking: SpBookingRow) => void;
  /** Profile id, enables the "View Full Booked Services" link when the list is capped */
  userId?: string;
  /** Cap the number of rows rendered */
  limit?: number;
}

export const SpBookingHistoryTable = ({ bookings, loading, onViewDetails, userId, limit }: Props) => {
  const formatDateWithSlot = (dateString: string, timeslot: string) => {
    if (!dateString) return "-";
    const datePart = new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    return timeslot ? `${datePart} at ${timeslot}` : datePart;
  };

  const formatStatusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");

  const ownerName = (b: SpBookingRow) =>
    `${b.pet_owner?.first_name ?? ""} ${b.pet_owner?.last_name ?? ""}`.trim() || "-";

  const displayed = limit ? bookings.slice(0, limit) : bookings;
  const hasMore = !!limit && bookings.length > limit;

  return (
    <section className={styles["info-card"]}>
      <div className={styles["card-header"]}>
        <FaConciergeBell />
        <h2>Booked Services (Service Provider)</h2>
      </div>
      <p className={styles["card-subtitle"]}>
        {limit
          ? `Showing ${Math.min(limit, bookings.length)} most recent of ${bookings.length} booked services`
          : "Showing all services booked with this service provider"}
      </p>

      <div className={styles["providers-table-wrapper"]}>
        {loading ? (
          <div className={styles["loading-state"]}>Loading booked services...</div>
        ) : bookings.length === 0 ? (
          <div className={styles["empty-state"]}>No one has booked this service provider yet.</div>
        ) : (
          <table className={styles["providers-table"]}>
            <thead>
              <tr>
                <th>Pet Owner</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((b) => (
                <tr key={b.id}>
                  <td>{ownerName(b)}</td>
                  <td>{formatDateWithSlot(b.booking_date, b.booking_timeslot)}</td>
                  <td>
                    <span className={`${styles["status-text"]} ${styles[b.booking_status] || ""}`}>
                      {formatStatusLabel(b.booking_status)}
                    </span>
                  </td>
                  <td>₱{Number(b.booking_total_amount).toFixed(2)}</td>
                  <td>
                    <button className={styles["btn-view-details"]} onClick={() => onViewDetails(b)}>
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
          <Link
            href={`${ROUTES.ADMIN.SP_BOOKINGS}?id=${userId}`}
            className={styles["btn-view-full-history"]}
          >
            <FaList /> View All Booked Services ({bookings.length})
          </Link>
        </div>
      )}
    </section>
  );
};