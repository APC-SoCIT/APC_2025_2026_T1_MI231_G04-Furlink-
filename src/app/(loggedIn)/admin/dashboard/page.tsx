// Fetches data using custom hooks

"use client";

import { useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import { useDashboardData } from "./hooks/useDashboardData";
import { KpiCards } from "./_components/KpiCards";
import { DashboardFilters } from "./_components/DashboardFilters";
import { DashboardTable } from "./_components/DashboardTable";
import { AdminReportModal } from "./_components/AdminReportModal";
import styles from "./page.module.css";

export default function AdminDashboardPage() {
  const [showReportModal, setShowReportModal] = useState(false);
  const {
    adminName,
    counts,
    currentFilter,
    setCurrentFilter,
    userRoleFilter,
    setUserRoleFilter,
    dateRange,
    setDateRange,
    providerData,
    userData,
    loading,
  } = useDashboardData();

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        <div className={styles["admin-header-center"]}>
          <h1>Hi, {adminName}!</h1>
          <p>Here is your daily overview.</p>
        </div>

        <div className={styles["report-button-container"]}>
          <div className={styles["as-of-date"]}>
            As of{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <button
            className={styles["generate-report-btn"]}
            onClick={() => setShowReportModal(true)}
          >
            <FaFileAlt size={16} />
            <span>Generate Admin Report</span>
          </button>
        </div>

        <KpiCards 
          counts={counts} 
          currentFilter={currentFilter} 
          onCardClick={setCurrentFilter} 
        />

        {currentFilter && (
          <div className={styles["dashboard-list-container"]}>
            <DashboardFilters
              currentFilter={currentFilter}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />

            <DashboardTable
              currentFilter={currentFilter}
              providerData={providerData}
              userData={userData}
              loading={loading}
            />
          </div>
        )}

        {showReportModal && (
          <AdminReportModal
            counts={counts}
            dateRange={dateRange}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </main>
    </div>
  );
}