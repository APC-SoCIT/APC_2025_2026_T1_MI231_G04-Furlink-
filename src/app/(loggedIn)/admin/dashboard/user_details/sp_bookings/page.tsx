"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { SpBookingRow } from "../_types";
import { useBookingHistoryPage } from "../_hooks/useBookingHistoryPage";
import { useSpBookings } from "../_hooks/useSpBookings";
// NOTE: paths must match your actual filename casing exactly
import { SpBookingHistoryTable } from "../_components/SPBookingHistoryTable";
import { SpBookingDetailsModal } from "../_components/SPBookingDetailsModal";
import styles from "../page.module.css";

function FullSpBookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  // Reused only for the user's name / existence check
  const { user, loading, error } = useBookingHistoryPage(userId);
  const { spBookings, spBookingsLoading } = useSpBookings(userId, true);
  const [selectedBooking, setSelectedBooking] = useState<SpBookingRow | null>(null);

  if (loading) return <div className={styles["loading-state"]}>Loading booked services...</div>;
  if (error) return <div className={styles["error-state"]}>Error: {error}</div>;
  if (!user) return <div className={styles["empty-state"]}>User not found.</div>;

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        <div className={styles["back-button-container"]}>
          <button
            className={styles["btn-back"]}
            onClick={() => router.push(`${ROUTES.ADMIN.USER_DETAILS}?id=${userId}`)}
          >
            <FaArrowLeft /> Back to {user.first_name} {user.last_name}
          </button>
        </div>

        <div className={styles["page-header"]}>
          <h1 className={styles["page-title"]}>
            Booked Services — {user.first_name} {user.last_name}
          </h1>
        </div>

        <SpBookingHistoryTable
          bookings={spBookings}
          loading={spBookingsLoading}
          onViewDetails={setSelectedBooking}
        />
      </main>

      {selectedBooking && (
        <SpBookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}

export default function FullSpBookingsPage() {
  return (
    <Suspense fallback={<div className={styles["loading-state"]}>Loading booked services...</div>}>
      <FullSpBookingsContent />
    </Suspense>
  );
}