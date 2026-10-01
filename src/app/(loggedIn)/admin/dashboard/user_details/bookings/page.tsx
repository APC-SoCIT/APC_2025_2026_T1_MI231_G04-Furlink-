"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { BookingRow } from "../_types";
import { useBookingHistoryPage } from "../_hooks/useBookingHistoryPage";
import { BookingHistoryTable } from "../_components/BookingHistoryTable";
import { BookingDetailsModal } from "../_components/BookingDetailsModal";
import { DateRangeFilter, filterByDateRange } from "../_components/DateRangeFilter";
import styles from "../page.module.css";

function FullBookingHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  const { user, loading, bookings, bookingsLoading, error } = useBookingHistoryPage(userId);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredBookings = useMemo(
    () => filterByDateRange(bookings, (b) => b.booking_date, dateFrom, dateTo),
    [bookings, dateFrom, dateTo]
  );

  if (loading) return <div className={styles["loading-state"]}>Loading booking history...</div>;
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
            Booking History — {user.first_name} {user.last_name}
          </h1>
        </div>

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChangeFrom={setDateFrom}
          onChangeTo={setDateTo}
          shownCount={filteredBookings.length}
          totalCount={bookings.length}
          itemLabel="bookings"
        />

        <BookingHistoryTable
          bookings={filteredBookings}
          bookingsLoading={bookingsLoading}
          onViewDetails={setSelectedBooking}
        />
      </main>

      {selectedBooking && (
        <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}

export default function FullBookingHistoryPage() {
  return (
    <Suspense fallback={<div className={styles["loading-state"]}>Loading booking history...</div>}>
      <FullBookingHistoryContent />
    </Suspense>
  );
}