"use client";

import { FaUser } from "react-icons/fa";
import { UserProfile, ROLES_WITH_EMAIL } from "../_types";
import styles from "../page.module.css";

interface Props {
  user: UserProfile;
  businessEmail: string | null;
}

export const PersonalInfoCard = ({ user, businessEmail }: Props) => {
  const showEmail = !!user?.role && ROLES_WITH_EMAIL.includes(user.role);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  return (
    <section className={styles["info-card"]}>
      <div className={styles["card-header"]}>
        <FaUser />
        <h2>Personal Information</h2>
      </div>

      <dl className={styles["info-list"]}>
        <div className={styles["info-row"]}>
          <dt>Role:</dt>
          <dd>{user.role ? user.role.replace(/_/g, " ") : "-"}</dd>
        </div>

        {showEmail && (
          <div className={styles["info-row"]}>
            <dt>Email:</dt>
            <dd>{businessEmail || "-"}</dd>
          </div>
        )}

        <div className={styles["info-row"]}>
          <dt>Mobile:</dt>
          <dd>{user.mobile_number || "-"}</dd>
        </div>

        <div className={styles["info-row"]}>
          <dt>Date of Birth:</dt>
          <dd>{formatDate(user.date_of_birth)}</dd>
        </div>

        <div className={styles["info-row"]}>
          <dt>Member Since:</dt>
          <dd>{formatDate(user.created_at)}</dd>
        </div>
      </dl>
    </section>
  );
};