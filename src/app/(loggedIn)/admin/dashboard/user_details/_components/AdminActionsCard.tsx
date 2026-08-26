"use client";

import { useState } from "react";
import { FaExclamationTriangle, FaPaperPlane, FaChevronDown, FaChevronUp, FaUserSlash, FaUserCheck } from "react-icons/fa";
import { WarningRow, SuspensionRow, SUSPENSION_DAYS, WARNING_THRESHOLD } from "../_types";
import styles from "../page.module.css";

interface Props {
  warnings: WarningRow[];
  warningsLoading: boolean;
  activeWarningCount: number;
  warningMessage: string;
  setWarningMessage: (msg: string) => void;
  sendingWarning: boolean;
  onSendWarningClick: () => void;
  isSuspended: boolean;
  currentSuspension: SuspensionRow | null;
  suspensionLoading: boolean;
  suspending: boolean;
  liftingSuspension: boolean;
  onSuspendClick: () => void;
  onLiftSuspensionClick: () => void;
}

export const AdminActionsCard = ({
  warnings, warningsLoading, activeWarningCount, warningMessage, setWarningMessage, sendingWarning,
  onSendWarningClick, isSuspended, currentSuspension, suspensionLoading, suspending, liftingSuspension,
  onSuspendClick, onLiftSuspensionClick
}: Props) => {
  const [showHistory, setShowHistory] = useState(false);

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <section className={styles["admin-actions-card"]}>
      <div className={styles["admin-card-header"]}>
        <FaExclamationTriangle />
        <h2>Admin Actions</h2>
      </div>

      {/* Issue Warning */}
      <div className={styles["admin-block"]}>
        <div className={styles["admin-block-label-row"]}>
          <span className={styles["admin-block-label"]}>Issue Warning</span>
          <span className={`${styles["count-pill"]} ${activeWarningCount >= WARNING_THRESHOLD ? styles["count-pill-danger"] : ""}`}>
            Count: {warningsLoading ? "…" : activeWarningCount}
          </span>
        </div>
        <textarea
          className={styles["warning-textarea"]}
          placeholder="Type warning message here..."
          rows={3}
          value={warningMessage}
          onChange={(e) => setWarningMessage(e.target.value)}
          disabled={sendingWarning}
        />
        <button
          className={styles["btn-send-notification"]}
          onClick={onSendWarningClick}
          disabled={sendingWarning || !warningMessage.trim()}
        >
          <FaPaperPlane />
          {sendingWarning ? "Sending..." : "Send Warning"}
        </button>
        {activeWarningCount >= WARNING_THRESHOLD - 1 && !isSuspended && (
          <p className={styles["threshold-note"]}>
            {activeWarningCount + 1 >= WARNING_THRESHOLD
              ? `The next warning will automatically suspend this user for ${SUSPENSION_DAYS} days.`
              : `This user has ${activeWarningCount} active warning${activeWarningCount === 1 ? "" : "s"}.`}
          </p>
        )}
      </div>

      <hr className={styles["admin-divider"]} />

      {/* View History */}
      <button className={styles["btn-view-history"]} onClick={() => setShowHistory((prev) => !prev)}>
        {showHistory ? <FaChevronUp /> : <FaChevronDown />}
        View History ({warningsLoading ? "…" : warnings.length})
      </button>

      {showHistory && (
        <div className={styles["warning-history-list"]}>
          {warningsLoading ? (
            <p className={styles["warning-history-empty"]}>Loading...</p>
          ) : warnings.length === 0 ? (
            <p className={styles["warning-history-empty"]}>No warnings issued yet.</p>
          ) : (
            warnings.map((w) => (
              <div key={w.id} className={styles["warning-history-item"]}>
                <div className={styles["warning-history-top"]}>
                  <span className={`${styles["warning-status-tag"]} ${styles[`warning-status-${w.status}`] || ""}`}>
                    {w.status}
                  </span>
                  <span className={styles["warning-history-date"]}>{formatDateTime(w.created_at)}</span>
                </div>
                <p className={styles["warning-history-message"]}>{w.warning_message}</p>
              </div>
            ))
          )}
        </div>
      )}

      <hr className={styles["admin-divider"]} />

      {/* Account Suspension */}
      <div className={styles["admin-block"]}>
        <span className={styles["admin-block-label"]}>Account Suspension</span>
        <p className={styles["admin-block-desc"]}>
          {isSuspended && currentSuspension
            ? `Suspended until ${formatDateTime(currentSuspension.suspended_until)}.`
            : `Temporarily disable this user's access for ${SUSPENSION_DAYS} days. This also happens automatically once the user reaches ${WARNING_THRESHOLD} active warnings.`}
        </p>
        {isSuspended ? (
          <button className={styles["btn-lift-suspend"]} onClick={onLiftSuspensionClick} disabled={liftingSuspension}>
            <FaUserCheck />
            {liftingSuspension ? "Lifting..." : "Lift Suspension"}
          </button>
        ) : (
          <button className={styles["btn-suspend"]} onClick={onSuspendClick} disabled={suspending || suspensionLoading}>
            <FaUserSlash />
            {suspending ? "Suspending..." : `Suspend for ${SUSPENSION_DAYS} Days`}
          </button>
        )}
      </div>
    </section>
  );
};