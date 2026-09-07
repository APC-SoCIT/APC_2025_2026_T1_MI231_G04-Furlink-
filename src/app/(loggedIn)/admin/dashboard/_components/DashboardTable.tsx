// Renders columns and rows for the dashboard kpi

"use client";

import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { FilterType, ProviderRow, UserRow } from "../_types";
import styles from "../page.module.css";

interface Props {
  currentFilter: FilterType;
  providerData: ProviderRow[];
  userData: UserRow[];
  loading: boolean;
}

export const DashboardTable = ({ currentFilter, providerData, userData, loading }: Props) => {
  const router = useRouter();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  if (loading) return <div className={styles["loading-state"]}>Loading data...</div>;

  const isEmpty = currentFilter === "users" ? userData.length === 0 : providerData.length === 0;
  if (isEmpty) return <div className={styles["empty-state"]}>No records found for this category.</div>;

  return (
    <div className={styles["providers-table-wrapper"]}>
      <table className={styles["providers-table"]}>
        <thead>
          {currentFilter === "users" ? (
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Username</th>
              <th>Contact Number</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          ) : (
            <tr>
              <th>Business Name</th>
              <th>Location</th>
              <th>Date {currentFilter === "pending" ? "Submitted" : currentFilter === "active" ? "Approved" : "Updated"}</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          )}
        </thead>
        <tbody>
          {currentFilter === "users"
            ? userData.map((item) => (
                <tr key={item.id}>
                  <td className={styles["fw-bold"]}>{item.first_name || "-"}</td>
                  <td className={styles["fw-bold"]}>{item.last_name || "-"}</td>
                  <td>{item.username || "-"}</td>
                  <td>{item.mobile_number || "-"}</td>
                  <td style={{ textTransform: "capitalize" }}>{item.role ? item.role.replace(/_/g, " ") : "-"}</td>
                  <td>
                    <button
                      className={styles["btn-view-details"]}
                      onClick={() => router.push(`${ROUTES.ADMIN.USER_DETAILS}?id=${item.id}`)}
                    >
                      View Details <FaArrowRight size={12} style={{ marginLeft: 5 }} />
                    </button>
                  </td>
                </tr>
              ))
            : providerData.map((item) => (
                <tr key={item.id}>
                  <td className={styles["fw-bold"]}>{item.business_name}</td>
                  <td>{item.business_city}{item.business_city && item.business_province ? ", " : ""}{item.business_province}</td>
                  <td>
                    {formatDate(
                      currentFilter === "pending" ? item.created_at
                        : currentFilter === "active" ? item.registration_approved_at
                        : item.updated_at
                    )}
                  </td>
                  <td>
                    <span className={`${styles["status-pill"]} ${styles[item.registration_status]}`}>
                      {item.registration_status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles["btn-view-details"]}
                      onClick={() => router.push(`${ROUTES.ADMIN.SP_DETAILS}?id=${item.id}`)}
                    >
                      View Details <FaArrowRight size={12} style={{ marginLeft: 5 }} />
                    </button>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};