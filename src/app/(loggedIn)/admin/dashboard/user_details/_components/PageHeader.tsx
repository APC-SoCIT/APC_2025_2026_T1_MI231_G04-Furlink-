"use client";

import { UserProfile } from "../_types";
import styles from "../page.module.css";

interface Props {
  user: UserProfile;
  isSuspended: boolean;
}

export const PageHeader = ({ user, isSuspended }: Props) => {
  return (
    <div className={styles["page-header"]}>
      <h1 className={styles["page-title"]}>
        {user.first_name} {user.last_name}
      </h1>
      <div className={styles["header-pills"]}>
        {isSuspended && (
          <span className={styles["suspended-pill"]}>Suspended</span>
        )}
        {user.role && (
          <span className={styles["role-pill"]}>
            {user.role.replace(/_/g, " ")}
          </span>
        )}
      </div>
    </div>
  );
};