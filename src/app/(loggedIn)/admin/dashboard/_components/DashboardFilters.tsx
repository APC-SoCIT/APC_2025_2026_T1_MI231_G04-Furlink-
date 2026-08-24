// Filtering functionalities

"use client";

import { FilterType, UserRoleFilter, DateRange } from "../_types";
import styles from "../page.module.css";

interface Props {
  currentFilter: FilterType;
  userRoleFilter: UserRoleFilter;
  setUserRoleFilter: (role: UserRoleFilter) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const ROLE_LABELS: Record<UserRoleFilter, string> = {
  all: "All",
  pet_owner: "Pet Owners",
  service_provider: "Service Providers",
  both: "Both",
};

export const DashboardFilters = ({
  currentFilter,
  userRoleFilter,
  setUserRoleFilter,
  dateRange,
  setDateRange,
}: Props) => {
  const getListTitle = () => {
    switch (currentFilter) {
      case "pending": return "Pending Approvals (Complete Applications)";
      case "active": return "Active Listings";
      case "rejected": return "Rejected Listings";
      case "users": return "Registered Users";
      default: return "";
    }
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    setDateRange({ ...dateRange, [field]: value });
  };

  return (
    <div className={styles["list-header"]}>
      <h2 className={styles["list-title"]}>{getListTitle()}</h2>

      {currentFilter === "users" && (
        <div className={styles["user-filter-group"]}>
          {(["all", "pet_owner", "service_provider", "both"] as UserRoleFilter[]).map((role) => (
            <button
              key={role}
              className={`${styles["filter-btn"]} ${userRoleFilter === role ? styles["active"] : ""}`}
              onClick={() => setUserRoleFilter(role)}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}

      {currentFilter !== "users" && (
        <div className={styles["date-range-filter"]}>
          <div className={styles["date-inputs-group"]}>
            <div className={styles["date-input-wrapper"]}>
              <label className={styles["date-label"]}>From:</label>
              <input
                type="date"
                className={styles["date-input"]}
                value={dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                max={dateRange.end || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className={styles["date-input-wrapper"]}>
              <label className={styles["date-label"]}>To:</label>
              <input
                type="date"
                className={styles["date-input"]}
                value={dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                min={dateRange.start}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            {(dateRange.start || dateRange.end) && (
              <button
                className={styles["clear-dates-btn"]}
                onClick={() => setDateRange({ start: "", end: "" })}
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};