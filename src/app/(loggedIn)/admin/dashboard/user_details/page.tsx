"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft, FaPaw, FaConciergeBell } from "react-icons/fa";
import { BookingRow, HistoryEntry, SpBookingRow, SP_ROLES, PO_ROLES } from "./_types";
import { useUserDetails } from "./_hooks/useUserDetails";
import { useSpBookings } from "./_hooks/useSpBookings";
import { PageHeader } from "./_components/PageHeader";
import { SuspensionBanner } from "./_components/SuspensionBanner";
import { PersonalInfoCard } from "./_components/PersonalInfoCard";
import { AdminActionsCard } from "./_components/AdminActionsCard";
import { BookingHistoryTable } from "./_components/BookingHistoryTable";
import { BookingDetailsModal } from "./_components/BookingDetailsModal";
// NOTE: the path must match your actual filename casing exactly
import { SpBookingHistoryTable } from "./_components/SPBookingHistoryTable";
import { SpBookingDetailsModal } from "./_components/SPBookingDetailsModal";
import { WarningSuspensionHistoryTable } from "./_components/WarningSuspensionHistoryTable";
import { HistoryDetailsModal } from "./_components/HistoryDetailsModal";
import { AdminModals } from "./_components/AdminModals";
import styles from "./page.module.css";

function UserDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  const {
    user, businessEmail, bookings, loading, bookingsLoading, error,
    warnings, warningsLoading, sendingWarning,
    currentSuspension, suspensionLoading, suspending, liftingSuspension, autoSuspended,
    suspensionHistory, suspensionHistoryLoading,
    actionError, actionSuccess, autoSuspendNotice, setAutoSuspendNotice,
    confirmSendWarning, confirmSuspend, confirmLiftSuspension
  } = useUserDetails(userId);

  // Roles stored in the DB: "pet_owner", "service_provider", "both_sp_po"
  // - Pet owner history: pet_owner + both_sp_po
  // - SP booked services: service_provider + both_sp_po
  // - Warning/suspension history: only accounts with a service provider side
  const showPoBookings = !!user?.role && PO_ROLES.includes(user.role);
  const showSpBookings = !!user?.role && SP_ROLES.includes(user.role);
  const showWarningHistory = showSpBookings;

  // Accounts with both sides get a switch so only one booking card is visible at a time
  const isBothRole = showPoBookings && showSpBookings;
  const [activeBookingView, setActiveBookingView] = useState<"po" | "sp">("po");
  const showPoCard = showPoBookings && (!isBothRole || activeBookingView === "po");
  const showSpCard = showSpBookings && (!isBothRole || activeBookingView === "sp");

  const { spBookings, spBookingsLoading } = useSpBookings(userId, showSpBookings);

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [selectedSpBooking, setSelectedSpBooking] = useState<SpBookingRow | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningSeverity, setWarningSeverity] = useState("normal");

  const [showSendWarningConfirm, setShowSendWarningConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showLiftConfirm, setShowLiftConfirm] = useState(false);

  const activeWarningCount = warnings.filter((w) => w.status === "active").length;
  const isSuspended =
    !!currentSuspension &&
    currentSuspension.status === "active" &&
    new Date(currentSuspension.suspended_until) > new Date();

  // Handlers to link the UI Modals to the hook logic
  const handleSendWarningConfirm = async () => {
    const success = await confirmSendWarning(warningMessage, warningSeverity);
    if (success) {
      setShowSendWarningConfirm(false);
      setWarningMessage("");
      setWarningSeverity("normal");
    }
  };

  const handleSuspendConfirm = async () => {
    const success = await confirmSuspend();
    if (success) setShowSuspendConfirm(false);
  };

  const handleLiftSuspensionConfirm = async () => {
    const success = await confirmLiftSuspension();
    if (success) setShowLiftConfirm(false);
  };

  if (loading) return <div className={styles["loading-state"]}>Loading user details...</div>;
  if (error) return <div className={styles["error-state"]}>Error: {error}</div>;
  if (!user) return <div className={styles["empty-state"]}>User not found.</div>;

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>

        <div className={styles["back-button-container"]}>
          <button className={styles["btn-back"]} onClick={() => router.push(ROUTES.ADMIN.ADMIN_DASHBOARD)}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        <PageHeader user={user} isSuspended={isSuspended} />

        <SuspensionBanner
          currentSuspension={currentSuspension}
          autoSuspended={autoSuspended}
          isSuspended={isSuspended}
        />

        {(actionError || actionSuccess) && (
          <div className={actionError ? styles["action-error"] : styles["action-success"]}>
            {actionError || actionSuccess}
          </div>
        )}

        <div className={styles["details-grid"]}>
          <div className={styles["left-column"]}>
            <PersonalInfoCard user={user} businessEmail={businessEmail} />
            <AdminActionsCard
              warningsLoading={warningsLoading}
              activeWarningCount={activeWarningCount}
              warningMessage={warningMessage}
              setWarningMessage={setWarningMessage}
              warningSeverity={warningSeverity}
              setWarningSeverity={setWarningSeverity}
              sendingWarning={sendingWarning}
              onSendWarningClick={() => setShowSendWarningConfirm(true)}
              isSuspended={isSuspended}
              currentSuspension={currentSuspension}
              suspensionLoading={suspensionLoading}
              suspending={suspending}
              liftingSuspension={liftingSuspension}
              onSuspendClick={() => setShowSuspendConfirm(true)}
              onLiftSuspensionClick={() => setShowLiftConfirm(true)}
            />
          </div>

          <div className={styles["right-column"]}>
            {/* Booking view switch (both_sp_po only) */}
            {isBothRole && (
              <div
                className={styles["view-toggle"]}
                data-active={activeBookingView}
                role="tablist"
                aria-label="Booking history view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeBookingView === "po"}
                  className={`${styles["view-toggle-btn"]} ${activeBookingView === "po" ? styles["view-toggle-active"] : ""}`}
                  onClick={() => setActiveBookingView("po")}
                >
                  <FaPaw /> Pet Owner Bookings ({bookings.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeBookingView === "sp"}
                  className={`${styles["view-toggle-btn"]} ${activeBookingView === "sp" ? styles["view-toggle-active"] : ""}`}
                  onClick={() => setActiveBookingView("sp")}
                >
                  <FaConciergeBell /> Booked Services ({spBookings.length})
                </button>
              </div>
            )}

            {/* key remounts the panel on switch so the fade-in replays */}
            <div
              key={activeBookingView}
              className={isBothRole ? styles["view-panel"] : undefined}
            >
              {/* 1. Pet owner booking history (pet_owner, both_sp_po) */}
              {showPoCard && (
                <BookingHistoryTable
                  bookings={bookings}
                  bookingsLoading={bookingsLoading}
                  onViewDetails={setSelectedBooking}
                  userId={userId ?? undefined}
                  limit={5}
                />
              )}

              {/* 2. Services booked with this provider (service_provider, both_sp_po) */}
              {showSpCard && (
                <SpBookingHistoryTable
                  bookings={spBookings}
                  loading={spBookingsLoading}
                  onViewDetails={setSelectedSpBooking}
                  userId={userId ?? undefined}
                  limit={5}
                />
              )}
            </div>

            {/* 3. Warning / suspension history (service_provider, both_sp_po) */}
            {showWarningHistory && (
              <WarningSuspensionHistoryTable
                warnings={warnings}
                suspensions={suspensionHistory}
                loading={warningsLoading || suspensionHistoryLoading}
                onViewDetails={setSelectedHistoryEntry}
                userId={userId ?? undefined}
                limit={5}
              />
            )}
          </div>
        </div>
      </main>

      {selectedBooking && (
        <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      {selectedSpBooking && (
        <SpBookingDetailsModal booking={selectedSpBooking} onClose={() => setSelectedSpBooking(null)} />
      )}

      {selectedHistoryEntry && (
        <HistoryDetailsModal entry={selectedHistoryEntry} onClose={() => setSelectedHistoryEntry(null)} />
      )}

      <AdminModals
        user={user}
        warningMessage={warningMessage}
        warningSeverity={warningSeverity}
        activeWarningCount={activeWarningCount}
        isSuspended={isSuspended}
        sendingWarning={sendingWarning}
        showSendWarningConfirm={showSendWarningConfirm}
        setShowSendWarningConfirm={setShowSendWarningConfirm}
        confirmSendWarning={handleSendWarningConfirm}
        showSuspendConfirm={showSuspendConfirm}
        setShowSuspendConfirm={setShowSuspendConfirm}
        suspending={suspending}
        confirmSuspend={handleSuspendConfirm}
        showLiftConfirm={showLiftConfirm}
        setShowLiftConfirm={setShowLiftConfirm}
        liftingSuspension={liftingSuspension}
        confirmLiftSuspension={handleLiftSuspensionConfirm}
        autoSuspendNotice={autoSuspendNotice}
        setAutoSuspendNotice={setAutoSuspendNotice}
      />
    </div>
  );
}

export default function PODetailsPage() {
  return (
    <Suspense fallback={<div className={styles["loading-state"]}>Loading user details...</div>}>
      <UserDetailsContent />
    </Suspense>
  );
}