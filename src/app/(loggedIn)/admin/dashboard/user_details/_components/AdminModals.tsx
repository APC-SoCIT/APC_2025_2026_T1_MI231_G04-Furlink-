"use client";

import { FaTimes } from "react-icons/fa";
import { UserProfile, SUSPENSION_DAYS, WARNING_THRESHOLD } from "../_types";
import styles from "../page.module.css";

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
}

export const AdminModals = ({
  user, warningMessage, activeWarningCount, isSuspended, sendingWarning, showSendWarningConfirm, setShowSendWarningConfirm, confirmSendWarning,
  showSuspendConfirm, setShowSuspendConfirm, suspending, confirmSuspend,
  showLiftConfirm, setShowLiftConfirm, liftingSuspension, confirmLiftSuspension,
  autoSuspendNotice, setAutoSuspendNotice
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