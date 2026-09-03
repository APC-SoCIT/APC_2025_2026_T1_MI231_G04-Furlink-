"use client";

import { FaExclamationTriangle, FaPaperPlane, FaUserSlash, FaUserCheck, FaHistory } from "react-icons/fa";
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
  onViewHistoryClick: () => void;
}

export const AdminActionsCard = ({
  warnings, warningsLoading, activeWarningCount, warningMessage, setWarningMessage, sendingWarning,
  onSendWarningClick, isSuspended, currentSuspension, suspensionLoading, suspending, liftingSuspension,
  onSuspendClick, onLiftSuspensionClick, onViewHistoryClick, 
}: Props) => {

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
      <button className={styles["btn-view-history"]} onClick={onViewHistoryClick}>
        <FaHistory /> 
        View History ({warningsLoading ? "…" : warnings.length})
      </button>

      <hr className={styles["admin-divider"]} />

      {/* Account Suspension */}
      <div className={styles["admin-block"]}>
        <span className={styles["admin-block-label"]}>Account Suspension</span>
        <p className={styles["admin-block-desc"]}>
          {isSuspended && currentSuspension
            ? `Suspended until ${new Date(currentSuspension.suspended_until).toLocaleDateString()}.`
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