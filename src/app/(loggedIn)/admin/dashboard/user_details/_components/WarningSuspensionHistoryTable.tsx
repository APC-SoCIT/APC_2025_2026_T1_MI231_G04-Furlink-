"use client";

import Link from "next/link";
import { FaExclamationTriangle, FaList } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { WarningRow, SuspensionRow, HistoryEntry } from "../_types";
import { buildHistoryEntries } from "../_utils/buildHistoryEntries";
import styles from "../page.module.css";

interface Props {
  warnings: WarningRow[];
  suspensions: SuspensionRow[];
  loading: boolean;
  onViewDetails: (entry: HistoryEntry) => void;
  /** Pass the profile id to enable the "View Full History" link when the list is capped. */
  userId?: string;
  /** Cap the number of rows rendered. Omit to render every entry (used on the full-history page). */
  limit?: number;
}

export const WarningSuspensionHistoryTable = ({ warnings, suspensions, loading, onViewDetails, userId, limit }: Props) => {
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  const entries = buildHistoryEntries(warnings, suspensions);
  const displayedEntries = limit ? entries.slice(0, limit) : entries;
  const hasMore = !!limit && entries.length > limit;

  return (
    <section className={styles["info-card"]}>
      <div className={styles["card-header"]}>
        <FaExclamationTriangle />
        <h2>Warning &amp; Suspension History</h2>
      </div>
      <p className={styles["card-subtitle"]}>
        {limit
          ? `Showing ${Math.min(limit, entries.length)} most recent of ${entries.length} entries`
          : "Every warning and suspension issued to this user"}
      </p>

      <div className={styles["providers-table-wrapper"]}>
        {loading ? (
          <div className={styles["loading-state"]}>Loading history...</div>
        ) : entries.length === 0 ? (
          <div className={styles["empty-state"]}>No warnings or suspensions on record.</div>
        ) : (
          <table className={styles["providers-table"]}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Issued By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.date)}</td>
                  <td>
                    <span className={`${styles["type-tag"]} ${styles[`type-tag-${entry.type}`]}`}>
                      {entry.type === "warning" ? "Warning" : "Suspension"}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{entry.severity || "—"}</td>
                  <td>
                    <span className={`${styles["warning-status-tag"]} ${styles[`warning-status-${entry.status}`] || ""}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td>
                    {entry.issued_by_admin
                      ? `${entry.issued_by_admin.first_name} ${entry.issued_by_admin.last_name}`
                      : "System"}
                  </td>
                  <td>
                    <button className={styles["btn-view-details"]} onClick={() => onViewDetails(entry)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && userId && (
        <div className={styles["view-full-history-row"]}>
          <Link href={`${ROUTES.ADMIN.WARNING_SUSPENSION_HISTORY}?id=${userId}`} className={styles["btn-view-full-history"]}>
            <FaList /> View Full History ({entries.length})
          </Link>
        </div>
      )}
    </section>
  );
};