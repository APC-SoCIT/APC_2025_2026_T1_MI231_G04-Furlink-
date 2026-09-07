"use client";

import { useState } from "react";
import { ProviderDetails, REJECTION_REASONS } from "../_types";
import styles from "../page.module.css";

interface Props {
  provider: ProviderDetails;
  showApproveModal: boolean;
  setShowApproveModal: (val: boolean) => void;
  showRejectModal: boolean;
  setShowRejectModal: (val: boolean) => void;
  isUpdating: boolean;
  onConfirmApprove: () => Promise<boolean>;
  onConfirmReject: (reasons: string) => Promise<boolean>;
}

export const ActionModals = ({
  provider,
  showApproveModal,
  setShowApproveModal,
  showRejectModal,
  setShowRejectModal,
  isUpdating,
  onConfirmApprove,
  onConfirmReject,
}: Props) => {
  const [selectedRejectReasons, setSelectedRejectReasons] = useState<string[]>([]);
  const [otherReasonText, setOtherReasonText] = useState("");

  const toggleRejectReason = (reason: string) => {
    setSelectedRejectReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleApprove = async () => {
    const success = await onConfirmApprove();
    if (success) setShowApproveModal(false);
  };

  const handleReject = async () => {
    if (selectedRejectReasons.length === 0) {
      alert("Please select a reason for rejection.");
      return;
    }
    if (selectedRejectReasons.includes("Others") && !otherReasonText.trim()) {
      alert("Please specify the other reason.");
      return;
    }

    const finalReasons = selectedRejectReasons
      .filter((r) => r !== "Others")
      .concat(selectedRejectReasons.includes("Others") ? [otherReasonText.trim()] : [])
      .join(", ");

    const success = await onConfirmReject(finalReasons);
    if (success) {
      setShowRejectModal(false);
      setSelectedRejectReasons([]);
      setOtherReasonText("");
    }
  };

  const isRejectDisabled =
    isUpdating ||
    selectedRejectReasons.length === 0 ||
    (selectedRejectReasons.includes("Others") && !otherReasonText.trim());

  return (
    <>
      {showApproveModal && (
        <div className={styles["modal-overlay"]} onClick={() => !isUpdating && setShowApproveModal(false)}>
          <div className={styles["modal-box"]} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles["modal-title"]}>Approve this provider?</h3>
            <p className={styles["modal-text"]}>
              This will make <strong>{provider.business_name}</strong> visible and active on the platform.
            </p>
            <div className={styles["modal-actions"]}>
              <button className={styles["btn-cancel"]} onClick={() => setShowApproveModal(false)} disabled={isUpdating}>
                Cancel
              </button>
              <button className={styles["btn-approve"]} onClick={handleApprove} disabled={isUpdating}>
                {isUpdating ? "Processing..." : "Yes, Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className={styles["modal-overlay"]} onClick={() => !isUpdating && setShowRejectModal(false)}>
          <div className={styles["modal-box"]} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles["modal-title"]}>Reject this provider?</h3>
            <p className={styles["modal-text"]}>
              Select the reason(s) for rejecting <strong>{provider.business_name}</strong>.
            </p>
            <div className={styles["reject-options-list"]}>
              {REJECTION_REASONS.map((reason) => (
                <label key={reason} className={styles["reject-option"]}>
                  <input
                    type="checkbox"
                    checked={selectedRejectReasons.includes(reason)}
                    onChange={() => toggleRejectReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {selectedRejectReasons.includes("Others") && (
              <textarea
                className={styles["reject-other-input"]}
                placeholder="Please specify the reason..."
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
                rows={3}
                style={{
                  width: "100%", marginTop: "10px", padding: "10px", borderRadius: "6px",
                  border: "1px solid #d1d5db", fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical",
                }}
              />
            )}
            <div className={styles["modal-actions"]}>
              <button
                className={styles["btn-cancel"]}
                onClick={() => { setShowRejectModal(false); setSelectedRejectReasons([]); setOtherReasonText(""); }}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button className={styles["btn-reject"]} onClick={handleReject} disabled={isRejectDisabled}>
                {isUpdating ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};