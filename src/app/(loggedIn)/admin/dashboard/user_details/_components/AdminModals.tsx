"use client";

import { FaTimes } from "react-icons/fa";
import { UserProfile, SUSPENSION_DAYS, WARNING_THRESHOLD, SuspensionRow } from "../_types";
import styles from "../page.module.css";
import { WarningRow } from "../_types";

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

interface Props {
  user: UserProfile;
  warningMessage: string;
  activeWarningCount: number;
  isSuspended: boolean;
  sendingWarning: boolean;
  showSendWarningConfirm: boolean;
  setShowSendWarningConfirm: (val: boolean) => void;
  confirmSendWarning: () => void;

  showSuspendConfirm: boolean;
  setShowSuspendConfirm: (val: boolean) => void;
  suspending: boolean;
  confirmSuspend: () => void;

  showLiftConfirm: boolean;
  setShowLiftConfirm: (val: boolean) => void;
  liftingSuspension: boolean;
  confirmLiftSuspension: () => void;

  autoSuspendNotice: string | null;
  setAutoSuspendNotice: (val: string | null) => void;

  warnings: WarningRow[];
  warningsLoading: boolean;
  showHistoryModal: boolean;
  setShowHistoryModal: (val: boolean) => void;

  suspensionHistory: SuspensionRow[];
  suspensionHistoryLoading: boolean;
  showSuspensionHistoryModal: boolean;
  setShowSuspensionHistoryModal: (val: boolean) => void;
}

export const AdminModals = ({
  user, 
  warningMessage, 
  activeWarningCount, 
  isSuspended, 
  sendingWarning, 
  showSendWarningConfirm, 
  setShowSendWarningConfirm, 
  confirmSendWarning,
  showSuspendConfirm, 
  setShowSuspendConfirm, 
  suspending, 
  confirmSuspend,
  showLiftConfirm, 
  setShowLiftConfirm, 
  liftingSuspension, 
  confirmLiftSuspension,
  autoSuspendNotice, 
  setAutoSuspendNotice,
  warnings,
  warningsLoading,
  showHistoryModal,
  setShowHistoryModal,
  suspensionHistory,
  suspensionHistoryLoading,
  showSuspensionHistoryModal,
  setShowSuspensionHistoryModal
}: Props) => {
  return (
    <>
      {/* SEND WARNING CONFIRMATION MODAL */}
      {showSendWarningConfirm && (
        <div className={styles["modal-overlay"]} onClick={() => !sendingWarning && setShowSendWarningConfirm(false)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Confirm Warning</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setShowSendWarningConfirm(false)} disabled={sendingWarning}>
                <FaTimes />
              </button>
            </div>
            <p className={styles["confirm-modal-message"]}>
              Send this warning to <strong>{user.first_name} {user.last_name}</strong>?
              {activeWarningCount + 1 >= WARNING_THRESHOLD && !isSuspended && (
                <>
                  {" "}This will be their {activeWarningCount + 1}
                  {activeWarningCount + 1 === 1 ? "st" : activeWarningCount + 1 === 2 ? "nd" : activeWarningCount + 1 === 3 ? "rd" : "th"}{" "}
                  active warning, which will automatically suspend the user for {SUSPENSION_DAYS} days.
                </>
              )}
            </p>
            <p className={styles["confirm-modal-message"]}>
              <em>&ldquo;{warningMessage.trim()}&rdquo;</em>
            </p>
            <div className={styles["confirm-modal-actions"]}>
              <button className={styles["btn-confirm-cancel"]} onClick={() => setShowSendWarningConfirm(false)} disabled={sendingWarning}>
                Cancel
              </button>
              <button className={styles["btn-confirm-proceed"]} onClick={confirmSendWarning} disabled={sendingWarning}>
                {sendingWarning ? "Sending..." : "Send Warning"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND CONFIRMATION MODAL */}
      {showSuspendConfirm && (
        <div className={styles["modal-overlay"]} onClick={() => !suspending && setShowSuspendConfirm(false)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Confirm Suspension</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setShowSuspendConfirm(false)} disabled={suspending}>
                <FaTimes />
              </button>
            </div>
            <p className={styles["confirm-modal-message"]}>
              Suspend <strong>{user.first_name} {user.last_name}</strong> for {SUSPENSION_DAYS} days? They will be unable to access their account until the suspension lifts.
            </p>
            <div className={styles["confirm-modal-actions"]}>
              <button className={styles["btn-confirm-cancel"]} onClick={() => setShowSuspendConfirm(false)} disabled={suspending}>
                Cancel
              </button>
              <button className={styles["btn-confirm-danger"]} onClick={confirmSuspend} disabled={suspending}>
                {suspending ? "Suspending..." : `Suspend for ${SUSPENSION_DAYS} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIFT SUSPENSION CONFIRMATION MODAL */}
      {showLiftConfirm && (
        <div className={styles["modal-overlay"]} onClick={() => !liftingSuspension && setShowLiftConfirm(false)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Lift Suspension</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setShowLiftConfirm(false)} disabled={liftingSuspension}>
                <FaTimes />
              </button>
            </div>
            <p className={styles["confirm-modal-message"]}>
              Lift <strong>{user.first_name} {user.last_name}</strong>&apos;s suspension early? Their account will regain access immediately.
            </p>
            <div className={styles["confirm-modal-actions"]}>
              <button className={styles["btn-confirm-cancel"]} onClick={() => setShowLiftConfirm(false)} disabled={liftingSuspension}>
                Cancel
              </button>
              <button className={styles["btn-confirm-proceed"]} onClick={confirmLiftSuspension} disabled={liftingSuspension}>
                {liftingSuspension ? "Lifting..." : "Lift Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNING HISTORY MODAL */}
      {showHistoryModal && (
        <div className={styles["modal-overlay"]} onClick={() => setShowHistoryModal(false)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Warning History</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setShowHistoryModal(false)}>
                <FaTimes />
              </button>
            </div>
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
                      <span className={styles["warning-history-date"]}>
                        {formatDateTime(w.created_at)}
                        {w.issued_by_admin && ` · by ${w.issued_by_admin.first_name} ${w.issued_by_admin.last_name}`}
                      </span>
                    </div>
                    <p className={styles["warning-history-message"]}>{w.warning_message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUSPENSION HISTORY MODAL */}
      {showSuspensionHistoryModal && (
        <div className={styles["modal-overlay"]} onClick={() => setShowSuspensionHistoryModal(false)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Suspension History</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setShowSuspensionHistoryModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles["warning-history-list"]}>
              {suspensionHistoryLoading ? (
                <p className={styles["warning-history-empty"]}>Loading...</p>
              ) : suspensionHistory.length === 0 ? (
                <p className={styles["warning-history-empty"]}>No suspensions on record.</p>
              ) : (
                suspensionHistory.map((s) => (
                  <div key={s.id} className={styles["warning-history-item"]}>
                    <div className={styles["warning-history-top"]}>
                      <span className={`${styles["warning-status-tag"]} ${styles[`warning-status-${s.status}`] || ""}`}>
                        {s.status}
                      </span>
                      <span className={styles["warning-history-date"]}>
                        {formatDateTime(s.suspended_at)}
                        {s.suspended_by_admin && ` · by ${s.suspended_by_admin.first_name} ${s.suspended_by_admin.last_name}`}
                      </span>
                    </div>
                    <p className={styles["warning-history-message"]}>{s.reason}</p>
                    <p className={styles["warning-history-date"]}>
                      Until {formatDateTime(s.suspended_until)}
                      {s.status === "lifted" && s.lifted_at && (
                        <>
                          {" "}— lifted {formatDateTime(s.lifted_at)}
                          {s.lifted_by_admin && ` by ${s.lifted_by_admin.first_name} ${s.lifted_by_admin.last_name}`}
                        </>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUTO-SUSPEND RESULT MODAL */}
      {autoSuspendNotice && (
        <div className={styles["modal-overlay"]} onClick={() => setAutoSuspendNotice(null)}>
          <div className={`${styles["modal-box"]} ${styles["confirm-modal-box"]}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>User Auto-Suspended</h3>
              <button className={styles["btn-close-modal"]} onClick={() => setAutoSuspendNotice(null)}>
                <FaTimes />
              </button>
            </div>
            <p className={styles["confirm-modal-message"]}>
              Warning issued for <strong>{user.first_name} {user.last_name}</strong>. {autoSuspendNotice}
            </p>
            <div className={styles["confirm-modal-actions"]}>
              <button className={styles["btn-confirm-proceed"]} onClick={() => setAutoSuspendNotice(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};