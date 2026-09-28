"use client";

import { FaTimes } from "react-icons/fa";
import { HistoryEntry, WarningRow, SuspensionRow } from "../_types";
import styles from "../page.module.css";

interface Props {
  entry: HistoryEntry;
  onClose: () => void;
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

export const HistoryDetailsModal = ({ entry, onClose }: Props) => {
  const isWarning = entry.type === "warning";
  const warning = isWarning ? (entry.original as WarningRow) : null;
  const suspension = !isWarning ? (entry.original as SuspensionRow) : null;

  return (
    <div className={styles["modal-overlay"]} onClick={onClose}>
      <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles["modal-header"]}>
          <h3 className={styles["modal-title"]}>{isWarning ? "Warning Details" : "Suspension Details"}</h3>
          <button className={styles["btn-close-modal"]} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles["warning-history-item"]}>
          <div className={styles["warning-history-top"]}>
            {isWarning && warning && <span className={styles["severity-tag"]}>{warning.severity}</span>}
            <span className={`${styles["warning-status-tag"]} ${styles[`warning-status-${entry.status}`] || ""}`}>
              {entry.status}
            </span>
          </div>

          <p className={styles["warning-history-message"]}>
            {isWarning ? warning?.warning_message : suspension?.reason}
          </p>

          <p className={styles["warning-history-meta"]}>
            {formatDateTime(entry.date)}
            {entry.issued_by_admin && (
              <> · issued by <strong>{entry.issued_by_admin.first_name} {entry.issued_by_admin.last_name}</strong></>
            )}
          </p>

          {!isWarning && suspension && (
            <p className={styles["warning-history-meta"]}>
              Until {formatDateTime(suspension.suspended_until)}
              {suspension.status === "lifted" && suspension.lifted_at && (
                <>
                  {" "}— lifted {formatDateTime(suspension.lifted_at)}
                  {suspension.lifted_by_admin && (
                    <> by <strong>{suspension.lifted_by_admin.first_name} {suspension.lifted_by_admin.last_name}</strong></>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};