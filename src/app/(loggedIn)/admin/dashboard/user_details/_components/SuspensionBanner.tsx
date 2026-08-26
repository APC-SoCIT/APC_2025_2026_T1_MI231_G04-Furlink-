"use client";

import { FaUserSlash } from "react-icons/fa";
import { SuspensionRow } from "../_types";
import styles from "../page.module.css";

interface Props {
  currentSuspension: SuspensionRow | null;
  autoSuspended: boolean;
  isSuspended: boolean;
}

export const SuspensionBanner = ({ currentSuspension, autoSuspended, isSuspended }: Props) => {
  if (!isSuspended || !currentSuspension) return null;

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <div className={`${styles["suspension-banner"]} ${autoSuspended ? styles["suspension-banner-auto"] : ""}`}>
      <FaUserSlash />
      <span>
        {autoSuspended && (
          <strong className={styles["auto-tag"]}>Auto-suspended — </strong>
        )}
        This user is suspended until <strong>{formatDateTime(currentSuspension.suspended_until)}</strong>.
        {" "}Reason: {currentSuspension.reason}
      </span>
    </div>
  );
};