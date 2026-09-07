"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft } from "react-icons/fa";
import { BookingRow } from "./_types";
import { useUserDetails } from "./_hooks/useUserDetails";
import { PageHeader } from "./_components/PageHeader";
import { SuspensionBanner } from "./_components/SuspensionBanner";
import { PersonalInfoCard } from "./_components/PersonalInfoCard";
import { AdminActionsCard } from "./_components/AdminActionsCard";
import { BookingHistoryTable } from "./_components/BookingHistoryTable";
import { BookingDetailsModal } from "./_components/BookingDetailsModal";
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
    actionError, actionSuccess, autoSuspendNotice, setAutoSuspendNotice,
    confirmSendWarning, confirmSuspend, confirmLiftSuspension
  } = useUserDetails(userId);

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [warningMessage, setWarningMessage] = useState("");

  const [showSendWarningConfirm, setShowSendWarningConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showLiftConfirm, setShowLiftConfirm] = useState(false);

  const activeWarningCount = warnings.filter((w) => w.status === "active").length;
  const isSuspended = !!currentSuspension && currentSuspension.status === "active" && new Date(currentSuspension.suspended_until) > new Date();

  // Handlers to link the UI Modals to the hook logic
  const handleSendWarningConfirm = async () => {
    const success = await confirmSendWarning(warningMessage);
    if (success) {
      setShowSendWarningConfirm(false);
      setWarningMessage("");
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
              warnings={warnings}
              warningsLoading={warningsLoading}
              activeWarningCount={activeWarningCount}
              warningMessage={warningMessage}
              setWarningMessage={setWarningMessage}
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

          <BookingHistoryTable 
            bookings={bookings} 
            bookingsLoading={bookingsLoading}
            onViewDetails={setSelectedBooking} 
          />
        </div>
      </main>

      {selectedBooking && (
        <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      <AdminModals 
        user={user}
        warningMessage={warningMessage}
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