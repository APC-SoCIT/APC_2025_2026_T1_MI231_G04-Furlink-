"use client";

import { FaCheck, FaTimes } from "react-icons/fa";
import { ProviderDetails } from "../_types";
import styles from "../page.module.css";

interface Props {
  provider: ProviderDetails;
  isUpdating: boolean;
  onApproveClick: () => void;
  onRejectClick: () => void;
}

export const PageHeader = ({ provider, isUpdating, onApproveClick, onRejectClick }: Props) => {
  return (
    <div className={styles["list-header"]} style={{ alignItems: "flex-start" }}>
      <div>
        <h2 className={styles["list-title"]}>{provider.business_name} Details</h2>
        <span
          className={`${styles["status-pill"]} ${styles[provider.registration_status]}`}
          style={{ display: "inline-block", marginTop: "10px" }}
        >
          {provider.registration_status}
        </span>

        {provider.registration_status !== "pending" && provider.responder && (
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "8px" }}>
            {provider.registration_status === "approved" ? "Approved" : "Rejected"} by{" "}
            <strong>{provider.responder.first_name} {provider.responder.last_name}</strong>
            {" "}on{" "}
            {new Date(
              provider.registration_status === "approved"
                ? provider.registration_approved_at ?? provider.updated_at
                : provider.updated_at
            ).toLocaleString()}
          </p>
        )}
      </div>

      {provider.registration_status === "pending" && (
        <div className={styles["action-buttons-container"]}>
          <button
            className={styles["btn-approve"]}
            onClick={onApproveClick}
            disabled={isUpdating}
          >
            <FaCheck /> Approve Listing
          </button>
          <button
            className={styles["btn-reject"]}
            onClick={onRejectClick}
            disabled={isUpdating}
          >
            <FaTimes /> Reject
          </button>
        </div>
      )}
    </div>
  );
};