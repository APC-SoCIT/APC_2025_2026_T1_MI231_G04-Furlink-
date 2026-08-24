"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft } from "react-icons/fa";
import { useProviderDetails } from "./_hooks/useProviderDetails";
import { PageHeader } from "./_components/PageHeader";
import { GeneralInfoSection } from "./_components/GeneralInfoSection";
import { OperatingHoursSection } from "./_components/OperatingHoursSection";
import { EmployeesSection } from "./_components/EmployeesSection";
import { ServicesSection } from "./_components/ServicesSection";
import { ActionModals } from "./_components/ActionModals";
import styles from "./page.module.css";

function SPDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const providerId = searchParams.get("id");

  const { provider, loading, error, isUpdating, confirmApprove, confirmReject } = useProviderDetails(providerId);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (loading) return <div className={styles["loading-state"]} style={{ padding: "40px", textAlign: "center" }}>Loading provider details...</div>;
  if (error) return <div className={styles["empty-state"]} style={{ padding: "40px", textAlign: "center", color: "red" }}>Error: {error}</div>;
  if (!provider) return <div className={styles["empty-state"]} style={{ padding: "40px", textAlign: "center" }}>Provider not found.</div>;

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        <div style={{ marginBottom: "20px" }}>
          <button
            className={styles["btn-view-details"]}
            onClick={() => router.push(ROUTES.ADMIN.ADMIN_DASHBOARD)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        <div className={styles["dashboard-list-container"]}>
          <PageHeader
            provider={provider}
            isUpdating={isUpdating}
            onApproveClick={() => setShowApproveModal(true)}
            onRejectClick={() => setShowRejectModal(true)}
          />

          <GeneralInfoSection provider={provider} />
          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />
          
          <OperatingHoursSection hours={provider.sp_operating_hours} />
          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />
          
          <EmployeesSection employees={provider.sp_employees_info} />
          <hr style={{ margin: "20px 0", borderColor: "#f3f4f6" }} />
          
          <ServicesSection services={provider.sp_services} />
        </div>
      </main>

      <ActionModals
        provider={provider}
        showApproveModal={showApproveModal}
        setShowApproveModal={setShowApproveModal}
        showRejectModal={showRejectModal}
        setShowRejectModal={setShowRejectModal}
        isUpdating={isUpdating}
        onConfirmApprove={confirmApprove}
        onConfirmReject={confirmReject}
      />
    </div>
  );
}

export default function SPDetailsPage() {
  return (
    <Suspense fallback={<div className={styles["loading-state"]} style={{ padding: "40px", textAlign: "center" }}>Loading provider details...</div>}>
      <SPDetailsContent />
    </Suspense>
  );
}