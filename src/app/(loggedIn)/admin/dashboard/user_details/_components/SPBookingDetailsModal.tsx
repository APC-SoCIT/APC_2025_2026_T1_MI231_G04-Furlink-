"use client";

import { FaTimes } from "react-icons/fa";
import { SpBookingRow, STATUS_LABELS } from "../_types";
import styles from "../page.module.css";

// TODO: adjust to the real column names of sp_employees_info once confirmed
const getEmployeeName = (e: Record<string, any> | null | undefined): string | null => {
  if (!e) return null;
  const full = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim();
  return full || e.employee_name || e.full_name || e.name || null;
};

interface Props {
  booking: SpBookingRow;
  onClose: () => void;
}

export const SpBookingDetailsModal = ({ booking, onClose }: Props) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const formatStatusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");

  const ownerName =
    `${booking.pet_owner?.first_name ?? ""} ${booking.pet_owner?.last_name ?? ""}`.trim() || "-";

  // Employees are assigned per pet; list the distinct ones at the top
  const employeeNames = Array.from(
    new Set(
      (booking.booking_pet_info || [])
        .map((pet) => getEmployeeName(pet.assigned_employee))
        .filter((n): n is string => !!n)
    )
  );

  const serviceTypes = Array.from(
    new Set(
      booking.booking_pet_info?.flatMap(
        (pet) => pet.booking_service_info?.map((s) => s.booking_service_type.replace(/_/g, " ")) || []
      ) || []
    )
  );

  return (
    <div className={styles["modal-overlay"]} onClick={onClose}>
      <div className={styles["modal-box"]} onClick={(e) => e.stopPropagation()}>
        <div className={styles["modal-header"]}>
          <h3 className={styles["modal-title"]}>Booked Service Details</h3>
          <button className={styles["btn-close-modal"]} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles["modal-content"]}>
          <div className={styles["info-grid"]}>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Pet Owner</span>
              <span className={styles["info-value"]}>{ownerName}</span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Pet Owner Mobile</span>
              <span className={styles["info-value"]}>{booking.pet_owner?.mobile_number || "-"}</span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Handled By (Employee)</span>
              <span className={styles["info-value"]}>
                {employeeNames.length > 0 ? employeeNames.join(", ") : "Not assigned"}
              </span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Service Type</span>
              <span className={styles["info-value"]} style={{ textTransform: "capitalize" }}>
                {serviceTypes.length > 0 ? serviceTypes.join(", ") : "-"}
              </span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Date</span>
              <span className={styles["info-value"]}>{formatDate(booking.booking_date)}</span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Timeslot</span>
              <span className={styles["info-value"]}>{booking.booking_timeslot}</span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Status</span>
              <span className={`${styles["status-pill"]} ${styles[booking.booking_status] || ""}`}>
                {formatStatusLabel(booking.booking_status)}
              </span>
            </div>
            <div className={styles["info-item"]}>
              <span className={styles["info-label"]}>Total Amount</span>
              <span className={styles["info-value"]}>₱{Number(booking.booking_total_amount).toFixed(2)}</span>
            </div>
            {booking.cancelled_by && (
              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Cancelled By</span>
                <span className={styles["info-value"]} style={{ textTransform: "capitalize" }}>
                  {booking.cancelled_by.replace(/_/g, " ")}
                </span>
              </div>
            )}
            {booking.refund_amount != null && (
              <div className={styles["info-item"]}>
                <span className={styles["info-label"]}>Refund Amount</span>
                <span className={styles["info-value"]}>₱{Number(booking.refund_amount).toFixed(2)}</span>
              </div>
            )}
          </div>

          {booking.booking_comment && (
            <div className={styles["rating-note"]}>
              <p><strong>Pet Owner Comment:</strong> {booking.booking_comment}</p>
            </div>
          )}

          {booking.booking_status === "rejected" && booking.booking_rejection_reason && (
            <div className={styles["rejection-note"]}>
              <strong>Rejection Reason:</strong> {booking.booking_rejection_reason}
            </div>
          )}

          {booking.refund_reason && (
            <div className={styles["rejection-note"]}>
              <strong>Refund Reason:</strong> {booking.refund_reason}
            </div>
          )}

          {(booking.booking_overall_rating || booking.booking_review) && (
            <div className={styles["rating-note"]}>
              {booking.booking_overall_rating && (
                <p><strong>Overall Rating:</strong> {booking.booking_overall_rating} / 5</p>
              )}
              {booking.booking_staff_rating && (
                <p><strong>Staff Rating:</strong> {booking.booking_staff_rating} / 5</p>
              )}
              {booking.booking_review && (
                <p><strong>Review:</strong> {booking.booking_review}</p>
              )}
            </div>
          )}

          <hr className={styles["modal-divider"]} />

          <h4 className={styles["modal-subtitle"]}>Pets Booked ({booking.booking_pet_info?.length || 0})</h4>

          {booking.booking_pet_info && booking.booking_pet_info.length > 0 ? (
            booking.booking_pet_info.map((pet) => (
              <div key={pet.id} className={styles["pet-card"]}>
                <h5>
                  {pet.booking_pet_name}{" "}
                  <span className={styles["pet-meta"]}>
                    ({pet.booking_breed}, {pet.booking_gender}, {pet.booking_weight}kg, {pet.booking_calculated_size.replace(/_/g, " ")})
                  </span>
                </h5>
                <p className={styles["pet-notes"]}>
                  Handled by: {getEmployeeName(pet.assigned_employee) || "Not assigned"}
                </p>
                {pet.booking_behavior?.length > 0 && (
                  <p className={styles["pet-behavior"]}>Behavior: {pet.booking_behavior.join(", ")}</p>
                )}
                {pet.booking_grooming_notes && (
                  <p className={styles["pet-notes"]}>Notes: {pet.booking_grooming_notes}</p>
                )}
                {pet.booking_service_info && pet.booking_service_info.length > 0 && (
                  <table className={styles["services-table"]}>
                    <thead>
                      <tr><th>Service</th><th>Type</th><th>Price</th></tr>
                    </thead>
                    <tbody>
                      {pet.booking_service_info.map((svc) => (
                        <tr key={svc.id}>
                          <td>{svc.booking_service_name}</td>
                          <td style={{ textTransform: "capitalize" }}>{svc.booking_service_type.replace(/_/g, " ")}</td>
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
  );
};