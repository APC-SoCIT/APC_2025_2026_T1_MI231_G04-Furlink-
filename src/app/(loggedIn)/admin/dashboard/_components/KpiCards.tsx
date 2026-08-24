// Clickable summary cards 

"use client";

import { FaStore, FaCheckCircle, FaTimesCircle, FaClock, FaUsers } from "react-icons/fa";
import { FilterType, DashboardCounts } from "../_types";
import styles from "../page.module.css";

interface Props {
  counts: DashboardCounts;
  currentFilter: FilterType;
  onCardClick: (filter: FilterType) => void;
}

export const KpiCards = ({ counts, currentFilter, onCardClick }: Props) => {
  return (
    <div className={styles["stats-grid"]}>
      <div
        className={`${styles["stat-card"]} ${currentFilter === "pending" ? styles["active-filter"] : ""}`}
        onClick={() => onCardClick("pending")}
      >
        <div className={`${styles["stat-icon-wrapper"]} ${styles["pending"]}`}>
          <FaStore size={24} />
        </div>
        <div className={styles["stat-content"]}>
          <h3>{counts.pendingCount}</h3>
          <span>Pending Approvals</span>
        </div>
      </div>

      <div
        className={`${styles["stat-card"]} ${currentFilter === "active" ? styles["active-filter"] : ""}`}
        onClick={() => onCardClick("active")}
      >
        <div className={`${styles["stat-icon-wrapper"]} ${styles["active"]}`}>
          <FaCheckCircle size={24} />
        </div>
        <div className={styles["stat-content"]}>
          <h3>{counts.activeCount}</h3>
          <span>Active Listings</span>
        </div>
      </div>

      <div
        className={`${styles["stat-card"]} ${currentFilter === "rejected" ? styles["active-filter"] : ""}`}
        onClick={() => onCardClick("rejected")}
      >
        <div className={`${styles["stat-icon-wrapper"]} ${styles["rejected"]}`}>
          <FaTimesCircle size={24} />
        </div>
        <div className={styles["stat-content"]}>
          <h3>{counts.rejectedCount}</h3>
          <span>Rejected Listings</span>
        </div>
      </div>

      <div className={`${styles["stat-card"]} ${styles["non-clickable"]}`}>
        <div className={`${styles["stat-icon-wrapper"]} ${styles["info"]}`}>
          <FaClock size={24} />
        </div>
        <div className={styles["stat-content"]}>
          <h3>{counts.avgApprovalTime}</h3>
          <span>Avg. Approval Time</span>
        </div>
      </div>

      <div
        className={`${styles["stat-card"]} ${currentFilter === "users" ? styles["active-filter"] : ""}`}
        onClick={() => onCardClick("users")}
      >
        <div className={`${styles["stat-icon-wrapper"]} ${styles["users"]}`}>
          <FaUsers size={24} />
        </div>
        <div className={styles["stat-content"]}>
          <h3>{counts.totalUsers}</h3>
          <span>Total Users</span>
        </div>
      </div>
    </div>
  );
};